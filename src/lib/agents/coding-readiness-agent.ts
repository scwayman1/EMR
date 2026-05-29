import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import {
  applyGrounding,
  buildCodingPrompt,
  overallCodingConfidence,
  parseCodingResponse,
  type CandidateCode,
} from "@/lib/clinical/coding-confidence";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Keyword fallback used when the model returns unparseable output (e.g. the StubModelClient). */
function keywordFallbackCodes(blocks: unknown): CandidateCode[] {
  const narrative = JSON.stringify(blocks).toLowerCase();
  const codes: CandidateCode[] = [];
  if (/pain/.test(narrative)) {
    codes.push({ code: "G89.29", label: "Other chronic pain", confidence: 0.55 });
  }
  if (/sleep|insomnia/.test(narrative)) {
    codes.push({ code: "G47.00", label: "Insomnia, unspecified", confidence: 0.5 });
  }
  if (/nausea/.test(narrative)) {
    codes.push({ code: "R11.0", label: "Nausea", confidence: 0.5 });
  }
  if (/anxiety/.test(narrative)) {
    codes.push({ code: "F41.1", label: "Generalized anxiety disorder", confidence: 0.5 });
  }
  return codes;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const input = z.object({ noteId: z.string() });

const output = z.object({
  icd10: z.array(
    z.object({ code: z.string(), label: z.string(), confidence: z.number() })
  ),
  emLevel: z.string().nullable(),
  rationale: z.string(),
});

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * Coding Readiness Agent v2
 * -------------------------
 * Attaches ICD-10 + E&M coding suggestions to a finalized note using an LLM
 * prompt. Falls back to keyword matching when JSON parsing fails (e.g. when
 * using the StubModelClient).
 *
 * V2 is still metadata-only -- no clearinghouse integration, no claim
 * submission.
 */
export const codingReadinessAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "codingReadiness",
  version: "2.0.0",
  description:
    "Attaches ICD-10 / E&M metadata suggestions to finalized notes.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.note", "write.coding"],
  requiresApproval: false,

  async run({ noteId }, ctx) {
    // ------------------------------------------------------------------
    // 1. Load the note, encounter, and patient
    // ------------------------------------------------------------------
    ctx.assertCan("read.note");

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { encounter: { include: { patient: true } } },
    });
    if (!note) throw new Error(`Note not found: ${noteId}`);

    const patient = note.encounter.patient;

    // ------------------------------------------------------------------
    // 2. Format note blocks into readable text
    // ------------------------------------------------------------------
    const noteBlocks = Array.isArray(note.blocks) ? note.blocks : [];
    const noteText = noteBlocks
      .map((b: any) => `${b.heading ?? b.type}: ${b.body ?? ""}`)
      .join("\n\n");

    const cannabisHistory = patient.cannabisHistory
      ? typeof patient.cannabisHistory === "string"
        ? patient.cannabisHistory
        : JSON.stringify(patient.cannabisHistory, null, 2)
      : "No cannabis history on file.";

    // ------------------------------------------------------------------
    // 3. Build the coding prompt and call the model
    // ------------------------------------------------------------------
    const patientContext = `${patient.presentingConcerns ?? "Not documented"}\nCannabis history: ${cannabisHistory}`;
    const prompt = buildCodingPrompt(noteText, patientContext);

    ctx.log("info", "Sending coding prompt to model", {
      promptLength: prompt.length,
    });

    const modelResponse = await ctx.model.complete(prompt, {
      maxTokens: 1024,
      temperature: 0.2,
    });

    // ------------------------------------------------------------------
    // 4. Parse, then GROUND each code against the documented note. A
    //    diagnostic code only survives if its clinical concept actually
    //    appears in the note — this kills the "code for a condition the
    //    note never mentions" failure mode, and reconciles each surviving
    //    code's confidence by how well it's supported.
    // ------------------------------------------------------------------
    const parsedCoding = parseCodingResponse(modelResponse);
    const candidates: CandidateCode[] = parsedCoding
      ? parsedCoding.icd10
      : keywordFallbackCodes(note.blocks);
    const emLevel = parsedCoding?.emLevel ?? null;
    const emRationale = parsedCoding?.emRationale ?? "";

    const { kept, dropped } = applyGrounding(candidates, noteText);
    const overall = overallCodingConfidence(kept);

    const codes: z.infer<typeof output>["icd10"] = kept.map((c) => ({
      code: c.code,
      label: c.label,
      confidence: c.confidence,
    }));

    const rationale = [
      emRationale,
      `Overall confidence: ${overall.toFixed(2)}.`,
      dropped.length > 0
        ? `Dropped ${dropped.length} code(s) unsupported by the documentation: ${dropped
            .map((d) => `${d.code} (${d.label})`)
            .join(", ")}.`
        : "",
      kept.length === 0 ? "No documented findings support a code; manual review recommended." : "",
      "Clinician review required before any submission.",
    ]
      .filter(Boolean)
      .join(" ");

    ctx.log("info", "Grounded coding suggestions", {
      candidateCount: candidates.length,
      keptCount: kept.length,
      droppedCount: dropped.length,
      emLevel,
      structured: Boolean(parsedCoding),
    });

    // ------------------------------------------------------------------
    // 5. Persist the coding suggestion (grounded codes only)
    // ------------------------------------------------------------------
    ctx.assertCan("write.coding");

    const icd10Payload = kept.map((c) => ({
      code: c.code,
      label: c.label,
      confidence: c.confidence,
      rationale: c.rationale ?? undefined,
      grounded: c.grounded,
      matchedTerms: c.matchedTerms,
    }));

    await prisma.codingSuggestion.upsert({
      where: { noteId },
      update: {
        icd10: icd10Payload,
        emLevel,
        rationale,
        generatedAt: new Date(),
      },
      create: {
        noteId,
        icd10: icd10Payload,
        emLevel,
        rationale,
      },
    });

    await writeAgentAudit(
      "codingReadiness",
      "2.0.0",
      note.encounter.organizationId,
      "coding.suggested",
      { type: "Note", id: noteId },
      { codeCount: codes.length, emLevel }
    );

    ctx.log("info", "Coding suggestions persisted", {
      noteId,
      codeCount: codes.length,
      emLevel,
    });

    return { icd10: codes, emLevel, rationale };
  },
};

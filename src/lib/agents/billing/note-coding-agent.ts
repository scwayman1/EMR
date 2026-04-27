import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Note Coding Agent (EMR-045 — multi-agent billing pipeline, agent 1 of 2)
// ---------------------------------------------------------------------------
// Reads a finalized clinical note, returns a structured coding recommendation
// (CPT, modifiers, ICD-10, E/M level, rationale, confidence). The output is
// handed to the Note Compliance Auditor (note-compliance-audit-agent.ts) by
// the note-billing-pipeline workflow.
//
// This is purposely a *thin* coder for the pipeline — it does not write
// charges or claims. It produces a coding packet on the note that the
// downstream pipeline can validate, persist as a CodingSuggestion, or hand
// off to claim construction once the human approves.
// ---------------------------------------------------------------------------

function tryParseJSON(text: string): any | null {
  const jsonMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

const input = z.object({
  noteId: z.string(),
  organizationId: z.string(),
});

const codeEntry = z.object({
  code: z.string(),
  label: z.string(),
  rationale: z.string().optional(),
  confidence: z.number(),
});

const output = z.object({
  noteId: z.string(),
  cpt: codeEntry,
  modifiers: z.array(z.string()),
  icd10: z.array(codeEntry),
  emLevel: z.string().nullable(),
  overallConfidence: z.number(),
  usedLLM: z.boolean(),
  rationale: z.string(),
});

export type NoteCodingResult = z.infer<typeof output>;

export const noteCodingAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "noteCoding",
  version: "1.0.0",
  description:
    "First agent in the note → claim pipeline. Reads a finalized clinical " +
    "note and returns a structured coding recommendation (CPT + modifiers + " +
    "ICD-10) for the compliance auditor to validate.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.note", "read.encounter", "read.patient", "write.coding"],
  requiresApproval: false,

  async run({ noteId, organizationId }, ctx) {
    const trace = startReasoning("noteCoding", "1.0.0", ctx.jobId);
    trace.step("begin note coding", { noteId });

    ctx.assertCan("read.note");

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        encounter: {
          include: {
            patient: { select: { presentingConcerns: true, dateOfBirth: true } },
            provider: true,
          },
        },
      },
    });
    if (!note) throw new Error(`Note ${noteId} not found`);

    const blocks = Array.isArray(note.blocks) ? note.blocks : [];
    const noteText = blocks
      .map((b: any) => `### ${b.heading ?? b.type}\n${b.body ?? ""}`)
      .join("\n\n");

    trace.step("loaded note", {
      blockCount: blocks.length,
      finalizedAt: note.finalizedAt?.toISOString(),
    });

    const prompt = `You are a medical coding assistant for an ambulatory cannabis-care practice. Code this clinical note for a clean claim. Return ONLY valid JSON.

CLINICAL NOTE:
${noteText || "(no structured blocks)"}

PATIENT CONTEXT: ${note.encounter.patient.presentingConcerns ?? "Not documented"}

Return JSON:
{
  "cpt": { "code": "99214", "label": "Office visit, established, moderate MDM", "rationale": "Documentation supports moderate MDM", "confidence": 0.85 },
  "modifiers": ["25"],
  "icd10": [
    { "code": "F12.20", "label": "Cannabis dependence", "rationale": "...", "confidence": 0.8 }
  ],
  "emLevel": "99214",
  "overallConfidence": 0.82
}

Rules:
- ONLY assign codes the documentation explicitly supports.
- For cannabis-only counseling visits, use Z71.89 + appropriate E/M.
- Do NOT use 99406/99407 (those are tobacco-cessation specific).
- Do NOT upgrade F12.10 → F12.20 unless the note documents 2+ DSM-5 criteria AND functional impact.
- Pick the highest specificity ICD-10 the note supports.
- If documentation is sparse, lower the confidence — do not invent findings.`;

    let usedLLM = false;
    let cpt = { code: "99213", label: "Office visit, established", confidence: 0.5, rationale: "" };
    let modifiers: string[] = [];
    let icd10: Array<{ code: string; label: string; confidence: number; rationale?: string }> = [];
    let emLevel: string | null = null;
    let overallConfidence = 0.5;

    try {
      const raw = await ctx.model.complete(prompt, {
        maxTokens: 768,
        temperature: 0.15,
      });
      usedLLM = raw.length > 20 && !raw.startsWith("[stub");
      trace.step("llm returned", { rawLen: raw.length, usedLLM });

      if (usedLLM) {
        const parsed = tryParseJSON(raw);
        if (parsed?.cpt?.code) {
          cpt = {
            code: String(parsed.cpt.code),
            label: String(parsed.cpt.label ?? ""),
            confidence: Number(parsed.cpt.confidence ?? 0.5),
            rationale: String(parsed.cpt.rationale ?? ""),
          };
        }
        if (Array.isArray(parsed?.modifiers)) {
          modifiers = parsed.modifiers.map((m: unknown) => String(m));
        }
        if (Array.isArray(parsed?.icd10)) {
          icd10 = parsed.icd10
            .filter((c: any) => c?.code && c?.label)
            .map((c: any) => ({
              code: String(c.code),
              label: String(c.label),
              confidence: Number(c.confidence ?? 0.5),
              rationale: c.rationale ? String(c.rationale) : undefined,
            }));
        }
        emLevel = parsed?.emLevel ? String(parsed.emLevel) : cpt.code;
        overallConfidence = Number(parsed?.overallConfidence ?? cpt.confidence);
      }
    } catch (err) {
      ctx.log("warn", "Note coding LLM failed — using deterministic floor", {
        error: err instanceof Error ? err.message : String(err),
      });
      trace.step("llm failed");
    }

    if (icd10.length === 0) {
      // Deterministic floor — keyword sniff so the pipeline can still run.
      const lower = noteText.toLowerCase();
      if (/anxiety/.test(lower)) icd10.push({ code: "F41.1", label: "Generalized anxiety disorder", confidence: 0.45 });
      if (/insomnia|sleep/.test(lower)) icd10.push({ code: "G47.00", label: "Insomnia, unspecified", confidence: 0.45 });
      if (/pain/.test(lower)) icd10.push({ code: "G89.29", label: "Other chronic pain", confidence: 0.45 });
      if (/cannabis|marijuana/.test(lower)) icd10.push({ code: "Z71.89", label: "Cannabis counseling", confidence: 0.45 });
    }

    ctx.assertCan("write.coding");

    // Persist as a CodingSuggestion alongside the note, mirroring the
    // existing coding-readiness storage shape so the UI is unchanged.
    await prisma.codingSuggestion.upsert({
      where: { noteId },
      update: {
        icd10: icd10 as any,
        emLevel,
        rationale: cpt.rationale || "noteCoding pipeline",
        generatedAt: new Date(),
      },
      create: {
        noteId,
        icd10: icd10 as any,
        emLevel,
        rationale: cpt.rationale || "noteCoding pipeline",
      },
    });

    await writeAgentAudit(
      "noteCoding",
      "1.0.0",
      organizationId,
      "note.coding.recommended",
      { type: "Note", id: noteId },
      { cpt: cpt.code, modifiers, icdCount: icd10.length, overallConfidence },
    );

    // Emit the pipeline hand-off event so the noteComplianceAudit agent
    // picks up where this one ended.
    await ctx.emit({
      name: "note.coding.complete",
      noteId,
      organizationId,
      coding: {
        noteId,
        cpt,
        modifiers,
        icd10,
        emLevel,
        overallConfidence,
        usedLLM,
        rationale: cpt.rationale || "Coded by noteCoding pipeline agent.",
      },
    });

    trace.conclude({
      confidence: overallConfidence,
      summary: `Coded note ${noteId}: ${cpt.code}${modifiers.length ? ` mod ${modifiers.join(",")}` : ""}, ${icd10.length} ICD-10 codes, ${Math.round(overallConfidence * 100)}% confidence.`,
    });
    await trace.persist();

    return {
      noteId,
      cpt,
      modifiers,
      icd10,
      emLevel,
      overallConfidence,
      usedLLM,
      rationale: cpt.rationale || "Coded by noteCoding pipeline agent.",
    };
  },
};

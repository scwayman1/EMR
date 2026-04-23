import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Try to extract and parse JSON from a model response.
 * The model may wrap the JSON in markdown code fences.
 */
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
    const prompt = `You are a medical coding assistant. Review this clinical note and suggest appropriate ICD-10 diagnostic codes and an E&M evaluation/management level.

CLINICAL NOTE:
${noteText}

Patient context: ${patient.presentingConcerns ?? "Not documented"}

Cannabis history:
${cannabisHistory}

Return ONLY valid JSON:
{
  "icd10": [
    { "code": "G89.29", "label": "Other chronic pain", "confidence": 0.85, "rationale": "Patient presents with chronic neuropathic pain post-chemo" }
  ],
  "emLevel": "99214",
  "emRationale": "Moderate complexity visit with established patient, detailed history, moderate decision-making",
  "overallConfidence": 0.75
}

Guidelines:
- Include all relevant diagnostic codes, not just one
- E&M codes: 99211-99215 for established, 99201-99205 for new patients
- Cannabis-related codes may include F12.x series if applicable
- Provide clear rationale for each code`;

    ctx.log("info", "Sending coding prompt to model", {
      promptLength: prompt.length,
    });

    const modelResponse = await ctx.model.complete(prompt, {
      maxTokens: 1024,
      temperature: 0.2,
    });

    // ------------------------------------------------------------------
    // 4. Parse model response (structured JSON or keyword fallback)
    // ------------------------------------------------------------------
    const parsed = tryParseJSON(modelResponse);

    let codes: z.infer<typeof output>["icd10"];
    let emLevel: string | null;
    let rationale: string;

    if (parsed && typeof parsed === "object" && Array.isArray(parsed.icd10)) {
      // Successful structured parse
      codes = parsed.icd10
        .filter(
          (c: any) =>
            typeof c === "object" &&
            typeof c.code === "string" &&
            typeof c.label === "string"
        )
        .map((c: any) => ({
          code: c.code,
          label: c.label,
          confidence:
            typeof c.confidence === "number"
              ? Math.max(0, Math.min(1, c.confidence))
              : 0.5,
        }));

      emLevel =
        typeof parsed.emLevel === "string" ? parsed.emLevel : null;

      const emRationale =
        typeof parsed.emRationale === "string"
          ? parsed.emRationale
          : "";

      const overallConfidence =
        typeof parsed.overallConfidence === "number"
          ? parsed.overallConfidence.toFixed(2)
          : "N/A";

      rationale =
        [
          emRationale,
          `Overall confidence: ${overallConfidence}.`,
          "Clinician review required before any submission.",
        ]
          .filter(Boolean)
          .join(" ");

      ctx.log("info", "Parsed structured coding JSON from model", {
        codeCount: codes.length,
        emLevel,
      });
    } else {
      // Fallback: keyword matching (preserves V1 behavior for StubModelClient)
      const narrative = JSON.stringify(note.blocks).toLowerCase();
      codes = [];

      if (/pain/.test(narrative)) {
        codes.push({
          code: "G89.29",
          label: "Other chronic pain",
          confidence: 0.55,
        });
      }
      if (/sleep|insomnia/.test(narrative)) {
        codes.push({
          code: "G47.00",
          label: "Insomnia, unspecified",
          confidence: 0.5,
        });
      }
      if (/nausea/.test(narrative)) {
        codes.push({
          code: "R11.0",
          label: "Nausea",
          confidence: 0.5,
        });
      }
      if (/anxiety/.test(narrative)) {
        codes.push({
          code: "F41.1",
          label: "Generalized anxiety disorder",
          confidence: 0.5,
        });
      }

      emLevel = null;

      rationale =
        codes.length > 0
          ? "Suggestions are based on narrative keywords. Clinician review required before any submission."
          : "No clear code matches found in narrative. Manual review recommended.";

      ctx.log("info", "Model returned plain text; using keyword fallback", {
        codeCount: codes.length,
      });
    }

    // ------------------------------------------------------------------
    // 5. Persist the coding suggestion
    // ------------------------------------------------------------------
    ctx.assertCan("write.coding");

    // Build the full icd10 payload with rationale per code (for structured path)
    const icd10Payload =
      parsed && Array.isArray(parsed.icd10)
        ? parsed.icd10
            .filter(
              (c: any) =>
                typeof c === "object" && typeof c.code === "string"
            )
            .map((c: any) => ({
              code: c.code,
              label: c.label ?? "",
              confidence:
                typeof c.confidence === "number" ? c.confidence : 0.5,
              rationale: c.rationale ?? undefined,
            }))
        : (codes as any);

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

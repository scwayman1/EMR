import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ noteId: z.string() });
const output = z.object({
  icd10: z.array(z.object({ code: z.string(), label: z.string(), confidence: z.number() })),
  emLevel: z.string().nullable(),
  rationale: z.string(),
});

/**
 * Coding Readiness Agent
 * ----------------------
 * Attaches ICD-10 + E&M coding suggestions to a finalized note. V1 is
 * metadata-only — no clearinghouse integration, no claim submission.
 */
export const codingReadinessAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "codingReadiness",
  version: "1.0.0",
  description: "Attaches ICD-10 / E&M metadata suggestions to finalized notes.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.note", "write.coding"],
  requiresApproval: false,

  async run({ noteId }, ctx) {
    ctx.assertCan("read.note");
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { encounter: { include: { patient: true } } },
    });
    if (!note) throw new Error(`Note not found: ${noteId}`);

    // Very simple keyword match. Real implementation swaps this for an LLM
    // call or a coded terminology service.
    const narrative = JSON.stringify(note.blocks).toLowerCase();
    const codes: z.infer<typeof output>["icd10"] = [];
    if (/pain/.test(narrative)) {
      codes.push({ code: "G89.29", label: "Other chronic pain", confidence: 0.55 });
    }
    if (/sleep|insomnia/.test(narrative)) {
      codes.push({ code: "G47.00", label: "Insomnia, unspecified", confidence: 0.5 });
    }
    if (/nausea/.test(narrative)) {
      codes.push({ code: "R11.0", label: "Nausea", confidence: 0.5 });
    }

    const rationale =
      codes.length > 0
        ? "Suggestions are based on narrative keywords. Clinician review required before any submission."
        : "No clear code matches found in narrative. Manual review recommended.";

    ctx.assertCan("write.coding");
    await prisma.codingSuggestion.upsert({
      where: { noteId },
      update: { icd10: codes as any, emLevel: null, rationale, generatedAt: new Date() },
      create: { noteId, icd10: codes as any, rationale },
    });

    await writeAgentAudit(
      "codingReadiness",
      "1.0.0",
      note.encounter.organizationId,
      "coding.suggested",
      { type: "Note", id: noteId },
      { codeCount: codes.length }
    );

    return { icd10: codes, emLevel: null, rationale };
  },
};

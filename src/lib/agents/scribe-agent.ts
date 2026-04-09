import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ encounterId: z.string() });

const blockSchema = z.object({
  type: z.enum(["summary", "findings", "assessment", "plan", "followUp"]),
  heading: z.string(),
  body: z.string(),
});

const output = z.object({
  noteId: z.string(),
  blocks: z.array(blockSchema),
  confidence: z.number().min(0).max(1),
});

/**
 * Scribe Agent
 * ------------
 * Drafts a structured visit note from encounter context. The note is written
 * as `status = draft` — it is never finalized without a clinician signature.
 * Workflow step is always approval-gated.
 */
export const scribeAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "scribe",
  version: "1.0.0",
  description: "Drafts a structured visit note from encounter context.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.encounter", "read.patient", "read.note", "write.note.draft"],
  requiresApproval: true,

  async run({ encounterId }, ctx) {
    ctx.assertCan("read.encounter");

    const encounter = await prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: { include: { chartSummary: true } },
      },
    });
    if (!encounter) throw new Error(`Encounter not found: ${encounterId}`);

    const summaryMd = encounter.patient.chartSummary?.summaryMd ?? "No chart summary yet.";

    // In production, this would assemble a real prompt and call ctx.model.complete.
    // For V1 the stub client produces a deterministic draft.
    const modelDraft = await ctx.model.complete(
      `Draft a concise visit note for this patient. Chart summary:\n\n${summaryMd}`
    );

    const blocks: z.infer<typeof blockSchema>[] = [
      {
        type: "summary",
        heading: "Summary",
        body: `${encounter.patient.firstName} ${encounter.patient.lastName} presented for a ${encounter.modality} visit. ${encounter.reason ?? ""}`.trim(),
      },
      {
        type: "findings",
        heading: "Relevant findings",
        body: summaryMd,
      },
      {
        type: "assessment",
        heading: "Assessment",
        body: modelDraft,
      },
      {
        type: "plan",
        heading: "Plan",
        body: "— _draft, pending clinician input_",
      },
      {
        type: "followUp",
        heading: "Follow-up",
        body: "Schedule outcome check-in at 7 days.",
      },
    ];

    ctx.assertCan("write.note.draft");
    const note = await prisma.note.create({
      data: {
        encounterId,
        status: "draft",
        aiDrafted: true,
        aiConfidence: 0.7,
        blocks: blocks as any,
      },
    });

    await writeAgentAudit(
      "scribe",
      "1.0.0",
      encounter.organizationId,
      "note.drafted",
      { type: "Note", id: note.id },
      { encounterId }
    );

    ctx.log("info", "Note draft created", { noteId: note.id });

    return { noteId: note.id, blocks, confidence: 0.7 };
  },
};

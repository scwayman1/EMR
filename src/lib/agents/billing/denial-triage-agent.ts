import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { assertOrgMatch } from "@/lib/orchestration/guards";
import {
  classifyDenial,
  NEXT_ACTION_LABEL,
  type DenialCategory,
} from "@/lib/billing/denials";

// ---------------------------------------------------------------------------
// Denial Triage Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #7: "Turn denials into structured next actions."
//
// Fires on claim.denied events. Classifies the denial reason against the
// taxonomy, persists the triage to claim.denialTriage, and creates a
// follow-up Task assigned to the billing role with the suggested next
// action and urgency.
// ---------------------------------------------------------------------------

const input = z.object({ claimId: z.string() });

const output = z.union([
  z.object({
    claimId: z.string(),
    category: z.string(),
    suggestedAction: z.string(),
    urgency: z.string(),
    taskId: z.string().nullable(),
  }),
  z.object({
    triaged: z.literal(false),
    reason: z.string(),
  }),
]);

export const denialTriageAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "denialTriage",
  version: "1.0.0",
  description:
    "Classifies a denied claim into a category, suggests the next action, " +
    "and creates a follow-up task for the billing team.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "write.denial.triage", "write.task"],
  // Classifies denials and creates the tasks that drive downstream appeal or
  // write-off decisions. A misclassification routes real revenue to the wrong
  // next action (e.g. writing off an appealable denial), so a human must
  // confirm the category before the task fans out.
  requiresApproval: true,

  async run({ claimId }, ctx) {
    ctx.assertCan("read.claim");
    ctx.log("info", "Triaging denial", { claimId });

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (!claim) {
      ctx.log("info", "Claim not found — skipping", { claimId });
      return { triaged: false as const, reason: "claim_not_found" };
    }

    // Security invariant: every downstream write (Task, FinancialEvent) is
    // scoped to claim.organizationId. Before we trust that value, assert it
    // matches the org the job was invoked under — otherwise a malicious or
    // buggy dispatch could drive writes into a different tenant's queue.
    //
    // ctx.organizationId may be null for unscoped runs; denialTriage only
    // makes sense in an org scope, so refuse null too.
    if (ctx.organizationId == null) {
      ctx.log("warn", "Org scope missing — refusing to triage", {
        claimId,
        claimOrg: claim.organizationId,
      });
      throw new Error(
        `Org scope violation: denialTriage invoked without an organizationId ` +
          `on job context; claim ${claimId} belongs to org ${claim.organizationId}.`,
      );
    }
    assertOrgMatch(claim.organizationId, ctx.organizationId, "claim", claim.id);

    if (claim.status !== "denied" && claim.status !== "appealed") {
      ctx.log("warn", "Claim is not in denied state — skipping triage", {
        status: claim.status,
      });
      return {
        claimId,
        category: "skipped",
        suggestedAction: "none",
        urgency: "low",
        taskId: null,
      };
    }

    const triage = classifyDenial(claim.denialReason);

    ctx.assertCan("write.denial.triage");

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        denialTriage: {
          category: triage.category,
          label: triage.label,
          suggestedAction: triage.suggestedAction,
          urgency: triage.urgency,
          description: triage.description,
        } as any,
        triagedAt: new Date(),
      },
    });

    // Create a billing task with the suggested next action
    ctx.assertCan("write.task");

    const dueDays = triage.urgency === "high" ? 2 : triage.urgency === "medium" ? 5 : 10;
    const task = await prisma.task.create({
      data: {
        patientId: claim.patientId,
        organizationId: claim.organizationId,
        title: `${triage.label}: ${claim.patient.firstName} ${claim.patient.lastName}`,
        description: `${triage.description}\n\nSuggested action: ${NEXT_ACTION_LABEL[triage.suggestedAction]}\n\nClaim: ${claim.claimNumber} — ${claim.payerName ?? "Unknown payer"}\n\nPayer message: "${claim.denialReason ?? "no reason given"}"\n\n[Created by denialTriage agent]`,
        status: "open",
        assigneeRole: "operator",
        dueAt: new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000),
      },
    });

    // Audit
    await prisma.financialEvent.create({
      data: {
        organizationId: claim.organizationId,
        patientId: claim.patientId,
        claimId: claim.id,
        type: "claim_denied",
        amountCents: 0,
        description: `Denial triaged → ${triage.label} (${triage.urgency} urgency)`,
        metadata: {
          category: triage.category,
          suggestedAction: triage.suggestedAction,
          taskId: task.id,
        },
        createdByAgent: "denialTriage:1.0.0",
      },
    });

    ctx.log("info", "Denial triage complete", {
      category: triage.category,
      taskId: task.id,
    });

    return {
      claimId,
      category: triage.category,
      suggestedAction: triage.suggestedAction,
      urgency: triage.urgency,
      taskId: task.id,
    };
  },
};

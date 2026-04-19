import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import {
  classifyDenial,
  NEXT_ACTION_LABEL,
  type DenialCategory,
} from "@/lib/billing/denials";

// ---------------------------------------------------------------------------
// Pure helpers (extracted for testing)
// ---------------------------------------------------------------------------

/** Map a denial urgency to the number of days a follow-up task is given
 * before it's due. Pure so callers can reuse and tests can verify. */
export function dueDaysForUrgency(urgency: "high" | "medium" | "low"): number {
  if (urgency === "high") return 2;
  if (urgency === "medium") return 5;
  return 10;
}

/** Claim statuses that are eligible for denial triage. The agent is a no-op
 * for anything else — tracking it here so the guard is testable. */
export const TRIAGE_ELIGIBLE_STATUSES = ["denied", "appealed"] as const;

export function isTriageEligible(claimStatus: string): boolean {
  return (TRIAGE_ELIGIBLE_STATUSES as readonly string[]).includes(claimStatus);
}

/** Shape returned by classifyDenial + a derived due date, in one call —
 * useful for callers that want the full triage packet. */
export function buildDenialTriagePlan(
  denialReason: string | null | undefined,
  now: Date = new Date(),
): {
  category: DenialCategory;
  label: string;
  suggestedAction: string;
  urgency: "high" | "medium" | "low";
  description: string;
  dueDays: number;
  dueAt: Date;
} {
  const entry = classifyDenial(denialReason);
  const dueDays = dueDaysForUrgency(entry.urgency);
  const dueAt = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);
  return {
    category: entry.category,
    label: entry.label,
    suggestedAction: entry.suggestedAction,
    urgency: entry.urgency,
    description: entry.description,
    dueDays,
    dueAt,
  };
}

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

const output = z.object({
  claimId: z.string(),
  category: z.string(),
  suggestedAction: z.string(),
  urgency: z.string(),
  taskId: z.string().nullable(),
});

export const denialTriageAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "denialTriage",
  version: "1.0.0",
  description:
    "Classifies a denied claim into a category, suggests the next action, " +
    "and creates a follow-up task for the billing team.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "write.denial.triage", "write.task"],
  requiresApproval: false,

  async run({ claimId }, ctx) {
    ctx.assertCan("read.claim");
    ctx.log("info", "Triaging denial", { claimId });

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (!claim) throw new Error(`Claim ${claimId} not found`);

    if (!isTriageEligible(claim.status)) {
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

    const dueDays = dueDaysForUrgency(triage.urgency);
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

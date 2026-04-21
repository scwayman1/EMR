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
// Cannabis-specific denial micro-handlers
// ---------------------------------------------------------------------------
// A seasoned biller knows that "medical necessity" denials on F12.x or Z71.89
// claims aren't actually about documentation — they're about coverage policy.
// Generic appeals fail; payer-specific cannabis coverage citations work. We
// detect the pattern here and annotate the triage with a specialized action.

type CannabisDenialPattern = {
  id: string;
  matches: (opts: {
    icd10: string[];
    cpt: string[];
    denialReason: string;
  }) => boolean;
  microAction: string;
  guidance: string;
  urgencyOverride?: "high" | "medium" | "low";
};

const CANNABIS_DENIAL_PATTERNS: CannabisDenialPattern[] = [
  {
    id: "f12-medical-necessity",
    matches: ({ icd10, denialReason }) =>
      icd10.some((c) => c.startsWith("F12")) &&
      /medical necessity|not.*covered|not.*medically|50\b|CO-50/i.test(
        denialReason,
      ),
    microAction: "cannabis_medical_necessity_appeal",
    guidance:
      "F12.x + medical-necessity denial. Generic appeals fail here. Lead with payer-specific cannabis coverage policy (pull from BillingMemory), attach the psychiatric evaluation, prior-treatment-failure documentation, and DSM-5 severity justification. Reference contracted cannabis-counseling carve-outs if applicable.",
    urgencyOverride: "high",
  },
  {
    id: "z7189-bundling",
    matches: ({ icd10, denialReason }) =>
      icd10.some((c) => c.startsWith("Z71.89") || c.startsWith("Z71.41")) &&
      /bundl|inclusive|included in|97\b|CO-97/i.test(denialReason),
    microAction: "cannabis_counseling_unbundle",
    guidance:
      "Z71.89 cannabis counseling denied as bundled with E/M. Two plays: (1) verify modifier 25 was on the E/M — if missing, correct and resubmit; (2) if modifier 25 was present, this payer does NOT honor it for cannabis counseling — write off or bill the patient per contract; do NOT re-appeal without new documentation.",
    urgencyOverride: "medium",
  },
  {
    id: "cannabis-not-covered-policy",
    matches: ({ icd10, cpt, denialReason }) =>
      (icd10.some((c) => c.startsWith("F12") || c.startsWith("Z71")) ||
        cpt.includes("99406") ||
        cpt.includes("99407")) &&
      /not.*benefit|excluded|exclusion|benefit.*not/i.test(denialReason),
    microAction: "cannabis_not_in_benefit",
    guidance:
      "Cannabis-related services excluded from benefit plan. Do NOT appeal — appeals will fail and burn timely-filing window. Convert to self-pay statement; flag the patient's coverage record with cannabisCovered=false so future encounters route to self-pay counseling at intake.",
    urgencyOverride: "low",
  },
  {
    id: "prior-auth-cannabis",
    matches: ({ icd10, denialReason }) =>
      icd10.some((c) => c.startsWith("F12") || c.startsWith("Z71")) &&
      /prior auth|authoriz|PA\b|197\b|CO-197/i.test(denialReason),
    microAction: "cannabis_pa_retrieval",
    guidance:
      "F12/Z71 + PA required. Retrieve the PA number from the prior-auth agent or, if missing, submit the PA request NOW — timely-filing on appeals is 90d and we lose every day we wait. If PA was issued, refile with the PA # in box 23 of CMS-1500.",
    urgencyOverride: "high",
  },
];

export function detectCannabisDenialPattern(opts: {
  icd10: string[];
  cpt: string[];
  denialReason: string;
}): CannabisDenialPattern | null {
  return (
    CANNABIS_DENIAL_PATTERNS.find((p) => p.matches(opts)) ?? null
  );
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

    // Cannabis-specific pattern detection layered on top of generic triage.
    // Extract ICD-10 and CPT codes from the Json columns so the patterns
    // have something to match against.
    const icd10List: string[] = Array.isArray(claim.icd10Codes)
      ? (claim.icd10Codes as any[])
          .map((c) => (typeof c === "string" ? c : c?.code))
          .filter((c): c is string => typeof c === "string")
      : [];
    const cptList: string[] = Array.isArray(claim.cptCodes)
      ? (claim.cptCodes as any[])
          .map((c) => (typeof c === "string" ? c : c?.code))
          .filter((c): c is string => typeof c === "string")
      : [];
    const cannabisPattern = detectCannabisDenialPattern({
      icd10: icd10List,
      cpt: cptList,
      denialReason: claim.denialReason ?? "",
    });

    const finalUrgency = cannabisPattern?.urgencyOverride ?? triage.urgency;

    ctx.assertCan("write.denial.triage");

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        denialTriage: {
          category: triage.category,
          label: triage.label,
          suggestedAction: triage.suggestedAction,
          urgency: finalUrgency,
          description: triage.description,
          cannabisPatternId: cannabisPattern?.id ?? null,
          cannabisMicroAction: cannabisPattern?.microAction ?? null,
          cannabisGuidance: cannabisPattern?.guidance ?? null,
        } as any,
        triagedAt: new Date(),
      },
    });

    // Create a billing task with the suggested next action
    ctx.assertCan("write.task");

    const dueDays = dueDaysForUrgency(finalUrgency);
    const taskDescription = cannabisPattern
      ? `${triage.description}\n\n🌿 CANNABIS-SPECIFIC GUIDANCE: ${cannabisPattern.guidance}\n\nMicro-action: ${cannabisPattern.microAction}\nBase suggested action: ${NEXT_ACTION_LABEL[triage.suggestedAction]}\n\nClaim: ${claim.claimNumber} — ${claim.payerName ?? "Unknown payer"}\nCodes: ICD-10 [${icd10List.join(", ")}] / CPT [${cptList.join(", ")}]\nPayer message: "${claim.denialReason ?? "no reason given"}"\n\n[Created by denialTriage agent with cannabis pattern ${cannabisPattern.id}]`
      : `${triage.description}\n\nSuggested action: ${NEXT_ACTION_LABEL[triage.suggestedAction]}\n\nClaim: ${claim.claimNumber} — ${claim.payerName ?? "Unknown payer"}\n\nPayer message: "${claim.denialReason ?? "no reason given"}"\n\n[Created by denialTriage agent]`;

    const task = await prisma.task.create({
      data: {
        patientId: claim.patientId,
        organizationId: claim.organizationId,
        title: cannabisPattern
          ? `🌿 ${triage.label} [${cannabisPattern.id}]: ${claim.patient.firstName} ${claim.patient.lastName}`
          : `${triage.label}: ${claim.patient.firstName} ${claim.patient.lastName}`,
        description: taskDescription,
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
      cannabisPattern: cannabisPattern?.id ?? null,
    });

    return {
      claimId,
      category: triage.category,
      suggestedAction: cannabisPattern?.microAction ?? triage.suggestedAction,
      urgency: finalUrgency,
      taskId: task.id,
    };
  },
};

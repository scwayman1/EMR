import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Scheduling Agent
// ---------------------------------------------------------------------------
// Used to be a stub that wrote one hardcoded 2-week follow-up task. Real
// practices need a cadence engine: the "right" follow-up depends on the
// patient's regimen, their last outcome trend, their visit history, and
// the clinical rule set a good scheduling team would keep in their head.
//
// This agent evaluates a ranked set of cadence rules against the patient's
// current state and produces the set of follow-up and reminder tasks that
// a top-tier practice would schedule. Every task is annotated with the
// rule that produced it, so nothing is magic and a physician can override.
//
// The acceptance-criteria-level scheduling features (online self-serve,
// no-show prediction, waitlist, smart slots, provider preferences) live
// in the tickets EMR-206..EMR-215. This agent is the rules engine that
// sits underneath all of them — the "head of scheduling" brain.
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
  /** Optional trigger context — e.g., "encounter.finalized". Affects which rules fire. */
  trigger: z
    .enum([
      "encounter.finalized",
      "regimen.created",
      "regimen.changed",
      "outcome.worsening",
      "manual",
    ])
    .default("manual"),
});

const scheduledAction = z.object({
  /** Rule id — lets the UI show "why is this scheduled?" */
  ruleId: z.string(),
  type: z.string(),
  title: z.string(),
  rationale: z.string(),
  scheduledFor: z.string(),
  /** Urgency tier drives reminder cadence (EMR-211). */
  urgency: z.enum(["routine", "soon", "urgent"]),
});

const output = z.object({
  actions: z.array(scheduledAction),
});

// ---------------------------------------------------------------------------
// Cadence rule set — the "practice protocol" encoded as data.
// This is intentionally explicit (not LLM-inferred) so a practice manager
// can read it, argue with it, and tweak it. LLM assistance can layer on
// top later for edge cases, but the core protocol should be legible.
// ---------------------------------------------------------------------------

type RuleContext = {
  patientId: string;
  organizationId: string;
  trigger: z.infer<typeof input>["trigger"];
  activeRegimenCount: number;
  hasNewRegimenLast14d: boolean;
  worstRecentPhq9: number | null;
  worstRecentGad7: number | null;
  worstRecentPain: number | null;
  daysSinceLastVisit: number | null;
  hasCurrentPrescription: boolean;
  hasCUDFlag: boolean;
};

type RuleOutcome = z.infer<typeof scheduledAction> | null;

interface CadenceRule {
  id: string;
  description: string;
  /** Returns an action if the rule fires; null otherwise. */
  evaluate(ctx: RuleContext): RuleOutcome;
}

const DAY_MS = 86_400_000;

function atDays(n: number): string {
  return new Date(Date.now() + n * DAY_MS).toISOString();
}

// Ranked — the first rule that fires with the shortest cadence wins for
// the primary follow-up, but urgent/safety rules can stack additional tasks.
const CADENCE_RULES: CadenceRule[] = [
  {
    id: "urgent.worsening-mental-health",
    description: "PHQ-9 ≥15 or GAD-7 ≥15 — escalate to 1-week follow-up",
    evaluate(ctx) {
      if (
        (ctx.worstRecentPhq9 !== null && ctx.worstRecentPhq9 >= 15) ||
        (ctx.worstRecentGad7 !== null && ctx.worstRecentGad7 >= 15)
      ) {
        return {
          ruleId: "urgent.worsening-mental-health",
          type: "followup.urgent",
          title: "Urgent mental-health follow-up (1 week)",
          rationale:
            "Moderate-severe depression or anxiety score detected — evidence-based cadence is ≤1 week to prevent decompensation.",
          scheduledFor: atDays(7),
          urgency: "urgent",
        };
      }
      return null;
    },
  },
  {
    id: "urgent.cud-screen-positive",
    description: "CUDIT-R or clinical flag suggests cannabis use disorder",
    evaluate(ctx) {
      if (ctx.hasCUDFlag) {
        return {
          ruleId: "urgent.cud-screen-positive",
          type: "followup.cud",
          title: "CUD screen positive — 2-week clinical check-in",
          rationale:
            "Positive CUDIT-R or chart flag for cannabis use disorder. Cadence brings the patient back before the regimen drifts.",
          scheduledFor: atDays(14),
          urgency: "soon",
        };
      }
      return null;
    },
  },
  {
    id: "titration.new-regimen",
    description: "New cannabis regimen started in the last 14 days",
    evaluate(ctx) {
      if (ctx.hasNewRegimenLast14d) {
        return {
          ruleId: "titration.new-regimen",
          type: "followup.titration",
          title: "2-week titration check-in",
          rationale:
            "Regimen started within the last 14 days — two-week outcome check-in is the standard protocol for dose titration.",
          scheduledFor: atDays(14),
          urgency: "soon",
        };
      }
      return null;
    },
  },
  {
    id: "pain.uncontrolled",
    description: "Reported pain ≥7/10 — tighter cadence",
    evaluate(ctx) {
      if (ctx.worstRecentPain !== null && ctx.worstRecentPain >= 7) {
        return {
          ruleId: "pain.uncontrolled",
          type: "followup.pain",
          title: "Uncontrolled-pain follow-up (2 weeks)",
          rationale:
            "Pain score ≥7/10 in a recent check-in. Shorter cadence pulls the plan forward before the patient disengages.",
          scheduledFor: atDays(14),
          urgency: "soon",
        };
      }
      return null;
    },
  },
  {
    id: "standard.active-regimen",
    description: "Any active regimen — quarterly maintenance",
    evaluate(ctx) {
      if (ctx.activeRegimenCount > 0 && !ctx.hasNewRegimenLast14d) {
        return {
          ruleId: "standard.active-regimen",
          type: "followup.maintenance",
          title: "Quarterly maintenance visit",
          rationale:
            "Stable patient on active regimen — standard 90-day maintenance cadence keeps the chart current and compliant.",
          scheduledFor: atDays(90),
          urgency: "routine",
        };
      }
      return null;
    },
  },
  {
    id: "standard.no-regimen",
    description: "No active regimen — default 2-week follow-up",
    evaluate(ctx) {
      if (ctx.activeRegimenCount === 0) {
        return {
          ruleId: "standard.no-regimen",
          type: "followup.offer",
          title: "Offer 2-week follow-up",
          rationale:
            "No active regimen on file. Default cadence re-engages the patient for care-plan next steps.",
          scheduledFor: atDays(14),
          urgency: "routine",
        };
      }
      return null;
    },
  },
];

// Secondary rules — always layered on top of the primary cadence when they fire.
const SECONDARY_RULES: CadenceRule[] = [
  {
    id: "reminder.refill-audit",
    description: "Active prescription — refill audit 30 days out",
    evaluate(ctx) {
      if (ctx.hasCurrentPrescription) {
        return {
          ruleId: "reminder.refill-audit",
          type: "task.refill_audit",
          title: "Refill / adherence audit",
          rationale:
            "Active prescription on file — audit adherence + remaining supply 30 days out to prevent gap-in-care.",
          scheduledFor: atDays(30),
          urgency: "routine",
        };
      }
      return null;
    },
  },
  {
    id: "reminder.outcome-checkin",
    description: "Outcome check-in nudge 7 days out",
    evaluate(ctx) {
      if (ctx.activeRegimenCount > 0) {
        return {
          ruleId: "reminder.outcome-checkin",
          type: "task.outcome_nudge",
          title: "Weekly outcome check-in",
          rationale:
            "Active regimen — weekly outcome log nudge keeps trend data fresh for next visit.",
          scheduledFor: atDays(7),
          urgency: "routine",
        };
      }
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export const schedulingAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "scheduling",
  version: "2.0.0",
  description:
    "Cadence engine. Evaluates practice protocol rules against the patient's state " +
    "and schedules the right follow-ups + reminders. Every scheduled task carries " +
    "the rule id + rationale so the clinical team knows why it exists.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "read.encounter", "read.note", "write.task"],
  requiresApproval: false,

  async run({ patientId, trigger }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        dosingRegimens: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        outcomeLogs: {
          orderBy: { loggedAt: "desc" },
          take: 30,
        },
        encounters: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
        medications: { where: { active: true } },
      },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const now = Date.now();
    const fourteenDaysAgo = now - 14 * DAY_MS;
    const hasNewRegimenLast14d = patient.dosingRegimens.some(
      (r) => r.createdAt.getTime() >= fourteenDaysAgo,
    );
    const activeRegimenCount = patient.dosingRegimens.length;

    const worstByMetric = (metric: string): number | null => {
      const recent = patient.outcomeLogs
        .filter((o) => o.metric === metric)
        .slice(0, 6);
      if (recent.length === 0) return null;
      return Math.max(...recent.map((o) => Number(o.value) || 0));
    };

    const ruleCtx: RuleContext = {
      patientId: patient.id,
      organizationId: patient.organizationId,
      trigger,
      activeRegimenCount,
      hasNewRegimenLast14d,
      worstRecentPhq9: worstByMetric("phq9"),
      worstRecentGad7: worstByMetric("gad7"),
      worstRecentPain: worstByMetric("pain"),
      daysSinceLastVisit:
        patient.encounters[0]
          ? Math.floor((now - patient.encounters[0].createdAt.getTime()) / DAY_MS)
          : null,
      hasCurrentPrescription: patient.medications.length > 0 || activeRegimenCount > 0,
      // CUD flag: a memory of "concern" with cud / cannabis-use-disorder tag
      // would be the right source; V1 reads from patient.presentingConcerns.
      hasCUDFlag:
        (patient.presentingConcerns ?? "")
          .toLowerCase()
          .includes("cannabis use disorder") ||
        (patient.presentingConcerns ?? "").toLowerCase().includes("cud"),
    };

    // Evaluate rules. The first primary rule that fires becomes the primary
    // follow-up; all secondary rules that fire are layered on top. This
    // prevents double-booking follow-ups while still emitting reminders.
    const primaryHit = CADENCE_RULES.map((r) => r.evaluate(ruleCtx)).find(
      (hit): hit is NonNullable<RuleOutcome> => hit !== null,
    );
    const secondaryHits = SECONDARY_RULES.map((r) => r.evaluate(ruleCtx)).filter(
      (hit): hit is NonNullable<RuleOutcome> => hit !== null,
    );

    const actions: z.infer<typeof scheduledAction>[] = [];
    if (primaryHit) actions.push(primaryHit);
    actions.push(...secondaryHits);

    // Fallback: something must always be scheduled. If no rule fires we
    // emit a gentle 30-day reach-out so no patient falls out of the loop.
    if (actions.length === 0) {
      actions.push({
        ruleId: "fallback.reengagement",
        type: "followup.reengage",
        title: "30-day re-engagement check-in",
        rationale:
          "No specific cadence rule fired — safety net prevents silent patient drop-off.",
        scheduledFor: atDays(30),
        urgency: "routine",
      });
    }

    ctx.assertCan("write.task");
    for (const action of actions) {
      await prisma.task.create({
        data: {
          organizationId: patient.organizationId,
          patientId,
          title: action.title,
          assigneeRole: "operator",
          dueAt: new Date(action.scheduledFor),
          description: `[${action.ruleId}] ${action.rationale}`,
        },
      });
    }

    await writeAgentAudit(
      "scheduling",
      "2.0.0",
      patient.organizationId,
      "scheduling.cadence.evaluated",
      { type: "Patient", id: patientId },
      {
        trigger,
        primaryRule: primaryHit?.ruleId ?? "fallback.reengagement",
        actionCount: actions.length,
      },
    );

    ctx.log("info", "Scheduling cadence evaluated", {
      patientId,
      trigger,
      primaryRule: primaryHit?.ruleId,
      actionCount: actions.length,
    });

    return { actions };
  },
};

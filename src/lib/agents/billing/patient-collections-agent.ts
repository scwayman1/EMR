import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { formatMoney } from "@/lib/domain/billing";

// ---------------------------------------------------------------------------
// Pure helpers (extracted for testing)
// ---------------------------------------------------------------------------

export type CollectionsIntent =
  | "gentle_reminder"
  | "second_notice"
  | "final_notice"
  | "payment_plan_offer";

export type CollectionsClaim = {
  patientRespCents: number;
  payments: Array<{ source: string; amountCents: number }>;
};

export type CollectionsStatement = {
  createdAt: Date;
};

/** Sum how much the patient still owes across all their open claims.
 * Claims can have multiple patient payments; the outstanding figure is
 * max(0, patientResp - sum of patient payments). */
export function computeTotalOwedCents(claims: CollectionsClaim[]): number {
  return claims.reduce((acc, claim) => {
    const patientPaid = claim.payments
      .filter((p) => p.source === "patient")
      .reduce((a, p) => a + p.amountCents, 0);
    return acc + Math.max(0, claim.patientRespCents - patientPaid);
  }, 0);
}

/** How old is the oldest outstanding statement, in days? Statements are
 * assumed to be sorted desc by createdAt (the agent's Prisma query orders
 * that way). Returns 0 when there are no statements. */
export function oldestStatementAgeDays(
  statements: CollectionsStatement[],
  now: Date = new Date(),
): number {
  if (!statements || statements.length === 0) return 0;
  const oldest = statements[statements.length - 1];
  return Math.floor(
    (now.getTime() - new Date(oldest.createdAt).getTime()) / (24 * 60 * 60 * 1000),
  );
}

/** Tone guidance is a simple intent → prose map. Exposed so tests and UI
 * previews can reuse the authoritative copy. */
export const TONE_BY_INTENT: Record<CollectionsIntent, string> = {
  gentle_reminder:
    "Warm and helpful. This is a friendly nudge — they likely just forgot.",
  second_notice:
    "Still respectful but a bit more direct. Make it easy to act now.",
  final_notice:
    "Professional, clear about consequences (account may go to collections), but never threatening.",
  payment_plan_offer:
    "Empathetic. Acknowledge that healthcare bills can be hard. Offer the plan as a solution.",
};

export function toneForIntent(intent: CollectionsIntent): string {
  return TONE_BY_INTENT[intent] ?? TONE_BY_INTENT.gentle_reminder;
}

/** Template fallback message used when the LLM call fails or returns a
 * stub. Keeps the dunning tone consistent across LLM + fallback paths. */
export function buildFallbackCollectionsMessage(params: {
  firstName: string;
  totalOwed: string;
  intent: CollectionsIntent;
}): string {
  const { firstName, totalOwed, intent } = params;
  const greeting = `Hi ${firstName},`;
  const body =
    intent === "gentle_reminder"
      ? `Just a friendly reminder that you have a balance of ${totalOwed} from your recent care. You can pay online through your patient portal whenever it's convenient.`
      : intent === "second_notice"
        ? `Your balance of ${totalOwed} is still open and we wanted to check in. Paying online takes just a minute, and we're happy to set up a payment plan if that's easier.`
        : intent === "final_notice"
          ? `Your balance of ${totalOwed} is significantly past due. Please reach out so we can find a path forward together — we have payment plans available and want to help.`
          : `We know healthcare bills can be hard. We'd love to set up a payment plan for your ${totalOwed} balance — small monthly payments, no fees.`;
  const closing = `If anything is confusing, just reply to this message and someone from our billing team will explain. — Your care team`;
  return `${greeting}\n\n${body}\n\n${closing}`;
}

/** Decide whether an LLM completion is usable or we should fall back to
 * the template. Non-empty and not a "[stub…]" placeholder. */
export function shouldUseLlmDraft(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.length > 20 && !trimmed.startsWith("[stub");
}

/** Core outreach decision: should we draft a collections message at all,
 * and if so what intent? "pause" means the patient has nothing owed (no
 * outreach necessary) — kept as a pure function so the pause rule stays
 * testable. */
export function shouldSendCollectionsOutreach(params: {
  totalOwedCents: number;
  intent: CollectionsIntent;
}):
  | { send: true; intent: CollectionsIntent }
  | { send: false; reason: "paid_in_full" } {
  if (params.totalOwedCents <= 0) {
    return { send: false, reason: "paid_in_full" };
  }
  return { send: true, intent: params.intent };
}

/**
 * Auto-resolve the right dunning intent from the patient's actual state.
 * The callers used to hardcode intent at the call site; this helper
 * promotes escalation into data so the same ladder runs everywhere.
 *
 * Ladder (first match wins):
 *   1. Active payment plan with no defaults   → "pause" (no outreach)
 *   2. Oldest statement ≥ 90 days + ≥ 3 prior → "payment_plan_offer"
 *   3. Oldest statement ≥ 90 days             → "final_notice"
 *   4. Oldest statement ≥ 60 days             → "second_notice"
 *   5. Oldest statement ≥ 30 days             → "gentle_reminder"
 *   6. Anything younger                       → "pause"
 */
export function resolveDunningIntent(params: {
  oldestStatementAgeDays: number;
  priorNoticeCount: number;
  hasActivePaymentPlan: boolean;
  /** true if the payment plan is behind on its last installment */
  paymentPlanInDefault: boolean;
  /** Total the patient currently owes — no outreach for $0 */
  totalOwedCents: number;
}): { intent: CollectionsIntent | "pause"; reason: string } {
  if (params.totalOwedCents <= 0) {
    return { intent: "pause", reason: "Patient owes $0.00 — no outreach." };
  }
  if (params.hasActivePaymentPlan && !params.paymentPlanInDefault) {
    return {
      intent: "pause",
      reason: "Patient is on an active payment plan and current — do not re-engage the dunning ladder.",
    };
  }
  if (params.oldestStatementAgeDays >= 90 && params.priorNoticeCount >= 3) {
    return {
      intent: "payment_plan_offer",
      reason: "Three prior notices sent and balance > 90 days — offer a payment plan as a relief path before external collections.",
    };
  }
  if (params.oldestStatementAgeDays >= 90) {
    return {
      intent: "final_notice",
      reason: "Balance is > 90 days old. Send final-notice language with account-handling consequences noted.",
    };
  }
  if (params.oldestStatementAgeDays >= 60) {
    return {
      intent: "second_notice",
      reason: "Balance is > 60 days old — escalate from gentle reminder to a second notice.",
    };
  }
  if (params.oldestStatementAgeDays >= 30) {
    return {
      intent: "gentle_reminder",
      reason: "Balance is > 30 days old — friendly nudge.",
    };
  }
  return {
    intent: "pause",
    reason: "Balance is under 30 days old — too early for dunning outreach.",
  };
}

// ---------------------------------------------------------------------------
// Patient Collections Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #8: "Maximize patient collections ethically and efficiently."
//
// Drafts dunning messages and payment-link nudges based on aging and the
// patient's billing history. Always approval-gated — no automated message
// sending without a human reviewing first. Per PRD: "The system should
// increase collections by reducing confusion first, then by reducing
// friction, then by increasing discipline."
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
  intent: z.enum(["gentle_reminder", "second_notice", "final_notice", "payment_plan_offer"]),
});

const output = z.object({
  patientId: z.string(),
  intent: z.string(),
  draftMessage: z.string(),
  totalOwed: z.string(),
  oldestBalanceDays: z.number(),
  draftMessageId: z.string().nullable(),
});

export const patientCollectionsAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "patientCollections",
  version: "1.0.0",
  description:
    "Drafts patient billing nudges and payment-link messages. Always " +
    "approval-gated — no auto-send. Tone matches dunning stage.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "read.claim", "read.statement", "write.message.draft"],
  requiresApproval: true,

  async run({ patientId, intent }, ctx) {
    ctx.assertCan("read.patient");

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        statements: {
          where: { status: { notIn: ["paid", "voided"] } },
          orderBy: { createdAt: "desc" },
        },
        claims: {
          where: { patientRespCents: { gt: 0 } },
          include: { payments: true },
        },
      },
    });

    if (!patient) throw new Error(`Patient ${patientId} not found`);

    // Compute current owed
    const totalOwedCents = computeTotalOwedCents(patient.claims);

    const outreachDecision = shouldSendCollectionsOutreach({
      totalOwedCents,
      intent,
    });
    if (!outreachDecision.send) {
      ctx.log("info", "Patient has no outstanding balance — skipping");
      return {
        patientId,
        intent,
        draftMessage: "",
        totalOwed: "$0.00",
        oldestBalanceDays: 0,
        draftMessageId: null,
      };
    }

    const totalOwed = formatMoney(totalOwedCents);

    // Oldest balance age
    const oldest = oldestStatementAgeDays(patient.statements);

    const tone = toneForIntent(intent);

    const prompt = `You are drafting a billing message to a patient on behalf of a cannabis care practice that prides itself on being warm and human.

PATIENT NAME: ${patient.firstName}
TOTAL OWED: ${totalOwed}
OLDEST BALANCE: ${oldest} days
OPEN STATEMENTS: ${patient.statements.length}
INTENT: ${intent}

TONE GUIDANCE: ${tone}

Write a short message (3-5 sentences) that:
1. Greets the patient by first name
2. Tells them what they owe and roughly why
3. Makes paying easy — mention they can pay through the portal or set up a plan
4. Closes warmly

DO NOT use words like "delinquent" or "past due account". Use "your balance" or "what you owe".
DO NOT threaten collections unless intent is "final_notice".
DO mention that their billing team is here to answer questions.

Return ONLY the message text. No subject line, no signature, no JSON.`;

    let draftMessage = "";
    let usedLLM = false;
    try {
      const raw = await ctx.model.complete(prompt, {
        maxTokens: 350,
        temperature: 0.5,
      });
      draftMessage = raw.trim();
      usedLLM = shouldUseLlmDraft(draftMessage);
    } catch (err) {
      ctx.log("warn", "LLM call failed — using template fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!usedLLM) {
      draftMessage = buildFallbackCollectionsMessage({
        firstName: patient.firstName,
        totalOwed,
        intent,
      });
    }

    // Find or create message thread
    let thread = await prisma.messageThread.findFirst({
      where: { patientId, subject: { contains: "Billing" } },
    });

    if (!thread) {
      thread = await prisma.messageThread.create({
        data: {
          patientId,
          subject: "Billing — your account",
        },
      });
    }

    // Draft the message — DO NOT send it (approval-gated)
    ctx.assertCan("write.message.draft");
    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        body: draftMessage,
        status: "draft",
        aiDrafted: true,
        senderAgent: "patientCollections:1.0.0",
      },
    });

    ctx.log("info", "Collections draft created", {
      patientId,
      intent,
      messageId: message.id,
      totalOwed: totalOwedCents,
      usedLLM,
    });

    return {
      patientId,
      intent,
      draftMessage,
      totalOwed,
      oldestBalanceDays: oldest,
      draftMessageId: message.id,
    };
  },
};

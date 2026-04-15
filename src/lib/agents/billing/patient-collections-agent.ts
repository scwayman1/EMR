import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { formatMoney } from "@/lib/domain/billing";

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

const TONE_BY_INTENT: Record<string, string> = {
  gentle_reminder:
    "Warm and helpful. This is a friendly nudge — they likely just forgot.",
  second_notice:
    "Still respectful but a bit more direct. Make it easy to act now.",
  final_notice:
    "Professional, clear about consequences (account may go to collections), but never threatening.",
  payment_plan_offer:
    "Empathetic. Acknowledge that healthcare bills can be hard. Offer the plan as a solution.",
};

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
    const totalOwedCents = patient.claims.reduce((acc, claim) => {
      const patientPaid = claim.payments
        .filter((p) => p.source === "patient")
        .reduce((a, p) => a + p.amountCents, 0);
      return acc + Math.max(0, claim.patientRespCents - patientPaid);
    }, 0);

    if (totalOwedCents === 0) {
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
    const oldest = patient.statements.length
      ? Math.floor(
          (Date.now() - new Date(patient.statements[patient.statements.length - 1].createdAt).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : 0;

    const tone = TONE_BY_INTENT[intent] ?? TONE_BY_INTENT.gentle_reminder;

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
      usedLLM = draftMessage.length > 20 && !draftMessage.startsWith("[stub");
    } catch (err) {
      ctx.log("warn", "LLM call failed — using template fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!usedLLM) {
      const greeting = `Hi ${patient.firstName},`;
      const body =
        intent === "gentle_reminder"
          ? `Just a friendly reminder that you have a balance of ${totalOwed} from your recent care. You can pay online through your patient portal whenever it's convenient.`
          : intent === "second_notice"
            ? `Your balance of ${totalOwed} is still open and we wanted to check in. Paying online takes just a minute, and we're happy to set up a payment plan if that's easier.`
            : intent === "final_notice"
              ? `Your balance of ${totalOwed} is significantly past due. Please reach out so we can find a path forward together — we have payment plans available and want to help.`
              : `We know healthcare bills can be hard. We'd love to set up a payment plan for your ${totalOwed} balance — small monthly payments, no fees.`;
      const closing = `If anything is confusing, just reply to this message and someone from our billing team will explain. — Your care team`;
      draftMessage = `${greeting}\n\n${body}\n\n${closing}`;
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

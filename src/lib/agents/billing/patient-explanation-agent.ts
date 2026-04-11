import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { formatMoney } from "@/lib/domain/billing";

// ---------------------------------------------------------------------------
// Patient Explanation Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #13: "Translate healthcare billing into human English."
//
// Generates plain-language explanations of statements, balances, and EOBs
// in 3rd-grade reading level. Used by:
//   - Statement plainLanguageSummary field (auto-populated on issuance)
//   - Patient billing portal "What this is for" cards
//   - Call center scripts when a patient asks why they owe money
//
// LLM-powered with graceful deterministic fallback.
// ---------------------------------------------------------------------------

const input = z.object({ statementId: z.string() });

const output = z.object({
  statementId: z.string(),
  summary: z.string(),
  generatedAt: z.string(),
  usedLLM: z.boolean(),
});

export const patientExplanationAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "patientExplanation",
  version: "1.0.0",
  description:
    "Generates a plain-language explanation of a patient statement so the " +
    "patient understands exactly what they owe and why.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.statement", "read.patient", "write.statement"],
  requiresApproval: false,

  async run({ statementId }, ctx) {
    ctx.assertCan("read.statement");

    const statement = await prisma.statement.findUnique({
      where: { id: statementId },
      include: {
        patient: {
          include: {
            coverages: { where: { type: "primary", active: true }, take: 1 },
          },
        },
      },
    });

    if (!statement) throw new Error(`Statement ${statementId} not found`);

    const patient = statement.patient;
    const coverage = patient.coverages[0];
    const lineItems = (statement.lineItems ?? []) as Array<{
      description?: string;
      date?: string;
      cptCode?: string;
      amountCents?: number;
      insurancePaid?: number;
      adjustment?: number;
      patientResponsibility?: number;
    }>;

    const totalCharges = formatMoney(statement.totalChargesCents);
    const insurancePaid = formatMoney(statement.insurancePaidCents);
    const adjustments = formatMoney(statement.adjustmentsCents);
    const amountDue = formatMoney(statement.amountDueCents);
    const dueDate = statement.dueDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    const prompt = `You are a compassionate healthcare billing translator. Write a plain-language explanation of this patient statement that a 3rd-grader could understand. The patient should feel respected, not lectured.

PATIENT: ${patient.firstName} ${patient.lastName}
INSURANCE: ${coverage?.payerName ?? "Self-pay"}
STATEMENT TOTAL: ${totalCharges}
INSURANCE PAID: ${insurancePaid}
ADJUSTMENTS: ${adjustments}
PATIENT OWES: ${amountDue}
DUE DATE: ${dueDate}

LINE ITEMS:
${lineItems
  .map(
    (li) =>
      `  - ${li.description ?? "service"} on ${li.date ? new Date(li.date).toLocaleDateString() : "(date)"}: charged ${formatMoney(li.amountCents ?? 0)}, insurance paid ${formatMoney(li.insurancePaid ?? 0)}, you owe ${formatMoney(li.patientResponsibility ?? 0)}`,
  )
  .join("\n")}

Write 3-4 sentences. Cover:
1. What the bill is for (which visit, when)
2. What your insurance covered
3. Why there's still an amount due (copay? deductible? coinsurance?)
4. Your options to pay (online, payment plan, questions)

Be warm. Use words like "your" and "you". Don't use jargon. Don't say "patient responsibility" — say "your share" or "what you owe". Don't be preachy.

Return ONLY the explanation text. No JSON, no quotes, no preamble.`;

    let summary = "";
    let usedLLM = false;

    try {
      const raw = await ctx.model.complete(prompt, {
        maxTokens: 300,
        temperature: 0.4,
      });
      summary = raw.trim().replace(/^["']|["']$/g, "");
      usedLLM = summary.length > 20 && !summary.startsWith("[stub");
    } catch (err) {
      ctx.log("warn", "LLM call failed — using deterministic summary", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!usedLLM) {
      // Deterministic fallback — still warm, still readable
      const visitDate =
        lineItems[0]?.date
          ? new Date(lineItems[0].date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })
          : "your recent visit";

      summary = `This is for ${visitDate}. Your insurance${coverage ? ` (${coverage.payerName})` : ""} covered most of it — they paid ${insurancePaid}. The remaining ${amountDue} is your portion${
        coverage?.copayCents ? ", which covers your copay and a small share of the visit" : ""
      }. You can pay online with a card or set up a payment plan. If anything looks confusing, message your billing team and we'll explain.`;
    }

    ctx.assertCan("write.statement");

    await prisma.statement.update({
      where: { id: statementId },
      data: { plainLanguageSummary: summary },
    });

    ctx.log("info", "Patient explanation generated", {
      statementId,
      usedLLM,
      length: summary.length,
    });

    return {
      statementId,
      summary,
      generatedAt: new Date().toISOString(),
      usedLLM,
    };
  },
};

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { formatMoney } from "@/lib/domain/billing";
import { ageClaims, daysInAR } from "@/lib/billing/aging";

// ---------------------------------------------------------------------------
// Revenue Command Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #14: "Mission control for billing leadership. Summarize
// daily performance. Surface anomalies. Predict revenue risks. Recommend
// staffing or workflow intervention."
//
// Runs once a day (or on demand). Computes practice-wide billing KPIs,
// flags anomalies vs. baseline, and produces an LLM-written executive
// briefing for billing leadership. The briefing is stored as a financial
// event so the operator dashboard can render the latest summary.
// ---------------------------------------------------------------------------

const input = z.object({ organizationId: z.string() });

const output = z.object({
  organizationId: z.string(),
  generatedAt: z.string(),
  metrics: z.object({
    totalBilledCents: z.number(),
    totalPaidCents: z.number(),
    collectionRate: z.number(),
    daysInAR: z.number(),
    activeClaims: z.number(),
    deniedClaims: z.number(),
    deniedDollarsCents: z.number(),
    creditBalancesCount: z.number(),
    todayBilledCents: z.number(),
    todayCollectedCents: z.number(),
  }),
  anomalies: z.array(z.string()),
  briefing: z.string(),
  usedLLM: z.boolean(),
});

export const revenueCommandAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "revenueCommand",
  version: "1.0.0",
  description:
    "Daily executive briefing for billing leadership. Computes KPIs, " +
    "flags anomalies, generates LLM-written summary.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.payment", "write.financialEvent"],
  requiresApproval: false,

  async run({ organizationId }, ctx) {
    ctx.assertCan("read.claim");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Pull everything we need in parallel
    const [allClaims, todayPayments, denialAggregate] = await Promise.all([
      prisma.claim.findMany({
        where: { organizationId },
        include: { payments: true },
      }),
      prisma.payment.findMany({
        where: {
          claim: { organizationId },
          paymentDate: { gte: startOfDay },
        },
      }),
      prisma.claim.aggregate({
        where: { organizationId, status: "denied" },
        _count: true,
        _sum: { billedAmountCents: true },
      }),
    ]);

    // Compute KPIs
    const totalBilledCents = allClaims.reduce(
      (acc, c) => acc + c.billedAmountCents,
      0,
    );
    const totalPaidCents = allClaims.reduce(
      (acc, c) => acc + c.paidAmountCents,
      0,
    );
    const collectionRate =
      totalBilledCents > 0
        ? Math.round((totalPaidCents / totalBilledCents) * 100)
        : 0;

    const dar = daysInAR(allClaims);
    const activeClaims = allClaims.filter(
      (c) => c.status !== "paid" && c.status !== "written_off",
    ).length;
    const deniedClaims = denialAggregate._count;
    const deniedDollarsCents = denialAggregate._sum.billedAmountCents ?? 0;

    const todayBilledCents = allClaims
      .filter((c) => c.serviceDate >= startOfDay)
      .reduce((acc, c) => acc + c.billedAmountCents, 0);
    const todayCollectedCents = todayPayments.reduce(
      (acc, p) => acc + p.amountCents,
      0,
    );

    // Credit balance count (rough — a real query would check patient resp vs payments)
    const creditCheck = await prisma.payment.aggregate({
      where: { source: "patient", claim: { organizationId } },
      _sum: { amountCents: true },
    });
    const totalRespCents = allClaims.reduce(
      (a, c) => a + c.patientRespCents,
      0,
    );
    const creditBalancesCount =
      (creditCheck._sum.amountCents ?? 0) > totalRespCents ? 1 : 0;

    // Aging analysis
    const { totals } = ageClaims(allClaims);

    // ── Anomaly detection ─────────────────────────────────────────
    const anomalies: string[] = [];

    if (dar > 60) {
      anomalies.push(`Days in A/R is elevated at ${dar} days (target: <40).`);
    }
    if (collectionRate < 70 && totalBilledCents > 0) {
      anomalies.push(
        `Collection rate is ${collectionRate}% (target: >85%). ${formatMoney(totalBilledCents - totalPaidCents)} outstanding.`,
      );
    }
    if (deniedClaims > 0) {
      const denialRate = Math.round((deniedClaims / allClaims.length) * 100);
      if (denialRate > 5) {
        anomalies.push(
          `Denial rate is ${denialRate}% (${deniedClaims} claims, ${formatMoney(deniedDollarsCents)} at risk). Industry baseline: <5%.`,
        );
      }
    }
    if (totals.byBucket["120+"].total > 0) {
      anomalies.push(
        `${formatMoney(totals.byBucket["120+"].total)} sitting in 120+ day bucket — likely uncollectible without active intervention.`,
      );
    }
    if (todayBilledCents > 0 && todayCollectedCents === 0) {
      anomalies.push(
        `Charges posted today (${formatMoney(todayBilledCents)}) but zero collections received.`,
      );
    }

    // ── Generate executive briefing via LLM ───────────────────────
    const prompt = `You are the chief financial officer of a modern cannabis care medical practice writing the daily revenue briefing for the practice owner. Be concise, direct, and useful. No filler.

PRACTICE: Leafjourney
DATE: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

KPIs:
- Total billed (all-time): ${formatMoney(totalBilledCents)}
- Total collected: ${formatMoney(totalPaidCents)}
- Collection rate: ${collectionRate}%
- Days in A/R: ${dar}
- Active (open) claims: ${activeClaims}
- Denied claims: ${deniedClaims} (${formatMoney(deniedDollarsCents)} at risk)
- Today's charges: ${formatMoney(todayBilledCents)}
- Today's collections: ${formatMoney(todayCollectedCents)}
- 120+ day A/R: ${formatMoney(totals.byBucket["120+"].total)}

ANOMALIES DETECTED:
${anomalies.length > 0 ? anomalies.map((a) => `- ${a}`).join("\n") : "- None — operations are tracking to targets."}

Write a 4-6 sentence executive briefing that:
1. Opens with the headline number that matters most today
2. Highlights what's going well (1-2 things)
3. Calls out the most pressing issue (1-2 things, with dollar amounts)
4. Recommends ONE concrete action for tomorrow

Tone: confident, direct, no corporate jargon. Talk like a smart operator.

Return ONLY the briefing text. No headings, no JSON.`;

    let briefing = "";
    let usedLLM = false;
    try {
      const raw = await ctx.model.complete(prompt, {
        maxTokens: 400,
        temperature: 0.4,
      });
      briefing = raw.trim();
      usedLLM = briefing.length > 30 && !briefing.startsWith("[stub");
    } catch (err) {
      ctx.log("warn", "LLM call failed — using deterministic briefing", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (!usedLLM) {
      // Deterministic fallback briefing
      briefing =
        `Today's snapshot: ${formatMoney(totalPaidCents)} collected against ${formatMoney(totalBilledCents)} billed, for a ${collectionRate}% collection rate. ` +
        `${activeClaims} claims are still open, with ${formatMoney(deniedDollarsCents)} sitting in denials. ` +
        (anomalies.length > 0
          ? `Top issue: ${anomalies[0]} `
          : `No major anomalies detected. `) +
        `Tomorrow's focus: work the denials queue first — that's the fastest path to recovered revenue.`;
    }

    // Persist as a financial event so the dashboard can render it
    ctx.assertCan("write.financialEvent");
    if (allClaims.length > 0) {
      await prisma.financialEvent.create({
        data: {
          organizationId,
          patientId: allClaims[0].patientId, // arbitrary — needed by schema
          type: "patient_payment",
          amountCents: 0,
          description: "Daily revenue briefing",
          metadata: {
            kind: "revenue_briefing",
            metrics: {
              totalBilledCents,
              totalPaidCents,
              collectionRate,
              daysInAR: dar,
              activeClaims,
              deniedClaims,
              deniedDollarsCents,
              todayBilledCents,
              todayCollectedCents,
            },
            anomalies,
            briefing,
          },
          createdByAgent: "revenueCommand:1.0.0",
        },
      });
    }

    ctx.log("info", "Revenue command briefing generated", {
      collectionRate,
      anomalies: anomalies.length,
      usedLLM,
    });

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalBilledCents,
        totalPaidCents,
        collectionRate,
        daysInAR: dar,
        activeClaims,
        deniedClaims,
        deniedDollarsCents,
        creditBalancesCount,
        todayBilledCents,
        todayCollectedCents,
      },
      anomalies,
      briefing,
      usedLLM,
    };
  },
};

import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { buildCfoReport, persistCfoReport } from "@/lib/finance/report";
import { rangeForPeriod } from "@/lib/finance/period";
import { fmtMoney, fmtPct } from "@/lib/finance/formatting";
import type { FinancialReportPeriod } from "@prisma/client";

// ---------------------------------------------------------------------------
// CFO Agent
// ---------------------------------------------------------------------------
// The CFO Agent is the practice's autonomous financial controller. On every
// run it:
//
//   1. Builds a real-time P&L for the requested period (defaults to weekly)
//   2. Builds the cash flow statement (operating / investing / financing)
//   3. Builds the balance sheet at period end
//   4. Computes cross-statement KPIs vs. prior period and operator goals
//   5. Detects anomalies (margin compression, runway, AR buildup, etc.)
//   6. Writes an executive narrative — what's working, what's broken, what
//      to do tomorrow
//   7. Persists every artifact as a FinancialReport row
//
// No human direction required. Re-runnable on demand (operator hits the
// "Generate now" button) or driven by the weekly cron event.
// ---------------------------------------------------------------------------

const periodEnum = z.enum(["weekly", "monthly", "quarterly", "annual", "daily"]);

const input = z.object({
  organizationId: z.string(),
  /** Period to report. Defaults to weekly. */
  period: periodEnum.optional(),
  /** Anchor date — defaults to "now". */
  anchorISO: z.string().optional(),
});

const output = z.object({
  organizationId: z.string(),
  period: periodEnum,
  rangeStart: z.string(),
  rangeEnd: z.string(),
  generatedAt: z.string(),
  metrics: z.object({
    revenueCents: z.number(),
    cogsCents: z.number(),
    grossMarginPct: z.number(),
    opexCents: z.number(),
    ebitdaCents: z.number(),
    netIncomeCents: z.number(),
    cashCents: z.number(),
    runwayDays: z.number().nullable(),
    workingCapitalCents: z.number(),
    currentRatio: z.number(),
  }),
  anomalies: z.array(
    z.object({
      id: z.string(),
      severity: z.enum(["info", "warn", "critical"]),
      message: z.string(),
      recommendation: z.string().optional(),
    }),
  ),
  narrative: z.string(),
  reportIds: z.object({
    pnl: z.string(),
    cashFlow: z.string(),
    balanceSheet: z.string(),
    kpiDashboard: z.string(),
    briefing: z.string(),
  }),
  usedLLM: z.boolean(),
});

export const cfoAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "cfo",
  version: "1.0.0",
  description:
    "Autonomous CFO/controller. Generates real-time P&L, cash flow, and balance sheet, " +
    "computes KPIs vs. prior period, flags anomalies, and writes an executive briefing.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.payment", "read.statement", "read.patient", "write.financialEvent"],
  requiresApproval: false,

  async run({ organizationId, period: periodInput, anchorISO }, ctx) {
    ctx.assertCan("read.claim");
    const period = periodInput ?? "weekly";
    const anchor = anchorISO ? new Date(anchorISO) : new Date();
    const range = rangeForPeriod(period as FinancialReportPeriod, anchor);
    ctx.tools.step("cfo.range_resolved", { start: range.start.toISOString(), end: range.end.toISOString(), period });

    // ── 1. Build the full report ─────────────────────────────
    const report = await buildCfoReport(organizationId, range);
    ctx.tools.step("cfo.report_built", {
      revenueCents: report.pnl.totals.revenueCents,
      ebitdaCents: report.pnl.totals.ebitdaCents,
      netIncomeCents: report.pnl.totals.netIncomeCents,
      cashCents: report.cashFlow.closingCashCents,
      anomalies: report.anomalies.length,
    });

    // ── 2. LLM-written executive narrative ────────────────────
    const prompt = buildPrompt(report);
    let narrative = "";
    let usedLLM = false;
    try {
      const raw = await ctx.model.complete(prompt, { maxTokens: 700, temperature: 0.35 });
      narrative = raw.trim();
      usedLLM = narrative.length > 50 && !narrative.startsWith("[stub");
    } catch (err) {
      ctx.log("warn", "CFO LLM call failed — falling back to deterministic narrative", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (!usedLLM) narrative = deterministicNarrative(report);

    // ── 3. Persist ───────────────────────────────────────────
    ctx.assertCan("write.financialEvent");
    const generatedBy = `agent:cfo@1.0.0`;
    const [pnlRow, cashRow, bsRow, kpiRow, briefingRow] = await persistCfoReport(report, narrative, generatedBy);
    ctx.tools.step("cfo.persisted", { reportIds: [pnlRow.id, cashRow.id, bsRow.id, kpiRow.id, briefingRow.id] });

    // ── 4. Audit trail ───────────────────────────────────────
    await writeAgentAudit(
      "cfo",
      "1.0.0",
      organizationId,
      "cfo.report.generated",
      { type: "FinancialReport", id: briefingRow.id },
      {
        period,
        rangeStart: range.start.toISOString(),
        rangeEnd: range.end.toISOString(),
        revenueCents: report.pnl.totals.revenueCents,
        netIncomeCents: report.pnl.totals.netIncomeCents,
        anomalies: report.anomalies.length,
      },
    );

    ctx.log("info", "CFO report generated", {
      organizationId,
      period,
      revenueCents: report.pnl.totals.revenueCents,
      ebitdaCents: report.pnl.totals.ebitdaCents,
      cashCents: report.cashFlow.closingCashCents,
      anomalies: report.anomalies.length,
      usedLLM,
    });

    return {
      organizationId,
      period,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      generatedAt: report.generatedAt.toISOString(),
      metrics: {
        revenueCents: report.pnl.totals.revenueCents,
        cogsCents: report.pnl.totals.cogsCents,
        grossMarginPct: report.pnl.totals.grossMarginPct,
        opexCents: report.pnl.totals.opexCents,
        ebitdaCents: report.pnl.totals.ebitdaCents,
        netIncomeCents: report.pnl.totals.netIncomeCents,
        cashCents: report.cashFlow.closingCashCents,
        runwayDays: report.cashFlow.runwayDays,
        workingCapitalCents: report.balanceSheet.ratios.workingCapitalCents,
        currentRatio: report.balanceSheet.ratios.currentRatio,
      },
      anomalies: report.anomalies.map((a) => ({
        id: a.id,
        severity: a.severity,
        message: a.message,
        recommendation: a.recommendation,
      })),
      narrative,
      reportIds: {
        pnl: pnlRow.id,
        cashFlow: cashRow.id,
        balanceSheet: bsRow.id,
        kpiDashboard: kpiRow.id,
        briefing: briefingRow.id,
      },
      usedLLM,
    };
  },
};

// ---------------------------------------------------------------------------
// LLM prompt construction
// ---------------------------------------------------------------------------

function buildPrompt(report: import("@/lib/finance/report").CfoReport): string {
  const { pnl, priorPnl, cashFlow, balanceSheet, anomalies, range } = report;

  const topExpenses = pnl.sections.operatingExpenses.lines
    .slice(0, 5)
    .map((l) => `  ${l.label}: ${fmtMoney(l.amountCents)}`)
    .join("\n") || "  (none)";

  const revenueChange =
    priorPnl.totals.revenueCents > 0
      ? `${(((pnl.totals.revenueCents - priorPnl.totals.revenueCents) / Math.abs(priorPnl.totals.revenueCents)) * 100).toFixed(1)}%`
      : "n/a (no prior baseline)";

  const anomalyList = anomalies.length
    ? anomalies.slice(0, 6).map((a) => `  [${a.severity.toUpperCase()}] ${a.message}${a.recommendation ? ` → ${a.recommendation}` : ""}`).join("\n")
    : "  (none — operations are on track)";

  return `You are the Chief Financial Officer of Leafjourney, a modern cannabis-care medical practice. You are writing the ${range.period} financial briefing for the founder/owner. You are a no-BS controller: precise, direct, candid about both wins and risks. Talk like a smart, experienced operator — not corporate-speak.

PERIOD: ${range.label} (${range.start.toISOString().slice(0, 10)} → ${range.end.toISOString().slice(0, 10)})

P&L:
  Revenue:        ${fmtMoney(pnl.totals.revenueCents)} (${revenueChange} vs. prior ${range.period})
  COGS:           ${fmtMoney(pnl.totals.cogsCents)}
  Gross profit:   ${fmtMoney(pnl.totals.grossProfitCents)} (${fmtPct(pnl.totals.grossMarginPct)} margin)
  Operating exp:  ${fmtMoney(pnl.totals.opexCents)}
  EBITDA:         ${fmtMoney(pnl.totals.ebitdaCents)}
  Net income:     ${fmtMoney(pnl.totals.netIncomeCents)} (${fmtPct(pnl.totals.netMarginPct)} margin)

TOP OPEX LINES:
${topExpenses}

CASH FLOW:
  Net operating:  ${fmtMoney(cashFlow.netOperatingCents)}
  Net investing:  ${fmtMoney(cashFlow.netInvestingCents)}
  Net financing:  ${fmtMoney(cashFlow.netFinancingCents)}
  Net change:     ${fmtMoney(cashFlow.netChangeCents)}
  Closing cash:   ${fmtMoney(cashFlow.closingCashCents)}
  Daily burn:     ${fmtMoney(cashFlow.burnRateCentsPerDay)}/day
  Runway:         ${cashFlow.runwayDays === null ? "infinite (cash flow positive)" : `${cashFlow.runwayDays} days`}

BALANCE SHEET (as of ${range.end.toISOString().slice(0, 10)}):
  Total assets:       ${fmtMoney(balanceSheet.assets.totalCents)}
  Total liabilities:  ${fmtMoney(balanceSheet.liabilities.totalCents)}
  Total equity:       ${fmtMoney(balanceSheet.equity.totalCents)}
  Working capital:    ${fmtMoney(balanceSheet.ratios.workingCapitalCents)}
  Current ratio:      ${balanceSheet.ratios.currentRatio.toFixed(2)}
  Debt/equity:        ${balanceSheet.ratios.debtToEquity.toFixed(2)}

ANOMALIES DETECTED:
${anomalyList}

Write a briefing in 4 short sections — no headings, no markdown — separated by blank lines:

1. Headline (1-2 sentences): the single most important takeaway. Lead with the dollar number that matters.
2. What's working (2-3 sentences): name the lines that improved and why.
3. What needs attention (2-4 sentences): the most pressing risks, with numbers and a why.
4. Tomorrow's move (1-2 sentences): the single concrete action you'd take Monday morning.

Keep it under 220 words. No filler. No emojis. No bullet points. Plain narrative paragraphs.`;
}

function deterministicNarrative(report: import("@/lib/finance/report").CfoReport): string {
  const { pnl, cashFlow, balanceSheet, anomalies, range } = report;
  const headlineNumber = fmtMoney(pnl.totals.revenueCents);
  const ebitda = fmtMoney(pnl.totals.ebitdaCents);
  const cash = fmtMoney(cashFlow.closingCashCents);
  const runway = cashFlow.runwayDays === null ? "infinite — operations are cash-flow positive" : `${cashFlow.runwayDays} days at current burn`;
  const topAnomaly = anomalies[0];

  const parts: string[] = [];
  parts.push(
    `${range.label}: ${headlineNumber} in revenue, ${ebitda} EBITDA, and ${cash} sitting in the bank. Runway is ${runway}.`,
  );
  parts.push(
    `Gross margin landed at ${pnl.totals.grossMarginPct}%${pnl.totals.grossMarginPct >= 60 ? ", a healthy print for cannabis-care services" : "; we should investigate the COGS mix"}. Working capital is ${fmtMoney(balanceSheet.ratios.workingCapitalCents)} on a ${balanceSheet.ratios.currentRatio.toFixed(2)} current ratio.`,
  );
  if (topAnomaly) {
    parts.push(`The thing I'd worry about most: ${topAnomaly.message.toLowerCase()}${topAnomaly.recommendation ? ` ${topAnomaly.recommendation}` : ""}`);
  } else {
    parts.push(`No material anomalies detected — every category is tracking within range.`);
  }
  parts.push(
    `Tomorrow's move: ${
      pnl.totals.netIncomeCents < 0
        ? "find the largest opex line and pressure-test whether it can be cut by 10% without breaking patient flow."
        : "lean into what's working — double the marketing spend on the channel driving the highest-margin patients."
    }`,
  );
  return parts.join("\n\n");
}

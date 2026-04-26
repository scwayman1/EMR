import { prisma } from "@/lib/db/prisma";
import { buildPnl, type PnlReport } from "./pnl";
import { buildCashFlow, type CashFlowReport } from "./cash-flow";
import { buildBalanceSheet, type BalanceSheet } from "./balance-sheet";
import { buildKpis, applyGoals, buildSeries, type KpiCard, type RangeSeriesPoint } from "./kpis";
import { detectAnomalies, type Anomaly } from "./anomalies";
import { lastNWeeks, lastNMonths, priorRange, type DateRange } from "./period";

// ---------------------------------------------------------------------------
// Unified CFO report — the single object the CFO agent persists and the UI
// consumes. Combines P&L, cash flow, balance sheet, KPIs, anomalies, and
// trend series so consumers can render the whole picture from one fetch.
// ---------------------------------------------------------------------------

export interface CfoReport {
  organizationId: string;
  range: DateRange;
  generatedAt: Date;
  pnl: PnlReport;
  priorPnl: PnlReport;
  cashFlow: CashFlowReport;
  priorCashFlow: CashFlowReport;
  balanceSheet: BalanceSheet;
  kpis: KpiCard[];
  anomalies: Anomaly[];
  weeklySeries: RangeSeriesPoint[];
  monthlySeries: RangeSeriesPoint[];
}

export async function buildCfoReport(
  organizationId: string,
  range: DateRange,
): Promise<CfoReport> {
  const prior = priorRange(range);
  const [pnl, priorPnl, cashFlow, priorCashFlow, balanceSheet, weeklySeries, monthlySeries] = await Promise.all([
    buildPnl(organizationId, range),
    buildPnl(organizationId, prior),
    buildCashFlow(organizationId, range),
    buildCashFlow(organizationId, prior),
    buildBalanceSheet(organizationId, range.end),
    buildSeries(organizationId, lastNWeeks(13, range.end)),
    buildSeries(organizationId, lastNMonths(12, range.end)),
  ]);

  const baseKpis = buildKpis({ pnl, priorPnl, cashFlow, priorCashFlow, balanceSheet });
  const kpis = await applyGoals(organizationId, baseKpis);
  const anomalies = detectAnomalies({ pnl, priorPnl, cashFlow, priorCashFlow, balanceSheet });

  return {
    organizationId,
    range,
    generatedAt: new Date(),
    pnl,
    priorPnl,
    cashFlow,
    priorCashFlow,
    balanceSheet,
    kpis,
    anomalies,
    weeklySeries,
    monthlySeries,
  };
}

/** Persist a CfoReport into FinancialReport rows (one per type + a combined cfo_briefing). */
export async function persistCfoReport(report: CfoReport, narrative: string, generatedBy: string) {
  const { organizationId, range, pnl, cashFlow, balanceSheet, anomalies } = report;
  const periodStart = range.start;
  const periodEnd = range.end;
  const period = range.period;

  const baseHeadline = {
    revenueCents: pnl.totals.revenueCents,
    cogsCents: pnl.totals.cogsCents,
    grossProfitCents: pnl.totals.grossProfitCents,
    opexCents: pnl.totals.opexCents,
    ebitdaCents: pnl.totals.ebitdaCents,
    netIncomeCents: pnl.totals.netIncomeCents,
    cashCents: cashFlow.closingCashCents,
    arCents: balanceSheet.assets.current.lines
      .filter((l) => l.label.includes("receivables"))
      .reduce((a, l) => a + l.amountCents, 0),
    apCents: balanceSheet.liabilities.current.lines
      .filter((l) => l.label === "Accounts payable")
      .reduce((a, l) => a + l.amountCents, 0),
    totalAssetsCents: balanceSheet.assets.totalCents,
    totalLiabilitiesCents: balanceSheet.liabilities.totalCents,
    totalEquityCents: balanceSheet.equity.totalCents,
  };

  const writes = [
    prisma.financialReport.create({
      data: {
        organizationId,
        type: "pnl",
        period,
        periodStart,
        periodEnd,
        generatedBy,
        ...baseHeadline,
        data: pnl as any,
        narrative: null,
        anomalies: [] as any,
      },
    }),
    prisma.financialReport.create({
      data: {
        organizationId,
        type: "cash_flow",
        period,
        periodStart,
        periodEnd,
        generatedBy,
        ...baseHeadline,
        data: cashFlow as any,
        narrative: null,
        anomalies: [] as any,
      },
    }),
    prisma.financialReport.create({
      data: {
        organizationId,
        type: "balance_sheet",
        period,
        periodStart,
        periodEnd,
        generatedBy,
        ...baseHeadline,
        data: balanceSheet as any,
        narrative: null,
        anomalies: [] as any,
      },
    }),
    prisma.financialReport.create({
      data: {
        organizationId,
        type: "kpi_dashboard",
        period,
        periodStart,
        periodEnd,
        generatedBy,
        ...baseHeadline,
        data: { kpis: report.kpis, weeklySeries: report.weeklySeries, monthlySeries: report.monthlySeries } as any,
        narrative: null,
        anomalies: [] as any,
      },
    }),
    prisma.financialReport.create({
      data: {
        organizationId,
        type: "cfo_briefing",
        period,
        periodStart,
        periodEnd,
        generatedBy,
        ...baseHeadline,
        data: report as any,
        narrative,
        anomalies: anomalies as any,
      },
    }),
  ];

  return Promise.all(writes);
}

/** Fetch the most recent CFO briefing for an org (returns null if none). */
export async function getLatestCfoBriefing(organizationId: string) {
  return prisma.financialReport.findFirst({
    where: { organizationId, type: "cfo_briefing" },
    orderBy: { generatedAt: "desc" },
  });
}

export async function getLatestReport(organizationId: string, type: "pnl" | "cash_flow" | "balance_sheet" | "kpi_dashboard" | "cfo_briefing") {
  return prisma.financialReport.findFirst({
    where: { organizationId, type },
    orderBy: { generatedAt: "desc" },
  });
}

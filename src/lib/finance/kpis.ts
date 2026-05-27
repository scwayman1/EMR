import { prisma } from "@/lib/db/prisma";
import type { PnlReport } from "./pnl";
import type { CashFlowReport } from "./cash-flow";
import type { BalanceSheet } from "./balance-sheet";
import type { DateRange } from "./period";

// ---------------------------------------------------------------------------
// Cross-statement KPI dashboard. Pulls the headline metrics every CFO needs
// to read at a glance, with comparisons to prior period and operator-defined
// goals.
// ---------------------------------------------------------------------------

export type Trend = "up" | "down" | "flat";

export interface KpiCard {
  id: string;
  label: string;
  valueCents?: number; // for $-denominated KPIs
  valueNumber?: number; // for ratios, days, %
  unit: "cents" | "days" | "pct" | "ratio" | "count";
  prior?: number;
  changeAbs?: number;
  changePct?: number | null;
  trend: Trend;
  /** "good" if the change moved toward the goal; "bad" if away. */
  trendIsGood: boolean | null;
  goalValue?: number | null;
  goalMet?: boolean | null;
  description?: string;
}

interface KpiInputs {
  pnl: PnlReport;
  priorPnl?: PnlReport;
  cashFlow: CashFlowReport;
  priorCashFlow?: CashFlowReport;
  balanceSheet: BalanceSheet;
}

function changeFor(current: number, prior: number | undefined) {
  if (prior === undefined) return { changeAbs: undefined, changePct: undefined };
  const changeAbs = current - prior;
  const changePct = prior !== 0 ? Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10 : null;
  return { changeAbs, changePct };
}

function trendOf(changeAbs: number | undefined, biggerIsBetter: boolean): { trend: Trend; trendIsGood: boolean | null } {
  if (changeAbs === undefined || Math.abs(changeAbs) < 0.0001) return { trend: "flat", trendIsGood: null };
  const up = changeAbs > 0;
  return { trend: up ? "up" : "down", trendIsGood: up === biggerIsBetter };
}

export function buildKpis(inputs: KpiInputs): KpiCard[] {
  const { pnl, priorPnl, cashFlow, priorCashFlow, balanceSheet } = inputs;
  const cards: KpiCard[] = [];

  // Revenue
  {
    const v = pnl.totals.revenueCents;
    const p = priorPnl?.totals.revenueCents;
    const { changeAbs, changePct } = changeFor(v, p);
    cards.push({
      id: "revenue",
      label: "Revenue",
      valueCents: v,
      unit: "cents",
      prior: p,
      changeAbs,
      changePct,
      ...trendOf(changeAbs, true),
      goalValue: null,
      description: "Service + product revenue collected in the period.",
    });
  }
  // Gross margin
  {
    const v = pnl.totals.grossMarginPct;
    const p = priorPnl?.totals.grossMarginPct;
    const { changeAbs, changePct } = changeFor(v, p);
    cards.push({
      id: "gross_margin",
      label: "Gross margin",
      valueNumber: v,
      unit: "pct",
      prior: p,
      changeAbs,
      changePct,
      ...trendOf(changeAbs, true),
      description: "(Revenue − COGS) ÷ Revenue.",
    });
  }
  // EBITDA
  {
    const v = pnl.totals.ebitdaCents;
    const p = priorPnl?.totals.ebitdaCents;
    const { changeAbs, changePct } = changeFor(v, p);
    cards.push({
      id: "ebitda",
      label: "EBITDA",
      valueCents: v,
      unit: "cents",
      prior: p,
      changeAbs,
      changePct,
      ...trendOf(changeAbs, true),
      description: "Earnings before interest, tax, depreciation & amortization.",
    });
  }
  // Net income
  {
    const v = pnl.totals.netIncomeCents;
    const p = priorPnl?.totals.netIncomeCents;
    const { changeAbs, changePct } = changeFor(v, p);
    cards.push({
      id: "net_income",
      label: "Net income",
      valueCents: v,
      unit: "cents",
      prior: p,
      changeAbs,
      changePct,
      ...trendOf(changeAbs, true),
      description: "Bottom line after all expenses, depreciation, interest & tax.",
    });
  }
  // Cash on hand
  cards.push({
    id: "cash",
    label: "Cash on hand",
    valueCents: cashFlow.closingCashCents,
    unit: "cents",
    trend: "flat",
    trendIsGood: null,
    description: "Sum of all checking, savings, merchant, and reserve accounts.",
  });
  // Operating cash flow
  {
    const v = cashFlow.netOperatingCents;
    const p = priorCashFlow?.netOperatingCents;
    const { changeAbs, changePct } = changeFor(v, p);
    cards.push({
      id: "operating_cf",
      label: "Operating cash flow",
      valueCents: v,
      unit: "cents",
      prior: p,
      changeAbs,
      changePct,
      ...trendOf(changeAbs, true),
      description: "Net cash from operating activities in the period.",
    });
  }
  // Burn / runway
  cards.push({
    id: "burn",
    label: "Daily burn rate",
    valueCents: cashFlow.burnRateCentsPerDay,
    unit: "cents",
    trend: "flat",
    trendIsGood: null,
    description: "Net operating cash outflow ÷ days in period.",
  });
  if (cashFlow.runwayDays !== null) {
    cards.push({
      id: "runway",
      label: "Runway",
      valueNumber: cashFlow.runwayDays,
      unit: "days",
      trend: "flat",
      trendIsGood: null,
      description: "Days of cash before zero at current burn.",
    });
  }
  // Working capital
  cards.push({
    id: "working_capital",
    label: "Working capital",
    valueCents: balanceSheet.ratios.workingCapitalCents,
    unit: "cents",
    trend: "flat",
    trendIsGood: null,
    description: "Current assets − current liabilities.",
  });
  // Current ratio
  cards.push({
    id: "current_ratio",
    label: "Current ratio",
    valueNumber: balanceSheet.ratios.currentRatio,
    unit: "ratio",
    trend: "flat",
    trendIsGood: null,
    description: "≥ 2.0 is healthy short-term liquidity.",
  });
  // Debt-to-equity
  cards.push({
    id: "debt_to_equity",
    label: "Debt / equity",
    valueNumber: balanceSheet.ratios.debtToEquity,
    unit: "ratio",
    trend: "flat",
    trendIsGood: null,
    description: "Lower = lower leverage risk.",
  });

  return cards;
}

/** Apply operator goals on top of a KPI list, populating goalMet flags. */
export async function applyGoals(organizationId: string, cards: KpiCard[]): Promise<KpiCard[]> {
  const goals = await prisma.financialGoal.findMany({
    where: { organizationId, active: true },
  });
  if (goals.length === 0) return cards;

  const byId = new Map(cards.map((c) => [c.id, c]));
  for (const g of goals) {
    let cardId: string | null = null;
    let goalValue: number | null = null;
    switch (g.kind) {
      case "revenue_target":
        cardId = "revenue";
        goalValue = g.targetCents ?? null;
        break;
      case "gross_margin_target":
        cardId = "gross_margin";
        goalValue = g.targetPct ?? null;
        break;
      case "ebitda_target":
        cardId = "ebitda";
        goalValue = g.targetCents ?? null;
        break;
      case "cash_runway_min":
        cardId = "runway";
        goalValue = g.targetDays ?? null;
        break;
      default:
        continue;
    }
    if (!cardId || goalValue === null) continue;
    const c = byId.get(cardId);
    if (!c) continue;
    const v = c.valueCents ?? c.valueNumber ?? 0;
    c.goalValue = goalValue;
    c.goalMet = g.kind === "cash_runway_min" ? v >= goalValue : v >= goalValue;
  }
  return cards;
}

export interface RangeSeriesPoint {
  label: string;
  start: Date;
  end: Date;
  revenueCents: number;
  cogsCents: number;
  opexCents: number;
  ebitdaCents: number;
  netIncomeCents: number;
}

/** Build a multi-period revenue/profit series for sparklines & trend charts. */
export async function buildSeries(
  organizationId: string,
  ranges: DateRange[],
): Promise<RangeSeriesPoint[]> {
  const { buildPnl } = await import("./pnl");
  const reports = await Promise.all(ranges.map((r) => buildPnl(organizationId, r)));
  return reports.map((r, i) => ({
    label: ranges[i].label,
    start: r.range.start,
    end: r.range.end,
    revenueCents: r.totals.revenueCents,
    cogsCents: r.totals.cogsCents,
    opexCents: r.totals.opexCents,
    ebitdaCents: r.totals.ebitdaCents,
    netIncomeCents: r.totals.netIncomeCents,
  }));
}

import type { PnlReport } from "./pnl";
import type { CashFlowReport } from "./cash-flow";
import type { BalanceSheet } from "./balance-sheet";

// ---------------------------------------------------------------------------
// Anomaly detection — catches the issues a controller would normally flag in
// a Monday morning meeting. Each anomaly has a severity, a one-line message,
// and an optional recommendation.
// ---------------------------------------------------------------------------

export type AnomalySeverity = "info" | "warn" | "critical";

export interface Anomaly {
  id: string;
  severity: AnomalySeverity;
  category: "revenue" | "expense" | "cash" | "balance_sheet" | "ratio" | "trend";
  message: string;
  recommendation?: string;
  metric?: { label: string; valueCents?: number; valueNumber?: number };
}

interface DetectInputs {
  pnl: PnlReport;
  priorPnl?: PnlReport;
  cashFlow: CashFlowReport;
  priorCashFlow?: CashFlowReport;
  balanceSheet: BalanceSheet;
}

function pctChange(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10;
}

export function detectAnomalies({ pnl, priorPnl, cashFlow, priorCashFlow, balanceSheet }: DetectInputs): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // ── Revenue trend ───────────────────────────────────────────
  if (priorPnl) {
    const ch = pctChange(pnl.totals.revenueCents, priorPnl.totals.revenueCents);
    if (ch !== null && ch <= -15) {
      anomalies.push({
        id: "revenue_drop",
        severity: ch <= -30 ? "critical" : "warn",
        category: "revenue",
        message: `Revenue down ${Math.abs(ch)}% vs. prior period.`,
        recommendation: "Pull the daily charge log and check if any provider stopped seeing patients or a payer halted payments.",
        metric: { label: "Revenue Δ%", valueNumber: ch },
      });
    }
    if (ch !== null && ch >= 30) {
      anomalies.push({
        id: "revenue_surge",
        severity: "info",
        category: "revenue",
        message: `Revenue up ${ch}% vs. prior period — confirm it's organic, not a one-time payer batch.`,
        metric: { label: "Revenue Δ%", valueNumber: ch },
      });
    }
  }

  // ── Margin compression ─────────────────────────────────────
  if (pnl.totals.grossMarginPct < 50 && pnl.totals.revenueCents > 0) {
    anomalies.push({
      id: "thin_gross_margin",
      severity: pnl.totals.grossMarginPct < 30 ? "critical" : "warn",
      category: "expense",
      message: `Gross margin is ${pnl.totals.grossMarginPct}%. Cannabis-care benchmarks run 60-80%.`,
      recommendation: "Check inventory cost recognition and lab fee allocation; one mis-categorized expense often explains it.",
      metric: { label: "Gross margin", valueNumber: pnl.totals.grossMarginPct },
    });
  }
  if (priorPnl) {
    const ch = pnl.totals.grossMarginPct - priorPnl.totals.grossMarginPct;
    if (ch <= -5) {
      anomalies.push({
        id: "margin_compression",
        severity: "warn",
        category: "expense",
        message: `Gross margin compressed ${Math.abs(ch).toFixed(1)} pts vs. prior period (${pnl.totals.grossMarginPct}% from ${priorPnl.totals.grossMarginPct}%).`,
        recommendation: "Run a COGS variance: did inventory pricing change or did product mix shift toward lower-margin SKUs?",
      });
    }
  }

  // ── Net loss ────────────────────────────────────────────────
  if (pnl.totals.netIncomeCents < 0) {
    anomalies.push({
      id: "net_loss",
      severity: "warn",
      category: "trend",
      message: `Net loss of $${(Math.abs(pnl.totals.netIncomeCents) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} this period.`,
      recommendation: "If recurring, model the path back to profitability — either revenue +X% or cost cuts in the largest opex line.",
    });
  }

  // ── Operating cash burn ─────────────────────────────────────
  if (cashFlow.netOperatingCents < 0) {
    anomalies.push({
      id: "operating_cash_burn",
      severity: cashFlow.runwayDays !== null && cashFlow.runwayDays < 90 ? "critical" : "warn",
      category: "cash",
      message: `Operating activities consumed $${(Math.abs(cashFlow.netOperatingCents) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} this period.`,
      recommendation:
        cashFlow.runwayDays !== null && cashFlow.runwayDays < 90
          ? `Runway is ${cashFlow.runwayDays} days at current burn — raise capital, accelerate collections, or cut OpEx now.`
          : "Walk every line item over $5K — small leaks add up.",
    });
  }

  // ── Liquidity ratios ───────────────────────────────────────
  if (balanceSheet.ratios.currentRatio > 0 && balanceSheet.ratios.currentRatio < 1) {
    anomalies.push({
      id: "current_ratio_low",
      severity: "critical",
      category: "ratio",
      message: `Current ratio ${balanceSheet.ratios.currentRatio} — current liabilities exceed current assets.`,
      recommendation: "Roll AP, draw on the line of credit, or accelerate AR. The practice is technically illiquid.",
      metric: { label: "Current ratio", valueNumber: balanceSheet.ratios.currentRatio },
    });
  } else if (balanceSheet.ratios.currentRatio > 0 && balanceSheet.ratios.currentRatio < 1.5) {
    anomalies.push({
      id: "current_ratio_tight",
      severity: "warn",
      category: "ratio",
      message: `Current ratio ${balanceSheet.ratios.currentRatio} is below the 2.0 healthy benchmark.`,
      metric: { label: "Current ratio", valueNumber: balanceSheet.ratios.currentRatio },
    });
  }

  // ── Negative working capital ────────────────────────────────
  if (balanceSheet.ratios.workingCapitalCents < 0) {
    anomalies.push({
      id: "negative_working_capital",
      severity: "critical",
      category: "balance_sheet",
      message: `Working capital is negative $${(Math.abs(balanceSheet.ratios.workingCapitalCents) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}.`,
      recommendation: "Restructure short-term debt or push capital contributions before next payroll.",
    });
  }

  // ── A/R concentration ──────────────────────────────────────
  const arLine = balanceSheet.assets.current.lines.find((l) => l.label === "Insurance receivables");
  const arCents = arLine?.amountCents ?? 0;
  const revenueCents = pnl.totals.revenueCents;
  if (revenueCents > 0 && arCents > revenueCents * 4) {
    anomalies.push({
      id: "ar_buildup",
      severity: "warn",
      category: "balance_sheet",
      message: `Insurance A/R is more than 4× weekly revenue. Collections are stalling.`,
      recommendation: "Run the aging agent and prioritize the 60-90 day bucket today.",
    });
  }

  // ── Concentration / single-line spend ──────────────────────
  for (const line of pnl.sections.operatingExpenses.lines) {
    if (revenueCents > 0 && line.amountCents > revenueCents * 0.5) {
      anomalies.push({
        id: `opex_concentration_${line.group}`,
        severity: "warn",
        category: "expense",
        message: `${line.label} is ${Math.round((line.amountCents / revenueCents) * 100)}% of revenue.`,
        recommendation: `Re-baseline ${line.label.toLowerCase()} — anything north of 40% of revenue deserves a quarterly review.`,
      });
    }
  }

  // ── Cash collection rate ───────────────────────────────────
  if (pnl.memo.chargesBilledCents > 0 && pnl.memo.chargesCollectedRatePct < 50) {
    anomalies.push({
      id: "low_collection_rate",
      severity: "warn",
      category: "revenue",
      message: `Collected only ${pnl.memo.chargesCollectedRatePct}% of charges billed this period.`,
      recommendation: "Most of the gap is timing — confirm payments aren't sitting in the clearinghouse.",
    });
  }

  // Sort: critical first, then warn, then info
  const order = { critical: 0, warn: 1, info: 2 } as const;
  anomalies.sort((a, b) => order[a.severity] - order[b.severity]);

  return anomalies;
}

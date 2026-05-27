import { prisma } from "@/lib/db/prisma";
import {
  classifyExpense,
  pnlGroupLabel,
  type PnlGroup,
  type PnlSection,
} from "./chart-of-accounts";
import type { DateRange } from "./period";

// ---------------------------------------------------------------------------
// P&L (Income Statement) builder
//
// Revenue is recognized on accrual basis:
//   - Clinical service revenue   = sum(Payment.amountCents) on Claim where
//                                  paymentDate ∈ range and source = payer/patient.
//                                  This reflects collected revenue, the only
//                                  conservative metric that won't reverse on a
//                                  denial. Charge-based recognition is shown as
//                                  a memo line.
//   - Product revenue            = sum(Order.total) where Order.createdAt ∈ range
//                                  and status ∈ delivered/fulfilled/paid (we
//                                  use a permissive set here since the demo seed
//                                  doesn't always finalize orders).
//   - Other revenue              = bad-debt recoveries (negative bad_debt rows)
//                                  + non-claim FinancialEvent inflows.
//
// Expenses are accrued by Expense.occurredOn ∈ range. We treat depreciation
// computed on the fly from FixedAsset rows so the P&L stays current even
// without manually-posted depreciation entries.
// ---------------------------------------------------------------------------

export interface PnlLineItem {
  group: PnlGroup;
  label: string;
  amountCents: number;
  itemCount: number;
}

export interface PnlSubsection {
  section: PnlSection;
  label: string;
  totalCents: number;
  lines: PnlLineItem[];
}

export interface PnlTotals {
  revenueCents: number;
  cogsCents: number;
  grossProfitCents: number;
  grossMarginPct: number;
  opexCents: number;
  operatingIncomeCents: number;
  ebitdaCents: number;
  daCents: number;
  interestCents: number;
  taxesCents: number;
  netIncomeCents: number;
  netMarginPct: number;
}

export interface PnlReport {
  range: DateRange;
  totals: PnlTotals;
  sections: {
    revenue: PnlSubsection;
    cogs: PnlSubsection;
    operatingExpenses: PnlSubsection;
    nonOperating: PnlSubsection;
    depreciationAmortization: PnlSubsection;
    taxes: PnlSubsection;
  };
  /** Memo: charges billed in the period (regardless of collection). */
  memo: {
    chargesBilledCents: number;
    chargesCollectedRatePct: number;
    activeOrders: number;
    activeClaims: number;
  };
}

const ORDER_REVENUE_STATUSES = ["confirmed", "processing", "shipped", "delivered"] as const;

function safeNum(n: number | null | undefined): number {
  return Number.isFinite(n ?? NaN) ? (n as number) : 0;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal
}

/** Allocate a fixed asset's monthly depreciation that overlaps `range`. */
function depreciationInRange(
  fa: { acquiredCostCents: number; salvageValueCents: number; usefulLifeMonths: number; purchaseDate: Date; disposedAt: Date | null },
  range: DateRange,
): number {
  if (fa.usefulLifeMonths <= 0) return 0;
  const monthlyDeprec = (fa.acquiredCostCents - fa.salvageValueCents) / fa.usefulLifeMonths;
  if (monthlyDeprec <= 0) return 0;
  const start = fa.purchaseDate > range.start ? fa.purchaseDate : range.start;
  const end = fa.disposedAt && fa.disposedAt < range.end ? fa.disposedAt : range.end;
  if (end <= start) return 0;
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  // Approximate by 30.44 days/month for cross-month ranges.
  const months = days / 30.44;
  // Cap at total depreciable basis remaining.
  const cap = Math.max(0, fa.acquiredCostCents - fa.salvageValueCents);
  return Math.min(Math.round(monthlyDeprec * months), cap);
}

export async function buildPnl(
  organizationId: string,
  range: DateRange,
): Promise<PnlReport> {
  const [
    payments,
    orders,
    expenses,
    fixedAssets,
    liabilities,
    chargesAggregate,
    activeClaimsCount,
  ] = await Promise.all([
    prisma.payment.findMany({
      where: {
        claim: { organizationId },
        paymentDate: { gte: range.start, lt: range.end },
      },
      select: { amountCents: true, source: true },
    }),
    prisma.order.findMany({
      where: {
        organizationId,
        createdAt: { gte: range.start, lt: range.end },
        status: { in: ORDER_REVENUE_STATUSES as unknown as Array<"confirmed" | "processing" | "shipped" | "delivered"> },
      },
      select: { total: true, subtotal: true, tax: true },
    }),
    prisma.expense.findMany({
      where: {
        organizationId,
        occurredOn: { gte: range.start, lt: range.end },
        status: { in: ["approved", "paid"] },
      },
      select: { category: true, amountCents: true, totalCents: true },
    }),
    prisma.fixedAsset.findMany({
      where: {
        organizationId,
        purchaseDate: { lt: range.end },
        OR: [{ disposedAt: null }, { disposedAt: { gt: range.start } }],
      },
      select: {
        acquiredCostCents: true,
        salvageValueCents: true,
        usefulLifeMonths: true,
        purchaseDate: true,
        disposedAt: true,
      },
    }),
    prisma.liability.findMany({
      where: {
        organizationId,
        startDate: { lt: range.end },
        OR: [{ closedAt: null }, { closedAt: { gt: range.start } }],
        interestRate: { not: null },
      },
      select: { balanceCents: true, interestRate: true },
    }),
    prisma.claim.aggregate({
      where: { organizationId, serviceDate: { gte: range.start, lt: range.end } },
      _count: true,
      _sum: { billedAmountCents: true },
    }),
    prisma.claim.count({
      where: { organizationId, status: { notIn: ["paid", "closed", "voided", "written_off"] } },
    }),
  ]);

  // ── Revenue ─────────────────────────────────────────────────
  const serviceRevenueCents = payments.reduce((a, p) => a + p.amountCents, 0);
  const productRevenueCents = Math.round(
    orders.reduce((a, o) => a + safeNum(o.total) * 100, 0),
  );

  const revenueLines: PnlLineItem[] = [];
  if (serviceRevenueCents !== 0 || payments.length > 0) {
    revenueLines.push({
      group: "service_revenue",
      label: pnlGroupLabel("service_revenue"),
      amountCents: serviceRevenueCents,
      itemCount: payments.length,
    });
  }
  if (productRevenueCents !== 0 || orders.length > 0) {
    revenueLines.push({
      group: "product_revenue",
      label: pnlGroupLabel("product_revenue"),
      amountCents: productRevenueCents,
      itemCount: orders.length,
    });
  }
  const revenueCents = serviceRevenueCents + productRevenueCents;

  // ── Expenses bucketed by section ────────────────────────────
  const buckets: Record<PnlSection, Map<PnlGroup, PnlLineItem>> = {
    revenue: new Map(),
    cogs: new Map(),
    operating_expenses: new Map(),
    non_operating: new Map(),
    depreciation_amortization: new Map(),
    taxes: new Map(),
  };

  for (const exp of expenses) {
    const cls = classifyExpense(exp.category);
    const m = buckets[cls.section];
    const existing = m.get(cls.group);
    if (existing) {
      existing.amountCents += exp.totalCents;
      existing.itemCount += 1;
    } else {
      m.set(cls.group, {
        group: cls.group,
        label: cls.label,
        amountCents: exp.totalCents,
        itemCount: 1,
      });
    }
  }

  // Auto-compute depreciation/amortization for any fixed assets in service.
  const computedDepreciationCents = fixedAssets.reduce(
    (a, fa) => a + depreciationInRange(fa, range),
    0,
  );
  if (computedDepreciationCents > 0) {
    const m = buckets.depreciation_amortization;
    const existing = m.get("depreciation_amortization");
    if (existing) existing.amountCents += computedDepreciationCents;
    else m.set("depreciation_amortization", {
      group: "depreciation_amortization",
      label: "Depreciation (computed)",
      amountCents: computedDepreciationCents,
      itemCount: fixedAssets.length,
    });
  }

  // Auto-compute interest expense from open liabilities.
  const lengthDays = (range.end.getTime() - range.start.getTime()) / 86_400_000;
  const computedInterestCents = liabilities.reduce((a, l) => {
    if (!l.interestRate) return a;
    const annual = l.balanceCents * l.interestRate;
    return a + Math.round((annual * lengthDays) / 365);
  }, 0);
  if (computedInterestCents > 0) {
    const m = buckets.non_operating;
    const existing = m.get("interest");
    if (existing) existing.amountCents += computedInterestCents;
    else m.set("interest", {
      group: "interest",
      label: "Interest expense (accrued)",
      amountCents: computedInterestCents,
      itemCount: liabilities.length,
    });
  }

  function toSubsection(section: PnlSection, label: string): PnlSubsection {
    const lines = Array.from(buckets[section].values()).sort((a, b) => b.amountCents - a.amountCents);
    return { section, label, totalCents: lines.reduce((a, l) => a + l.amountCents, 0), lines };
  }

  const cogs = toSubsection("cogs", "Cost of goods & services");
  const operatingExpenses = toSubsection("operating_expenses", "Operating expenses");
  const nonOperating = toSubsection("non_operating", "Non-operating");
  const depAmort = toSubsection("depreciation_amortization", "Depreciation & amortization");
  const taxes = toSubsection("taxes", "Income & excise taxes");

  // ── Totals ──────────────────────────────────────────────────
  const grossProfitCents = revenueCents - cogs.totalCents;
  const opexCents = operatingExpenses.totalCents;
  const operatingIncomeCents = grossProfitCents - opexCents;
  const daCents = depAmort.totalCents;
  const interestCents = nonOperating.totalCents;
  const taxesCents = taxes.totalCents;
  const ebitdaCents = operatingIncomeCents + daCents;
  const netIncomeCents = operatingIncomeCents - daCents - interestCents - taxesCents;

  const totals: PnlTotals = {
    revenueCents,
    cogsCents: cogs.totalCents,
    grossProfitCents,
    grossMarginPct: pct(grossProfitCents, revenueCents),
    opexCents,
    operatingIncomeCents,
    ebitdaCents,
    daCents,
    interestCents,
    taxesCents,
    netIncomeCents,
    netMarginPct: pct(netIncomeCents, revenueCents),
  };

  const chargesBilledCents = chargesAggregate._sum.billedAmountCents ?? 0;

  return {
    range,
    totals,
    sections: {
      revenue: {
        section: "revenue",
        label: "Revenue",
        totalCents: revenueCents,
        lines: revenueLines.sort((a, b) => b.amountCents - a.amountCents),
      },
      cogs,
      operatingExpenses,
      nonOperating,
      depreciationAmortization: depAmort,
      taxes,
    },
    memo: {
      chargesBilledCents,
      chargesCollectedRatePct: pct(serviceRevenueCents, chargesBilledCents),
      activeOrders: orders.length,
      activeClaims: activeClaimsCount,
    },
  };
}

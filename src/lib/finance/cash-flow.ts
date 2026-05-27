import { prisma } from "@/lib/db/prisma";
import { classifyExpense } from "./chart-of-accounts";
import type { DateRange } from "./period";

// ---------------------------------------------------------------------------
// Cash Flow Statement (direct method).
//
// Sources of cash IN, by activity:
//   Operating  — patient payments, payer payments, product orders, refunds-in
//   Investing  — proceeds from disposing fixed assets
//   Financing  — owner capital contributions, loan draws
//
// Sources of cash OUT, by activity:
//   Operating  — Expenses with paidAt ∈ range AND mapped to operating section
//   Investing  — fixed asset purchases (capitalized; from FixedAsset rows)
//   Financing  — loan principal payments, owner distributions, interest
//
// Logged CashFlowEntry rows take precedence (explicit), and we synthesize
// entries from the other tables when they aren't already represented.
// ---------------------------------------------------------------------------

export interface CashFlowLine {
  label: string;
  amountCents: number; // signed: + = cash IN, - = cash OUT
  count: number;
}

export interface CashFlowSection {
  activity: "operating" | "investing" | "financing";
  label: string;
  inflows: CashFlowLine[];
  outflows: CashFlowLine[];
  netCents: number;
}

export interface CashFlowReport {
  range: DateRange;
  openingCashCents: number;
  closingCashCents: number;
  netChangeCents: number;
  netOperatingCents: number;
  netInvestingCents: number;
  netFinancingCents: number;
  burnRateCentsPerDay: number;
  runwayDays: number | null;
  sections: {
    operating: CashFlowSection;
    investing: CashFlowSection;
    financing: CashFlowSection;
  };
}

function add(map: Map<string, CashFlowLine>, label: string, amount: number) {
  const cur = map.get(label);
  if (cur) {
    cur.amountCents += amount;
    cur.count += 1;
  } else {
    map.set(label, { label, amountCents: amount, count: 1 });
  }
}

function sectionFromMaps(
  activity: CashFlowSection["activity"],
  inflows: Map<string, CashFlowLine>,
  outflows: Map<string, CashFlowLine>,
): CashFlowSection {
  const inflowsArr = Array.from(inflows.values()).filter((l) => l.amountCents !== 0).sort((a, b) => b.amountCents - a.amountCents);
  const outflowsArr = Array.from(outflows.values()).filter((l) => l.amountCents !== 0).sort((a, b) => a.amountCents - b.amountCents);
  const netCents =
    inflowsArr.reduce((a, l) => a + l.amountCents, 0) +
    outflowsArr.reduce((a, l) => a + l.amountCents, 0);
  return {
    activity,
    label:
      activity === "operating"
        ? "Operating activities"
        : activity === "investing"
          ? "Investing activities"
          : "Financing activities",
    inflows: inflowsArr,
    outflows: outflowsArr,
    netCents,
  };
}

export async function buildCashFlow(
  organizationId: string,
  range: DateRange,
): Promise<CashFlowReport> {
  const [bankAccounts, payments, orders, expenses, equity, fixedAssetsBought, fixedAssetsSold, liabilityDraws, liabilityPayments] = await Promise.all([
    prisma.bankAccount.findMany({ where: { organizationId, isActive: true } }),
    prisma.payment.findMany({
      where: { claim: { organizationId }, paymentDate: { gte: range.start, lt: range.end } },
      select: { amountCents: true, source: true },
    }),
    prisma.order.findMany({
      where: {
        organizationId,
        createdAt: { gte: range.start, lt: range.end },
        status: { in: ["confirmed", "processing", "shipped", "delivered"] },
      },
      select: { total: true },
    }),
    prisma.expense.findMany({
      where: { organizationId, paidAt: { gte: range.start, lt: range.end } },
      select: { category: true, totalCents: true, vendor: true },
    }),
    prisma.equityEntry.findMany({
      where: { organizationId, occurredOn: { gte: range.start, lt: range.end } },
      select: { type: true, amountCents: true, ownerName: true },
    }),
    prisma.fixedAsset.findMany({
      where: { organizationId, purchaseDate: { gte: range.start, lt: range.end } },
      select: { name: true, acquiredCostCents: true, category: true },
    }),
    prisma.fixedAsset.findMany({
      where: { organizationId, disposedAt: { gte: range.start, lt: range.end } },
      select: { name: true, disposalProceedsCents: true },
    }),
    // Loans started in range = financing inflow
    prisma.liability.findMany({
      where: { organizationId, startDate: { gte: range.start, lt: range.end } },
      select: { name: true, principalCents: true, type: true },
    }),
    // Logged manual financing outflows (loan principal payments, etc.)
    prisma.cashFlowEntry.findMany({
      where: {
        organizationId,
        activity: "financing",
        direction: "out",
        occurredOn: { gte: range.start, lt: range.end },
      },
      select: { description: true, amountCents: true, liabilityId: true },
    }),
  ]);

  // ── Opening / closing cash ──────────────────────────────────
  const cashAccounts = bankAccounts.filter(
    (b) => b.type === "checking" || b.type === "savings" || b.type === "merchant" || b.type === "payroll" || b.type === "reserves",
  );
  const closingCashCents = cashAccounts.reduce((a, b) => a + b.currentBalanceCents, 0);

  // ── Operating ───────────────────────────────────────────────
  const opIn = new Map<string, CashFlowLine>();
  const opOut = new Map<string, CashFlowLine>();

  const payerPayments = payments.filter((p) => p.source !== "patient").reduce((a, p) => a + p.amountCents, 0);
  const patientPayments = payments.filter((p) => p.source === "patient").reduce((a, p) => a + p.amountCents, 0);
  if (payerPayments !== 0) add(opIn, "Insurance payer remits", payerPayments);
  if (patientPayments !== 0) add(opIn, "Patient payments", patientPayments);

  const orderRevenueCents = Math.round(orders.reduce((a, o) => a + Number(o.total) * 100, 0));
  if (orderRevenueCents !== 0) add(opIn, "Marketplace orders", orderRevenueCents);

  for (const exp of expenses) {
    const cls = classifyExpense(exp.category);
    if (cls.section === "operating_expenses" || cls.section === "cogs") {
      add(opOut, cls.label, -exp.totalCents);
    } else if (cls.section === "non_operating") {
      // interest goes to financing
    } else if (cls.section === "taxes") {
      // taxes treated as operating outflow under direct method
      add(opOut, cls.label, -exp.totalCents);
    }
  }

  // ── Investing ───────────────────────────────────────────────
  const invIn = new Map<string, CashFlowLine>();
  const invOut = new Map<string, CashFlowLine>();
  const fixedAssetSpend = fixedAssetsBought.reduce((a, fa) => a + fa.acquiredCostCents, 0);
  if (fixedAssetSpend > 0) add(invOut, "Capital expenditures", -fixedAssetSpend);
  const fixedAssetProceeds = fixedAssetsSold.reduce((a, fa) => a + (fa.disposalProceedsCents ?? 0), 0);
  if (fixedAssetProceeds > 0) add(invIn, "Asset disposals", fixedAssetProceeds);

  // ── Financing ───────────────────────────────────────────────
  const finIn = new Map<string, CashFlowLine>();
  const finOut = new Map<string, CashFlowLine>();

  for (const e of equity) {
    if (e.type === "capital_contribution" || e.type === "stock_issuance") {
      add(finIn, e.type === "capital_contribution" ? "Owner capital contributions" : "Stock issuance", Math.abs(e.amountCents));
    } else if (e.type === "distribution" || e.type === "stock_buyback") {
      add(finOut, e.type === "distribution" ? "Owner distributions" : "Stock buybacks", -Math.abs(e.amountCents));
    }
  }
  const loanDraws = liabilityDraws.reduce((a, l) => a + l.principalCents, 0);
  if (loanDraws > 0) add(finIn, "Loan & credit draws", loanDraws);
  for (const p of liabilityPayments) add(finOut, p.description, -p.amountCents);

  // Interest expenses paid out (already handled accrual in P&L; cash treats as financing or operating)
  const interestExpenses = expenses.filter((e) => classifyExpense(e.category).group === "interest");
  for (const ie of interestExpenses) add(finOut, "Interest & financing fees", -ie.totalCents);

  const operating = sectionFromMaps("operating", opIn, opOut);
  const investing = sectionFromMaps("investing", invIn, invOut);
  const financing = sectionFromMaps("financing", finIn, finOut);

  const netChangeCents = operating.netCents + investing.netCents + financing.netCents;
  const openingCashCents = closingCashCents - netChangeCents;

  // Burn / runway: based on net operating outflow only (the durable burn).
  const lengthDays = Math.max(1, (range.end.getTime() - range.start.getTime()) / 86_400_000);
  const burnRateCentsPerDay = operating.netCents < 0 ? Math.round(Math.abs(operating.netCents) / lengthDays) : 0;
  const runwayDays =
    burnRateCentsPerDay > 0 && closingCashCents > 0
      ? Math.floor(closingCashCents / burnRateCentsPerDay)
      : null;

  return {
    range,
    openingCashCents,
    closingCashCents,
    netChangeCents,
    netOperatingCents: operating.netCents,
    netInvestingCents: investing.netCents,
    netFinancingCents: financing.netCents,
    burnRateCentsPerDay,
    runwayDays,
    sections: { operating, investing, financing },
  };
}

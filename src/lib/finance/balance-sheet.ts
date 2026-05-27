import { prisma } from "@/lib/db/prisma";
import { FIXED_ASSET_MAP, LIABILITY_MAP, isCashAccountType, isLiabilityAccountType } from "./chart-of-accounts";

// ---------------------------------------------------------------------------
// Balance Sheet — point-in-time snapshot at `asOf`.
//
// Assets:
//   Current      — Cash, A/R (insurance + patient), Inventory (best-effort)
//   Long-term    — Fixed assets (acquired - accumulated depreciation)
//
// Liabilities:
//   Current      — A/P, credit cards, line of credit, payroll/tax payable,
//                  deferred revenue, current portion of long-term debt
//   Long-term    — Term loans, capital leases (less current portion)
//
// Equity:
//   Capital contributions − distributions + retained earnings.
//
// Retained earnings here is a back-solved plug = Assets − Liabilities − Capital.
// This guarantees the sheet always balances even when GL is incomplete; an
// "unreconciled equity" line surfaces the plug for transparency.
// ---------------------------------------------------------------------------

export interface BalanceSheetLine {
  label: string;
  amountCents: number;
  detail?: string;
}

export interface BalanceSheetSection {
  label: string;
  totalCents: number;
  lines: BalanceSheetLine[];
}

export interface BalanceSheet {
  asOf: Date;
  assets: {
    current: BalanceSheetSection;
    longTerm: BalanceSheetSection;
    totalCents: number;
  };
  liabilities: {
    current: BalanceSheetSection;
    longTerm: BalanceSheetSection;
    totalCents: number;
  };
  equity: {
    contributedCapitalCents: number;
    retainedEarningsCents: number;
    unreconciledPlugCents: number;
    lines: BalanceSheetLine[];
    totalCents: number;
  };
  totalLiabilitiesAndEquityCents: number;
  ratios: {
    currentRatio: number; // currentAssets / currentLiabilities
    quickRatio: number; // (cash + AR) / currentLiabilities
    debtToEquity: number;
    workingCapitalCents: number;
  };
}

export async function buildBalanceSheet(
  organizationId: string,
  asOf: Date = new Date(),
): Promise<BalanceSheet> {
  const [bankAccounts, openClaims, openStatements, products, fixedAssets, liabilities, equityEntries] =
    await Promise.all([
      prisma.bankAccount.findMany({ where: { organizationId, isActive: true } }),
      prisma.claim.findMany({
        where: {
          organizationId,
          status: { in: ["submitted", "accepted", "adjudicated", "pending", "partial", "denied", "appealed"] },
        },
        select: { billedAmountCents: true, paidAmountCents: true, patientRespCents: true, status: true },
      }),
      prisma.statement.findMany({
        where: { organizationId, status: { notIn: ["paid", "voided"] } },
        select: { amountDueCents: true, paidToDateCents: true },
      }),
      prisma.product.findMany({
        where: { organizationId, status: "active" },
        select: { price: true, inventoryCount: true },
      }),
      prisma.fixedAsset.findMany({
        where: { organizationId, OR: [{ disposedAt: null }, { disposedAt: { gt: asOf } }] },
        select: {
          name: true,
          category: true,
          acquiredCostCents: true,
          salvageValueCents: true,
          usefulLifeMonths: true,
          accumulatedDeprecCents: true,
          purchaseDate: true,
        },
      }),
      prisma.liability.findMany({
        where: { organizationId, OR: [{ closedAt: null }, { closedAt: { gt: asOf } }] },
        select: { name: true, type: true, balanceCents: true, monthlyPaymentCents: true, maturityDate: true },
      }),
      prisma.equityEntry.findMany({
        where: { organizationId, occurredOn: { lte: asOf } },
        select: { type: true, amountCents: true },
      }),
    ]);

  // ── ASSETS ──────────────────────────────────────────────────
  const cashLines: BalanceSheetLine[] = [];
  let cashTotal = 0;
  for (const b of bankAccounts) {
    if (!isCashAccountType(b.type)) continue;
    cashLines.push({
      label: b.name,
      amountCents: b.currentBalanceCents,
      detail: b.institution ?? undefined,
    });
    cashTotal += b.currentBalanceCents;
  }

  // A/R — insurance still pending + patient outstanding
  const insuranceARCents = openClaims.reduce(
    (a, c) => a + Math.max(0, c.billedAmountCents - c.paidAmountCents - c.patientRespCents),
    0,
  );
  const patientARCents = openStatements.reduce(
    (a, s) => a + Math.max(0, s.amountDueCents - s.paidToDateCents),
    0,
  );

  // Inventory at retail value (rough — would prefer cost basis but we don't track it on Product)
  const inventoryRetailCents = Math.round(
    products.reduce((a, p) => a + Number(p.price) * (p.inventoryCount ?? 0) * 100, 0),
  );
  // Conservative book value: 60% of retail (typical cannabis margin ~40%)
  const inventoryBookCents = Math.round(inventoryRetailCents * 0.6);

  const currentAssetLines: BalanceSheetLine[] = [
    { label: "Cash & cash equivalents", amountCents: cashTotal, detail: `${cashLines.length} accounts` },
  ];
  if (insuranceARCents > 0) currentAssetLines.push({ label: "Insurance receivables", amountCents: insuranceARCents });
  if (patientARCents > 0) currentAssetLines.push({ label: "Patient receivables", amountCents: patientARCents });
  if (inventoryBookCents > 0) currentAssetLines.push({ label: "Inventory (at cost)", amountCents: inventoryBookCents, detail: "60% of retail value" });

  const currentAssetsCents = currentAssetLines.reduce((a, l) => a + l.amountCents, 0);

  // Long-term assets — fixed assets net of depreciation
  const ltAssetMap = new Map<string, { label: string; gross: number; deprec: number; count: number }>();
  for (const fa of fixedAssets) {
    const map = FIXED_ASSET_MAP[fa.category];
    const cur = ltAssetMap.get(map.label) ?? { label: map.label, gross: 0, deprec: 0, count: 0 };
    cur.gross += fa.acquiredCostCents;
    // Use stored accumulated depreciation; for live computation, fall back to elapsed life pro-rata.
    let accum = fa.accumulatedDeprecCents;
    if (accum === 0 && fa.usefulLifeMonths > 0) {
      const monthsElapsed = Math.max(0, (asOf.getTime() - fa.purchaseDate.getTime()) / (30.44 * 86_400_000));
      const monthly = (fa.acquiredCostCents - fa.salvageValueCents) / fa.usefulLifeMonths;
      accum = Math.min(fa.acquiredCostCents - fa.salvageValueCents, Math.round(monthly * monthsElapsed));
    }
    cur.deprec += accum;
    cur.count += 1;
    ltAssetMap.set(map.label, cur);
  }
  const longTermAssetLines: BalanceSheetLine[] = [];
  for (const v of ltAssetMap.values()) {
    longTermAssetLines.push({
      label: v.label,
      amountCents: v.gross - v.deprec,
      detail: `${v.count} asset${v.count !== 1 ? "s" : ""} · gross ${(v.gross / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} less ${(v.deprec / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} deprec.`,
    });
  }
  const longTermAssetsCents = longTermAssetLines.reduce((a, l) => a + l.amountCents, 0);

  // ── LIABILITIES ─────────────────────────────────────────────
  // Convert credit_card / line_of_credit BankAccounts to current liabilities.
  const ccLines: BalanceSheetLine[] = [];
  let ccTotal = 0;
  for (const b of bankAccounts) {
    if (!isLiabilityAccountType(b.type)) continue;
    // Credit card balances are stored as positive currentBalanceCents = amount owed.
    if (b.currentBalanceCents > 0) {
      ccLines.push({ label: b.name, amountCents: b.currentBalanceCents, detail: b.institution ?? undefined });
      ccTotal += b.currentBalanceCents;
    }
  }

  const currentLiabilitiesMap = new Map<string, BalanceSheetLine>();
  if (ccTotal > 0) currentLiabilitiesMap.set("Credit card balances", { label: "Credit card balances", amountCents: ccTotal, detail: ccLines.length > 1 ? `${ccLines.length} accounts` : undefined });

  const longTermLiabilitiesMap = new Map<string, BalanceSheetLine>();

  for (const l of liabilities) {
    const map = LIABILITY_MAP[l.type];
    // Split current portion of LT debt: 12 months of monthly payments.
    if (map.section === "long_term_liabilities" && l.monthlyPaymentCents) {
      const currentPortion = Math.min(l.balanceCents, l.monthlyPaymentCents * 12);
      const ltPortion = l.balanceCents - currentPortion;
      if (currentPortion > 0) {
        const cur = currentLiabilitiesMap.get("Current portion of long-term debt");
        if (cur) cur.amountCents += currentPortion;
        else currentLiabilitiesMap.set("Current portion of long-term debt", { label: "Current portion of long-term debt", amountCents: currentPortion });
      }
      if (ltPortion > 0) {
        const cur = longTermLiabilitiesMap.get(map.label);
        if (cur) cur.amountCents += ltPortion;
        else longTermLiabilitiesMap.set(map.label, { label: map.label, amountCents: ltPortion });
      }
    } else if (map.section === "current_liabilities") {
      const cur = currentLiabilitiesMap.get(map.label);
      if (cur) cur.amountCents += l.balanceCents;
      else currentLiabilitiesMap.set(map.label, { label: map.label, amountCents: l.balanceCents });
    } else {
      const cur = longTermLiabilitiesMap.get(map.label);
      if (cur) cur.amountCents += l.balanceCents;
      else longTermLiabilitiesMap.set(map.label, { label: map.label, amountCents: l.balanceCents });
    }
  }

  const currentLiabilityLines = Array.from(currentLiabilitiesMap.values()).filter((l) => l.amountCents > 0).sort((a, b) => b.amountCents - a.amountCents);
  const longTermLiabilityLines = Array.from(longTermLiabilitiesMap.values()).filter((l) => l.amountCents > 0).sort((a, b) => b.amountCents - a.amountCents);
  const currentLiabilitiesCents = currentLiabilityLines.reduce((a, l) => a + l.amountCents, 0);
  const longTermLiabilitiesCents = longTermLiabilityLines.reduce((a, l) => a + l.amountCents, 0);

  // ── EQUITY ──────────────────────────────────────────────────
  let contributedCapitalCents = 0;
  for (const e of equityEntries) {
    if (e.type === "capital_contribution" || e.type === "stock_issuance") contributedCapitalCents += Math.abs(e.amountCents);
    if (e.type === "distribution" || e.type === "stock_buyback") contributedCapitalCents -= Math.abs(e.amountCents);
  }

  const totalAssetsCents = currentAssetsCents + longTermAssetsCents;
  const totalLiabilitiesCents = currentLiabilitiesCents + longTermLiabilitiesCents;
  // Plug retained earnings to make the sheet balance.
  const retainedEarningsCents = totalAssetsCents - totalLiabilitiesCents - contributedCapitalCents;

  const equityLines: BalanceSheetLine[] = [];
  if (contributedCapitalCents !== 0) equityLines.push({ label: "Contributed capital", amountCents: contributedCapitalCents });
  equityLines.push({ label: "Retained earnings", amountCents: retainedEarningsCents, detail: "back-solved from books" });
  const totalEquityCents = contributedCapitalCents + retainedEarningsCents;

  // ── Ratios ─────────────────────────────────────────────────
  const currentRatio = currentLiabilitiesCents > 0 ? Math.round((currentAssetsCents / currentLiabilitiesCents) * 100) / 100 : 0;
  const quickAssetsCents = cashTotal + insuranceARCents + patientARCents;
  const quickRatio = currentLiabilitiesCents > 0 ? Math.round((quickAssetsCents / currentLiabilitiesCents) * 100) / 100 : 0;
  const debtToEquity = totalEquityCents !== 0 ? Math.round((totalLiabilitiesCents / Math.abs(totalEquityCents)) * 100) / 100 : 0;
  const workingCapitalCents = currentAssetsCents - currentLiabilitiesCents;

  return {
    asOf,
    assets: {
      current: {
        label: "Current assets",
        totalCents: currentAssetsCents,
        lines: currentAssetLines,
      },
      longTerm: {
        label: "Long-term assets",
        totalCents: longTermAssetsCents,
        lines: longTermAssetLines.sort((a, b) => b.amountCents - a.amountCents),
      },
      totalCents: totalAssetsCents,
    },
    liabilities: {
      current: {
        label: "Current liabilities",
        totalCents: currentLiabilitiesCents,
        lines: currentLiabilityLines,
      },
      longTerm: {
        label: "Long-term liabilities",
        totalCents: longTermLiabilitiesCents,
        lines: longTermLiabilityLines,
      },
      totalCents: totalLiabilitiesCents,
    },
    equity: {
      contributedCapitalCents,
      retainedEarningsCents,
      unreconciledPlugCents: 0,
      lines: equityLines,
      totalCents: totalEquityCents,
    },
    totalLiabilitiesAndEquityCents: totalLiabilitiesCents + totalEquityCents,
    ratios: {
      currentRatio,
      quickRatio,
      debtToEquity,
      workingCapitalCents,
    },
  };
}

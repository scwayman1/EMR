// EMR-247 — monthly tax obligation report.
//
// Aggregates the current month's Orders by destination state and
// returns a per-state summary that finance uses for filing. We don't
// query TaxJar's transaction history endpoint here — Order rows are
// the source of truth for what we collected; TaxJar is the source of
// truth for what we *should* collect (already happened at checkout).

import { prisma } from "@/lib/db/prisma";
import { shouldCollectSalesTax } from "./marketplace-facilitator";

export interface MonthlyTaxJurisdictionSummary {
  state: string;
  orderCount: number;
  taxableSubtotalUsd: number;
  taxCollectedUsd: number;
  /** True when this state's law obligates us (the marketplace
   *  facilitator) to file. False = vendors file directly. */
  marketplaceFacilitator: boolean;
}

export async function buildMonthlyTaxReport(opts: {
  organizationId: string;
  /** Month start (ISO date, UTC). End is implicitly 1 month later. */
  monthStart: Date;
}): Promise<{
  monthStart: Date;
  monthEnd: Date;
  totals: { orderCount: number; taxableSubtotalUsd: number; taxCollectedUsd: number };
  byState: MonthlyTaxJurisdictionSummary[];
}> {
  const monthEnd = new Date(opts.monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const orders = await prisma.order.findMany({
    where: {
      organizationId: opts.organizationId,
      status: "confirmed",
      createdAt: { gte: opts.monthStart, lt: monthEnd },
    },
    select: {
      id: true,
      subtotal: true,
      tax: true,
      shippingAddress: true,
    },
  });

  const buckets = new Map<string, MonthlyTaxJurisdictionSummary>();
  let totalOrders = 0;
  let totalSubtotal = 0;
  let totalTax = 0;

  for (const order of orders) {
    const addr = order.shippingAddress as { state?: string } | null;
    const state = (addr?.state ?? "").toUpperCase();
    if (!state) continue;

    const existing = buckets.get(state) ?? {
      state,
      orderCount: 0,
      taxableSubtotalUsd: 0,
      taxCollectedUsd: 0,
      marketplaceFacilitator: shouldCollectSalesTax(state),
    };
    existing.orderCount += 1;
    existing.taxableSubtotalUsd = round2(existing.taxableSubtotalUsd + order.subtotal);
    existing.taxCollectedUsd = round2(existing.taxCollectedUsd + order.tax);
    buckets.set(state, existing);

    totalOrders += 1;
    totalSubtotal = round2(totalSubtotal + order.subtotal);
    totalTax = round2(totalTax + order.tax);
  }

  return {
    monthStart: opts.monthStart,
    monthEnd,
    totals: {
      orderCount: totalOrders,
      taxableSubtotalUsd: totalSubtotal,
      taxCollectedUsd: totalTax,
    },
    byState: Array.from(buckets.values()).sort(
      (a, b) => b.taxCollectedUsd - a.taxCollectedUsd,
    ),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

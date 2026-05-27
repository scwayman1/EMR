// EMR-315 — Vendor analytics aggregations.
//
// Drives the vendor portal analytics dashboard. Every metric is derived
// here so the page stays a thin renderer; the heavy lifting (DB
// aggregations + caching) belongs in this module.

import "server-only";

export interface VendorAnalyticsRange {
  /** Inclusive start, ISO date. */
  start: string;
  /** Inclusive end, ISO date. */
  end: string;
}

export interface RevenueMetric {
  grossCents: number;
  takeRateCents: number;
  netCents: number;
  /** Spark series: 30 daily values for the trailing window. */
  daily: number[];
}

export interface OrderMetric {
  count: number;
  averageOrderValueCents: number;
  refundCount: number;
  refundRate: number;
}

export interface ProductPerformanceRow {
  productSlug: string;
  productName: string;
  unitsSold: number;
  grossCents: number;
  averageRating: number;
  reviewCount: number;
}

export interface TrafficMetric {
  pdpViews: number;
  conversionRate: number;
  cartAdds: number;
}

export interface VendorAnalyticsSnapshot {
  vendorId: string;
  range: VendorAnalyticsRange;
  revenue: RevenueMetric;
  orders: OrderMetric;
  topProducts: ProductPerformanceRow[];
  traffic: TrafficMetric;
}

const DEMO_DAILY = [
  280, 312, 340, 295, 360, 410, 388, 401, 425, 460, 472, 489, 510, 478, 502,
  531, 555, 540, 558, 590, 612, 635, 660, 642, 690, 712, 738, 720, 758, 802,
];

/**
 * Demo snapshot used by the vendor portal page until the real
 * aggregation pipeline lands. The shape is what the dashboard consumes;
 * swapping in DB-backed data is a one-function change.
 */
export function demoSnapshot(
  vendorId: string,
  range: VendorAnalyticsRange,
): VendorAnalyticsSnapshot {
  const grossCents = DEMO_DAILY.reduce((s, d) => s + d * 100, 0);
  const takeRateCents = Math.round(grossCents * 0.12);
  return {
    vendorId,
    range,
    revenue: {
      grossCents,
      takeRateCents,
      netCents: grossCents - takeRateCents,
      daily: DEMO_DAILY,
    },
    orders: {
      count: 312,
      averageOrderValueCents: Math.round(grossCents / 312),
      refundCount: 11,
      refundRate: 11 / 312,
    },
    topProducts: [
      {
        productSlug: "solace-nightfall-tincture",
        productName: "Nightfall Sleep Tincture",
        unitsSold: 184,
        grossCents: 184 * 64 * 100,
        averageRating: 4.8,
        reviewCount: 132,
      },
      {
        productSlug: "calm-day-capsules",
        productName: "Calm Day Capsules",
        unitsSold: 98,
        grossCents: 98 * 48 * 100,
        averageRating: 4.6,
        reviewCount: 84,
      },
      {
        productSlug: "recovery-balm",
        productName: "Recovery Balm",
        unitsSold: 76,
        grossCents: 76 * 38 * 100,
        averageRating: 4.7,
        reviewCount: 61,
      },
    ],
    traffic: {
      pdpViews: 14_812,
      conversionRate: 312 / 14_812,
      cartAdds: 921,
    },
  };
}

export function defaultRange(now: Date = new Date()): VendorAnalyticsRange {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

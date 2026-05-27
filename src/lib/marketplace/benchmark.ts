// EMR-303 — Rival Amazon / Theleafmart benchmark.
//
// Codifies the consumer storefront feature parity matrix vs Amazon as a
// queryable structure. Two consumers:
//   - Internal `/ops/marketplace-benchmark` report (PM/leadership review)
//   - Roadmap planning — agents can ask `gapAreas()` to pick what to build
//
// Status values reflect the Theleafmart storefront, not the clinical EMR.

export type BenchmarkStatus = "shipped" | "partial" | "missing";

export type BenchmarkPriority = "P0" | "P1" | "P2";

export interface BenchmarkFeature {
  id: string;
  category:
    | "discovery"
    | "pdp"
    | "checkout"
    | "post_purchase"
    | "trust"
    | "vendor"
    | "personalization";
  name: string;
  amazonReference: string;
  theleafmartStatus: BenchmarkStatus;
  priority: BenchmarkPriority;
  notes?: string;
  /** Optional Linear ticket that drives the gap. */
  ticket?: string;
}

export const BENCHMARK_FEATURES: BenchmarkFeature[] = [
  // Discovery
  {
    id: "search-typeahead",
    category: "discovery",
    name: "Typeahead search with category suggestions",
    amazonReference: "Department-aware typeahead",
    theleafmartStatus: "partial",
    priority: "P1",
    notes: "Search exists; needs category-segmented suggestions and recent-searches.",
  },
  {
    id: "facet-filters",
    category: "discovery",
    name: "Faceted filters (cannabinoid, format, terpene, price)",
    amazonReference: "Left-rail facet filters",
    theleafmartStatus: "shipped",
    priority: "P0",
  },
  {
    id: "compare-grid",
    category: "discovery",
    name: "Compare similar items side-by-side",
    amazonReference: "Compare with similar items",
    theleafmartStatus: "missing",
    priority: "P1",
    ticket: "EMR-310",
  },

  // PDP
  {
    id: "pdp-qa",
    category: "pdp",
    name: "Customer Q&A on PDP",
    amazonReference: "Customer questions & answers section",
    theleafmartStatus: "missing",
    priority: "P1",
    ticket: "EMR-305",
  },
  {
    id: "pdp-reviews-photos",
    category: "pdp",
    name: "Reviews with customer photos",
    amazonReference: "Customer images carousel + photo upload",
    theleafmartStatus: "partial",
    priority: "P0",
    notes: "Reviews ship; photo upload + AI moderation pending.",
    ticket: "EMR-306",
  },
  {
    id: "pdp-details-list",
    category: "pdp",
    name: "Bulleted Product Details (specifications)",
    amazonReference: "About this item bullets",
    theleafmartStatus: "missing",
    priority: "P1",
    ticket: "EMR-307",
  },
  {
    id: "pdp-recommendations",
    category: "pdp",
    name: "Pairs-well-with / frequently bought together",
    amazonReference: "Frequently bought together",
    theleafmartStatus: "shipped",
    priority: "P1",
    notes: "PairsWellWith component is live on PDP.",
  },

  // Checkout
  {
    id: "checkout-share",
    category: "checkout",
    name: "Share cart / wishlist via link",
    amazonReference: "Share with friends",
    theleafmartStatus: "missing",
    priority: "P2",
    ticket: "EMR-310",
  },
  {
    id: "checkout-1click",
    category: "checkout",
    name: "Saved payment + one-step checkout",
    amazonReference: "1-Click",
    theleafmartStatus: "partial",
    priority: "P1",
    notes: "Saved cards via Payabli; not yet a single-click flow.",
  },

  // Post-purchase
  {
    id: "order-tracking",
    category: "post_purchase",
    name: "Live order tracking with carrier integration",
    amazonReference: "Track package",
    theleafmartStatus: "partial",
    priority: "P0",
  },

  // Trust
  {
    id: "verified-badge",
    category: "trust",
    name: "Verified-purchase badge on reviews",
    amazonReference: "Verified Purchase",
    theleafmartStatus: "shipped",
    priority: "P0",
  },
  {
    id: "coa-on-file",
    category: "trust",
    name: "Lab COA on every product",
    amazonReference: "n/a — Leafmart differentiator",
    theleafmartStatus: "shipped",
    priority: "P0",
    notes: "Differentiator: Amazon does not offer COA-on-file for cannabinoid products.",
  },

  // Vendor
  {
    id: "vendor-tax-docs",
    category: "vendor",
    name: "Vendor self-service tax documents",
    amazonReference: "Seller Central tax forms",
    theleafmartStatus: "missing",
    priority: "P0",
    ticket: "EMR-315",
  },
  {
    id: "vendor-analytics",
    category: "vendor",
    name: "Vendor analytics dashboard",
    amazonReference: "Seller Central reports",
    theleafmartStatus: "missing",
    priority: "P0",
    ticket: "EMR-315",
  },

  // Personalization
  {
    id: "personalized-shelf",
    category: "personalization",
    name: "Personalized recommendations shelf",
    amazonReference: "Recommended for you",
    theleafmartStatus: "partial",
    priority: "P1",
    notes: "Clinician-pick shelf exists; user-history-aware shelf pending.",
  },
];

export interface CategoryScore {
  category: BenchmarkFeature["category"];
  shipped: number;
  partial: number;
  missing: number;
  total: number;
  /** Score = shipped + 0.5 * partial, normalized 0–1. */
  parityScore: number;
}

/**
 * Compute parity by category. `partial` counts as half-credit so a
 * category with 2 shipped + 2 partial scores higher than 2 shipped + 2
 * missing — the gap visualization in the report uses this nuance.
 */
export function categoryScores(): CategoryScore[] {
  const buckets = new Map<BenchmarkFeature["category"], CategoryScore>();
  for (const f of BENCHMARK_FEATURES) {
    const b = buckets.get(f.category) ?? {
      category: f.category,
      shipped: 0,
      partial: 0,
      missing: 0,
      total: 0,
      parityScore: 0,
    };
    if (f.theleafmartStatus === "shipped") b.shipped += 1;
    else if (f.theleafmartStatus === "partial") b.partial += 1;
    else b.missing += 1;
    b.total += 1;
    buckets.set(f.category, b);
  }
  return [...buckets.values()].map((b) => ({
    ...b,
    parityScore: b.total === 0 ? 0 : (b.shipped + 0.5 * b.partial) / b.total,
  }));
}

/**
 * Open gaps sorted by priority then category, useful for roadmap views.
 */
export function gapAreas(): BenchmarkFeature[] {
  const order: Record<BenchmarkPriority, number> = { P0: 0, P1: 1, P2: 2 };
  return BENCHMARK_FEATURES.filter((f) => f.theleafmartStatus !== "shipped").sort(
    (a, b) => order[a.priority] - order[b.priority] || a.category.localeCompare(b.category),
  );
}

export function overallParity(): number {
  const totals = BENCHMARK_FEATURES.reduce(
    (acc, f) => {
      if (f.theleafmartStatus === "shipped") acc.shipped += 1;
      else if (f.theleafmartStatus === "partial") acc.partial += 1;
      acc.total += 1;
      return acc;
    },
    { shipped: 0, partial: 0, total: 0 },
  );
  return totals.total === 0
    ? 0
    : (totals.shipped + 0.5 * totals.partial) / totals.total;
}

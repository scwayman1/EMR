// EMR-303 — "Rival Amazon" benchmark.
//
// Theleafmart.com is positioned as the "Amazon of cannabis." Every
// storefront decision is measured against the experience a shopper gets on
// Amazon. This module encodes that bar as a checklist of capabilities so
// the storefront can render an honest scorecard ("here's how we stack up")
// and so reviews of new shop work have a concrete rubric to grade against.
//
// Pure data + helpers. Safe to import anywhere.

export type BenchmarkStatus = "shipped" | "in_progress" | "planned";

export interface BenchmarkDimension {
  id: string;
  /** What Amazon does that sets the bar. */
  amazonBar: string;
  /** The shopper-facing capability we measure. */
  capability: string;
  status: BenchmarkStatus;
  /** How Leafmart meets (or plans to meet) the bar. */
  leafmartMove: string;
}

export const AMAZON_BENCHMARK: BenchmarkDimension[] = [
  {
    id: "catalog",
    capability: "Catalog breadth & depth",
    amazonBar: "Hundreds of millions of SKUs across every department.",
    status: "in_progress",
    leafmartMove:
      "Curated distributor catalog spanning flower, tinctures, edibles, topicals, vapes, and wellness supply — every SKU vetted, none warehoused by us.",
  },
  {
    id: "search",
    capability: "Search & discovery",
    amazonBar: "Instant, typo-tolerant search with faceted filters.",
    status: "shipped",
    leafmartMove:
      "Symptom / goal / format facets, price bands, and outcome-ranked sort built on the marketplace search index.",
  },
  {
    id: "recommendations",
    capability: "Personalized recommendations",
    amazonBar: "\"Customers who bought this also bought\" everywhere.",
    status: "shipped",
    leafmartMove:
      "Clinician-tuned recommender scores products to the shopper's goals; related-product rails on every PDP.",
  },
  {
    id: "reviews",
    capability: "Reviews with photos",
    amazonBar: "Verified-purchase reviews with customer photos.",
    status: "shipped",
    leafmartMove:
      "Verified-buyer reviews with AI-moderated photo uploads — no graphic, obscene, or PII-leaking images reach the page.",
  },
  {
    id: "qa",
    capability: "Customer Q&A",
    amazonBar: "Community questions answered by buyers and sellers.",
    status: "shipped",
    leafmartMove:
      "Expandable Q&A tab with an AI summary of common questions plus customer-, vendor-, and clinician-answered threads.",
  },
  {
    id: "fulfillment",
    capability: "Fulfillment promise",
    amazonBar: "Prime-grade 1–2 day delivery with clear ETAs.",
    status: "in_progress",
    leafmartMove:
      "Per-distributor handling-time SLAs surfaced at checkout; multi-shipment grouping so each parcel shows its own ETA.",
  },
  {
    id: "trust",
    capability: "Trust & safety signals",
    amazonBar: "A-to-z guarantee, seller ratings, return windows.",
    status: "shipped",
    leafmartMove:
      "Lab-verified COAs, clinician picks, distributor trust tiers, and per-distributor return windows shown before purchase.",
  },
  {
    id: "compare",
    capability: "Side-by-side compare",
    amazonBar: "Compare specs across similar products.",
    status: "shipped",
    leafmartMove:
      "\"Compare similar items\" on the PDP and at checkout so shoppers confirm the right pick before paying.",
  },
];

/** A shipped/total score the storefront can render as a progress bar. */
export function benchmarkScore(): { shipped: number; total: number; pct: number } {
  const total = AMAZON_BENCHMARK.length;
  const shipped = AMAZON_BENCHMARK.filter((d) => d.status === "shipped").length;
  return { shipped, total, pct: Math.round((shipped / total) * 100) };
}

export function benchmarkByStatus(status: BenchmarkStatus): BenchmarkDimension[] {
  return AMAZON_BENCHMARK.filter((d) => d.status === status);
}

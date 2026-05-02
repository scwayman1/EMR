import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";

export const CATEGORY_FILTERS = [
  { slug: "rest", name: "Rest", match: ["sleep", "rest", "evening", "wind-down", "wind down", "night", "cbn"] },
  { slug: "relief", name: "Relief", match: ["relief", "recovery", "tension", "balm", "after long", "long days"] },
  { slug: "calm", name: "Calm", match: ["calm", "anxiety", "edge", "quiet"] },
  { slug: "skin", name: "Skin", match: ["skin", "serum", "barrier"] },
  { slug: "focus", name: "Focus", match: ["focus", "clarity", "alert", "daytime"] },
] as const;

export const FORMAT_FILTERS = [
  { slug: "tincture", name: "Tincture" },
  { slug: "edible", name: "Edible" },
  { slug: "topical", name: "Topical" },
  { slug: "beverage", name: "Beverage" },
  { slug: "serum", name: "Serum" },
  { slug: "capsule", name: "Capsule" },
] as const;

export type PriceRangeSlug = "under-30" | "30-60" | "60-100" | "over-100";

export const PRICE_FILTERS: { slug: PriceRangeSlug; name: string; test: (p: number) => boolean }[] = [
  { slug: "under-30", name: "Under $30", test: (p) => p < 30 },
  { slug: "30-60", name: "$30 – $60", test: (p) => p >= 30 && p <= 60 },
  { slug: "60-100", name: "$60 – $100", test: (p) => p > 60 && p <= 100 },
  { slug: "over-100", name: "$100+", test: (p) => p > 100 },
];

export type SortKey = "relevance" | "price-asc" | "price-desc" | "outcome";

export interface SearchInput {
  q?: string;
  categories?: string[];
  formats?: string[];
  prices?: string[];
  sort?: SortKey;
}

function matchesCategory(p: LeafmartProduct, slug: string): boolean {
  const filter = CATEGORY_FILTERS.find((c) => c.slug === slug);
  if (!filter) return false;
  const hay = `${p.name} ${p.support} ${p.formatLabel}`.toLowerCase();
  return filter.match.some((k) => hay.includes(k));
}

function matchesQuery(p: LeafmartProduct, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [p.name, p.partner, p.format, p.formatLabel, p.support].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

function relevanceScore(p: LeafmartProduct, q: string): number {
  const needle = q.trim().toLowerCase();
  if (!needle) return p.pct;
  let score = 0;
  if (p.name.toLowerCase().includes(needle)) score += 5;
  if (p.partner.toLowerCase().includes(needle)) score += 3;
  if (p.formatLabel.toLowerCase().includes(needle)) score += 2;
  if (p.support.toLowerCase().includes(needle)) score += 1;
  // Outcome% as a tiebreaker (0-1 contribution)
  score += p.pct / 100;
  return score;
}

export function searchProducts(
  input: SearchInput,
  products: LeafmartProduct[],
): { products: LeafmartProduct[]; total: number } {
  const q = (input.q ?? "").trim();
  const cats = (input.categories ?? []).filter(Boolean);
  const fmts = (input.formats ?? []).filter(Boolean);
  const prices = (input.prices ?? []).filter(Boolean);
  const sort: SortKey = input.sort ?? "relevance";

  const filtered = products.filter((p) => {
    if (!matchesQuery(p, q)) return false;
    // Multi-select: product must match at least one selected category (OR semantics).
    if (cats.length > 0 && !cats.some((c) => matchesCategory(p, c))) return false;
    if (fmts.length > 0 && !fmts.includes(p.format)) return false;
    if (prices.length > 0) {
      const inAnyRange = prices.some((slug) => {
        const f = PRICE_FILTERS.find((x) => x.slug === slug);
        return f ? f.test(p.price) : false;
      });
      if (!inAnyRange) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "outcome":
      sorted.sort((a, b) => b.pct - a.pct);
      break;
    case "relevance":
    default:
      sorted.sort((a, b) => relevanceScore(b, q) - relevanceScore(a, q));
      break;
  }

  return { products: sorted, total: sorted.length };
}

/* ── URL state helpers ──────────────────────────────────────── */

export function parseListParam(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function serializeListParam(values: string[]): string {
  return values.join(",");
}

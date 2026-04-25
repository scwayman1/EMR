"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LeafmartProductCard,
  type LeafmartProduct,
} from "@/components/leafmart/LeafmartProductCard";
import { SearchBar } from "@/components/leafmart/SearchBar";
import { CannabinoidBrowser } from "@/components/leafmart/CannabinoidBrowser";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

const CATEGORY_FILTERS = [
  { slug: "sleep", name: "Sleep", match: ["sleep", "evening", "wind-down", "wind down", "night", "cbn"] },
  { slug: "recovery", name: "Recovery", match: ["recovery", "tension", "balm", "after long"] },
  { slug: "calm", name: "Calm", match: ["calm", "anxiety", "edge", "quiet"] },
  { slug: "skin", name: "Skin", match: ["skin", "serum", "barrier"] },
  { slug: "focus", name: "Focus", match: ["focus", "clarity", "alert", "daytime"] },
] as const;

const FORMAT_FILTERS = [
  { slug: "tincture", name: "Tincture" },
  { slug: "topical", name: "Topical" },
  { slug: "beverage", name: "Beverage" },
  { slug: "serum", name: "Serum" },
] as const;

type PriceFilter = { slug: string; name: string; test: (price: number) => boolean };
const PRICE_FILTERS: readonly PriceFilter[] = [
  { slug: "under-40", name: "Under $40", test: (p) => p < 40 },
  { slug: "40-60", name: "$40 – $60", test: (p) => p >= 40 && p <= 60 },
  { slug: "60-80", name: "$60 – $80", test: (p) => p > 60 && p <= 80 },
  { slug: "over-80", name: "$80+", test: (p) => p > 80 },
];

function matchesCategory(p: LeafmartProduct, slug: string) {
  const filter = CATEGORY_FILTERS.find((c) => c.slug === slug);
  if (!filter) return true;
  const hay = `${p.name} ${p.support} ${p.formatLabel}`.toLowerCase();
  return filter.match.some((k) => hay.includes(k));
}

function matchesQuery(p: LeafmartProduct, q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [p.name, p.partner, p.format, p.formatLabel, p.support].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

function FilterRow<T extends { slug: string; name: string }>({
  label,
  filters,
  active,
  onChange,
}: {
  label: string;
  filters: readonly T[];
  active: string;
  onChange: (slug: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-2 flex-wrap">
      <span className="eyebrow text-[var(--text-subtle)] flex-shrink-0 min-w-[68px]">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => {
          const selected = active === f.slug;
          return (
            <button
              key={f.slug}
              type="button"
              onClick={() => onChange(selected ? "" : f.slug)}
              aria-pressed={selected}
              className={
                "rounded-full px-4 py-1.5 text-[12.5px] font-medium border transition-colors " +
                (selected
                  ? "bg-[var(--ink)] text-[#FFF8E8] border-[var(--ink)]"
                  : "bg-white text-[var(--ink)] border-[var(--border)] hover:border-[var(--leaf)]")
              }
            >
              {f.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-[28px] bg-[var(--surface-muted)] border border-[var(--border)] px-8 py-16 text-center">
      <p className="font-display text-[28px] font-medium tracking-tight text-[var(--ink)]">
        Nothing on the shelf <em className="font-accent not-italic text-[var(--leaf)]">matches that yet</em>.
      </p>
      <p className="mt-3 text-[14.5px] text-[var(--text-soft)] max-w-[460px] mx-auto leading-relaxed">
        Try a broader term, clear your filters, or browse the shelves — every product is reviewed by a clinician.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center rounded-full font-medium bg-[var(--ink)] text-[#FFF8E8] hover:bg-[var(--leaf)] transition-colors"
          style={{ padding: "12px 22px", fontSize: 14 }}
        >
          Clear filters
        </button>
        <Link
          href="/leafmart/shop"
          className="inline-flex items-center rounded-full font-medium bg-white text-[var(--ink)] border border-[var(--border)] hover:border-[var(--leaf)] transition-colors"
          style={{ padding: "12px 22px", fontSize: 14 }}
        >
          Browse the shelves →
        </Link>
      </div>
    </div>
  );
}

function SearchExperience() {
  const params = useSearchParams();
  const initialQuery = params?.get("q") ?? "";
  const initialCategory = params?.get("category") ?? "";
  const initialFormat = params?.get("format") ?? "";

  const [rawQuery, setRawQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [category, setCategory] = useState<string>(initialCategory);
  const [format, setFormat] = useState<string>(initialFormat);
  const [price, setPrice] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(rawQuery), 180);
    return () => clearTimeout(t);
  }, [rawQuery]);

  const results = useMemo(() => {
    return DEMO_PRODUCTS.filter((p) => {
      if (!matchesQuery(p, debounced)) return false;
      if (category && !matchesCategory(p, category)) return false;
      if (format && p.format !== format) return false;
      if (price) {
        const f = PRICE_FILTERS.find((x) => x.slug === price);
        if (f && !f.test(p.price)) return false;
      }
      return true;
    });
  }, [debounced, category, format, price]);

  const hasFilters = Boolean(category || format || price || debounced.trim());

  const reset = () => {
    setRawQuery("");
    setCategory("");
    setFormat("");
    setPrice("");
  };

  return (
    <>
      <section className="px-6 lg:px-14 pt-12 pb-6 max-w-[1440px] mx-auto">
        <p className="eyebrow text-[var(--leaf)] mb-2.5">Search</p>
        <h1 className="font-display text-[40px] sm:text-[56px] font-normal tracking-[-1.4px] leading-[1.0] text-[var(--ink)]">
          Search the <em className="font-accent not-italic text-[var(--leaf)]">shelf</em>.
        </h1>
        <p className="mt-4 text-[17px] text-[var(--text-soft)] max-w-[640px] leading-relaxed">
          Look up a product, partner, format, or how you want to feel. Every result is physician-curated.
        </p>
        <div className="mt-7 max-w-[640px]">
          <SearchBar
            value={rawQuery}
            onChange={setRawQuery}
            placeholder="Try ‘CBN’, ‘Field Balm’, or ‘sleep’…"
            autoFocus
          />
        </div>
      </section>

      <section className="px-6 lg:px-14 pb-4 max-w-[1440px] mx-auto space-y-1">
        <FilterRow label="Category" filters={CATEGORY_FILTERS} active={category} onChange={setCategory} />
        <FilterRow label="Format" filters={FORMAT_FILTERS} active={format} onChange={setFormat} />
        <FilterRow label="Price" filters={PRICE_FILTERS} active={price} onChange={setPrice} />
      </section>

      <section className="px-6 lg:px-14 pb-16 max-w-[1440px] mx-auto">
        <div className="flex items-baseline justify-between mb-5 mt-4">
          <p className="text-[13px] text-[var(--text-soft)]">
            {results.length} {results.length === 1 ? "result" : "results"}
            {hasFilters ? "" : " · showing the full shelf"}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={reset}
              className="text-[13px] text-[var(--leaf)] font-medium hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
            {results.map((p) => (
              <LeafmartProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <NoResults onReset={reset} />
        )}
      </section>

      <section className="px-6 lg:px-14 pb-24 max-w-[1440px] mx-auto">
        <CannabinoidBrowser />
      </section>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchExperience />
    </Suspense>
  );
}

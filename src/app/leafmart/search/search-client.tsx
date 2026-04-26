"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LeafmartProductCard,
  type LeafmartProduct,
} from "@/components/leafmart/LeafmartProductCard";
import { SearchBar } from "@/components/leafmart/SearchBar";
import { CannabinoidBrowser } from "@/components/leafmart/CannabinoidBrowser";
import {
  CATEGORY_FILTERS,
  FORMAT_FILTERS,
  PRICE_FILTERS,
  parseListParam,
  searchProducts,
  serializeListParam,
  type SortKey,
} from "@/lib/leafmart/search";

const SORTS: { slug: SortKey; name: string }[] = [
  { slug: "relevance", name: "Relevance" },
  { slug: "price-asc", name: "Price · Low to high" },
  { slug: "price-desc", name: "Price · High to low" },
  { slug: "outcome", name: "Outcome %" },
];

function MultiFilterRow<T extends { slug: string; name: string }>({
  label,
  filters,
  active,
  onToggle,
}: {
  label: string;
  filters: readonly T[];
  active: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 sm:gap-4 py-2 flex-wrap">
      <span className="eyebrow text-[var(--text-subtle)] flex-shrink-0 min-w-[68px] pt-1.5">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => {
          const selected = active.includes(f.slug);
          return (
            <button
              key={f.slug}
              type="button"
              onClick={() => onToggle(f.slug)}
              aria-pressed={selected}
              className={
                "rounded-full px-4 py-1.5 text-[12.5px] font-medium border transition-colors " +
                (selected
                  ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                  : "bg-[var(--surface)] text-[var(--ink)] border-[var(--border)] hover:border-[var(--leaf)]")
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
    <div className="rounded-[24px] sm:rounded-[28px] bg-[var(--surface-muted)] border border-[var(--border)] px-6 sm:px-8 py-12 sm:py-16 text-center">
      <p className="font-display text-[24px] sm:text-[28px] font-medium tracking-tight text-[var(--ink)]">
        Nothing on the shelf <em className="font-accent not-italic text-[var(--leaf)]">matches that yet</em>.
      </p>
      <p className="mt-3 text-[14px] sm:text-[14.5px] text-[var(--text-soft)] max-w-[460px] mx-auto leading-relaxed">
        Try a broader term, clear your filters, or browse the shelves — every product is reviewed by a clinician.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center rounded-full font-medium bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)] transition-colors px-5 py-3 text-[14px]"
        >
          Clear filters
        </button>
        <Link
          href="/leafmart/shop"
          className="inline-flex items-center rounded-full font-medium bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:border-[var(--leaf)] transition-colors px-5 py-3 text-[14px]"
        >
          Browse the shelves →
        </Link>
      </div>
    </div>
  );
}

function SearchExperience({ products }: { products: LeafmartProduct[] }) {
  const params = useSearchParams();
  const router = useRouter();

  const [rawQuery, setRawQuery] = useState(() => params?.get("q") ?? "");
  const [debounced, setDebounced] = useState(() => params?.get("q") ?? "");
  const [categories, setCategories] = useState<string[]>(() => parseListParam(params?.get("cat") ?? null));
  const [formats, setFormats] = useState<string[]>(() => parseListParam(params?.get("format") ?? null));
  const [prices, setPrices] = useState<string[]>(() => parseListParam(params?.get("price") ?? null));
  const [sort, setSort] = useState<SortKey>(() => {
    const s = params?.get("sort");
    return s === "price-asc" || s === "price-desc" || s === "outcome" ? s : "relevance";
  });

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);

  // Persist filter state to URL (replace, no scroll)
  const skipNextSyncRef = useRef(true);
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    const next = new URLSearchParams();
    if (debounced.trim()) next.set("q", debounced.trim());
    if (categories.length) next.set("cat", serializeListParam(categories));
    if (formats.length) next.set("format", serializeListParam(formats));
    if (prices.length) next.set("price", serializeListParam(prices));
    if (sort && sort !== "relevance") next.set("sort", sort);
    const qs = next.toString();
    router.replace(qs ? `/leafmart/search?${qs}` : "/leafmart/search", { scroll: false });
  }, [debounced, categories, formats, prices, sort, router]);

  const result = useMemo(
    () =>
      searchProducts(
        { q: debounced, categories, formats, prices, sort },
        products,
      ),
    [debounced, categories, formats, prices, sort, products],
  );

  const hasFilters =
    Boolean(debounced.trim()) || categories.length > 0 || formats.length > 0 || prices.length > 0 || sort !== "relevance";

  const toggle = useCallback(
    (set: string[], setSet: (v: string[]) => void) => (slug: string) => {
      setSet(set.includes(slug) ? set.filter((s) => s !== slug) : [...set, slug]);
    },
    [],
  );

  const reset = useCallback(() => {
    setRawQuery("");
    setDebounced("");
    setCategories([]);
    setFormats([]);
    setPrices([]);
    setSort("relevance");
  }, []);

  return (
    <>
      <section className="px-4 sm:px-6 lg:px-14 pt-10 sm:pt-12 pb-4 sm:pb-6 max-w-[1440px] mx-auto lm-fade-in">
        <p className="eyebrow text-[var(--leaf)] mb-2.5">Search</p>
        <h1 className="font-display text-[34px] sm:text-[48px] lg:text-[56px] font-normal tracking-[-1.2px] sm:tracking-[-1.4px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)]">
          Search the <em className="font-accent not-italic text-[var(--leaf)]">shelf</em>.
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] text-[var(--text-soft)] max-w-[640px] leading-relaxed">
          Look up a product, partner, format, or how you want to feel. Every result is physician-curated.
        </p>
        <div className="mt-6 sm:mt-7 max-w-[640px]">
          <label htmlFor="leafmart-search" className="sr-only">Search products</label>
          <SearchBar
            value={rawQuery}
            onChange={setRawQuery}
            placeholder="Try ‘CBN’, ‘Field Balm’, or ‘sleep’…"
            autoFocus
          />
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-14 pb-3 max-w-[1440px] mx-auto space-y-1">
        <MultiFilterRow label="Category" filters={CATEGORY_FILTERS} active={categories} onToggle={toggle(categories, setCategories)} />
        <MultiFilterRow label="Format" filters={FORMAT_FILTERS} active={formats} onToggle={toggle(formats, setFormats)} />
        <MultiFilterRow label="Price" filters={PRICE_FILTERS} active={prices} onToggle={toggle(prices, setPrices)} />
      </section>

      <section className="px-4 sm:px-6 lg:px-14 pb-12 sm:pb-16 max-w-[1440px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 mt-4">
          <p className="text-[13px] text-[var(--text-soft)]">
            {result.total} {result.total === 1 ? "result" : "results"}
            {hasFilters ? "" : " · showing the full shelf"}
          </p>
          <div className="flex items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-2 text-[13px] text-[var(--text-soft)]">
              <span className="eyebrow text-[var(--text-subtle)]">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--ink)] py-1.5 pl-3 pr-7 focus:border-[var(--leaf)] focus:ring-1 focus:ring-[var(--leaf)] outline-none transition-colors"
              >
                {SORTS.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </label>
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
        </div>

        {result.products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-[18px] lm-stagger">
            {result.products.map((p: LeafmartProduct) => (
              <LeafmartProductCard key={p.slug} product={p} />
            ))}
          </div>
        ) : (
          <NoResults onReset={reset} />
        )}
      </section>

      <section className="px-4 sm:px-6 lg:px-14 pb-20 sm:pb-24 max-w-[1440px] mx-auto">
        <CannabinoidBrowser />
      </section>
    </>
  );
}

export function SearchClient({ products }: { products: LeafmartProduct[] }) {
  return (
    <Suspense fallback={null}>
      <SearchExperience products={products} />
    </Suspense>
  );
}

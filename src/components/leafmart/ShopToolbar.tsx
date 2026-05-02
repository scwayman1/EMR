"use client";

// EMR-303 — Amazon-style shop toolbar.
//
// Sticky bar that sits above the product grid on /leafmart/products and
// /leafmart/category/[slug]. Surfaces the result count, a sort menu,
// and (when provided) a row of quick-filter chips so the customer can
// narrow without leaving the page. Mirrors Amazon's "1-48 of 312
// results · Sort by …" header but in the Leafmart aesthetic.
//
// Pure client component — the parent owns the product list and uses
// the values from `onSort` / `onFilter` to re-render. This keeps the
// SSR'd shelf intact while giving us instant client-side sorting.

import { useState, useCallback } from "react";

export type ShopSort =
  | "featured"
  | "price-low-high"
  | "price-high-low"
  | "rating"
  | "newest";

const SORT_LABELS: Record<ShopSort, string> = {
  featured: "Featured",
  "price-low-high": "Price: low to high",
  "price-high-low": "Price: high to low",
  rating: "Customer rating",
  newest: "Newest arrivals",
};

const SORT_OPTIONS: ShopSort[] = [
  "featured",
  "price-low-high",
  "price-high-low",
  "rating",
  "newest",
];

interface FilterChip {
  id: string;
  label: string;
}

interface Props {
  totalCount: number;
  visibleCount: number;
  sort: ShopSort;
  onSort: (next: ShopSort) => void;
  filters?: FilterChip[];
  activeFilters?: string[];
  onToggleFilter?: (id: string) => void;
}

export function ShopToolbar({
  totalCount,
  visibleCount,
  sort,
  onSort,
  filters = [],
  activeFilters = [],
  onToggleFilter,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = useCallback(
    (next: ShopSort) => {
      onSort(next);
      setMenuOpen(false);
    },
    [onSort]
  );

  return (
    <div className="sticky top-[64px] z-30 -mx-4 sm:-mx-6 lg:-mx-14 px-4 sm:px-6 lg:px-14 bg-[var(--bg)]/85 backdrop-blur-md border-b border-[var(--border)]">
      <div className="max-w-[1440px] mx-auto py-3 flex flex-wrap items-center gap-3">
        <p className="text-[12.5px] text-[var(--muted)] tabular-nums">
          <span className="font-medium text-[var(--text)]">
            {visibleCount.toLocaleString()}
          </span>{" "}
          of {totalCount.toLocaleString()} results
        </p>

        {filters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
            {filters.map((f) => {
              const active = activeFilters.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => onToggleFilter?.(f.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-medium border transition-colors ${
                    active
                      ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
                      : "bg-[var(--surface)] text-[var(--text-soft)] border-[var(--border)] hover:border-[var(--leaf)] hover:text-[var(--leaf)]"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-1.5 text-[12.5px] font-medium text-[var(--text)] hover:border-[var(--leaf)]"
          >
            <span className="text-[var(--muted)]">Sort:</span>
            {SORT_LABELS[sort]}
            <span aria-hidden="true" className="text-[var(--muted)]">
              ▾
            </span>
          </button>
          {menuOpen && (
            <ul
              role="listbox"
              className="absolute right-0 mt-2 min-w-[200px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg p-1 z-50"
            >
              {SORT_OPTIONS.map((opt) => (
                <li key={opt}>
                  <button
                    role="option"
                    aria-selected={sort === opt}
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-colors ${
                      sort === opt
                        ? "bg-[var(--surface-muted)] text-[var(--ink)] font-medium"
                        : "text-[var(--text-soft)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    {SORT_LABELS[opt]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Apply a {@link ShopSort} to a product list. Shared so the products
 * page and category page sort consistently.
 */
export function sortProducts<
  P extends {
    price: number;
    averageRating?: number;
    reviewCount?: number;
    pct?: number;
  }
>(products: P[], sort: ShopSort): P[] {
  const list = [...products];
  switch (sort) {
    case "price-low-high":
      return list.sort((a, b) => a.price - b.price);
    case "price-high-low":
      return list.sort((a, b) => b.price - a.price);
    case "rating":
      return list.sort(
        (a, b) =>
          (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
      );
    case "newest":
      // Newest is approximated by reverse insertion order — the data
      // layer hands us products with the freshest ones last when no
      // explicit createdAt is available.
      return list.reverse();
    case "featured":
    default:
      return list.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  }
}

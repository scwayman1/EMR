"use client";

// EMR-303 — Client wrapper around the product grid that pairs it with
// the sort/filter toolbar. Used by /leafmart/products and category
// pages so they share one polished UX.

import { useMemo, useState } from "react";
import {
  LeafmartProductGrid,
  type LeafmartProduct,
} from "./LeafmartProductCard";
import { ShopToolbar, sortProducts, type ShopSort } from "./ShopToolbar";

interface Props {
  products: LeafmartProduct[];
  initialSort?: ShopSort;
}

export function ShopShelf({ products, initialSort = "featured" }: Props) {
  const [sort, setSort] = useState<ShopSort>(initialSort);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Pull a small set of quick-filter chips from the data so we don't
  // have to hand-curate them per category. Only show the top formats
  // by frequency.
  const filters = useMemo(() => {
    const counts = new Map<string, { id: string; label: string; n: number }>();
    for (const p of products) {
      const id = p.format;
      const entry = counts.get(id);
      if (entry) entry.n += 1;
      else counts.set(id, { id, label: p.formatLabel ?? p.format, n: 1 });
    }
    return [...counts.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
      .map(({ id, label }) => ({ id, label }));
  }, [products]);

  const visible = useMemo(() => {
    const filtered =
      activeFilters.length === 0
        ? products
        : products.filter((p) => activeFilters.includes(p.format));
    return sortProducts(filtered, sort);
  }, [products, sort, activeFilters]);

  const toggleFilter = (id: string) =>
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  return (
    <>
      <ShopToolbar
        totalCount={products.length}
        visibleCount={visible.length}
        sort={sort}
        onSort={setSort}
        filters={filters}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
      />
      <div className="lm-stagger pt-6">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[14px] text-[var(--muted)]">
            No products match those filters.{" "}
            <button
              onClick={() => setActiveFilters([])}
              className="text-[var(--leaf)] font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <LeafmartProductGrid products={visible} />
        )}
      </div>
    </>
  );
}

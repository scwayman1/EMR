"use client";

// EMR-310 — Compare similar items module for the checkout flow.
//
// Drops next to the cart summary on the checkout page. Surfaces 2-3
// alternates per cart item that match on format/category, with a
// side-by-side spec comparison so the customer can swap a product
// without leaving checkout.
//
// Designed to be dropped in by the checkout page; takes the cart and
// the comparable products as props so the parent stays in control of
// data fetching.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeafmartProduct } from "./LeafmartProductCard";

interface CartLine {
  product: LeafmartProduct;
  quantity: number;
}

interface ComparableSet {
  /** The cart item being compared against. */
  cartLine: CartLine;
  /** Up to 3 similar products. */
  alternates: LeafmartProduct[];
}

interface Props {
  comparableSets: ComparableSet[];
  /** Called when the customer picks an alternate to swap into the cart. */
  onSwap: (cartSlug: string, alternateSlug: string) => void;
}

export function CheckoutCompareSimilar({ comparableSets, onSwap }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = comparableSets[activeIndex];

  if (comparableSets.length === 0) return null;

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 mt-6">
      <p className="eyebrow text-[var(--leaf)] mb-2">Before you check out</p>
      <h3 className="font-display text-[20px] font-medium text-[var(--ink)] mb-4">
        Compare similar items
      </h3>

      {comparableSets.length > 1 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto">
          {comparableSets.map((set, i) => (
            <button
              key={set.cartLine.product.slug}
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                i === activeIndex
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-soft)]"
              }`}
            >
              {set.cartLine.product.name}
            </button>
          ))}
        </div>
      )}

      {active && <CompareTable set={active} onSwap={onSwap} />}
    </section>
  );
}

function CompareTable({
  set,
  onSwap,
}: {
  set: ComparableSet;
  onSwap: (cartSlug: string, alternateSlug: string) => void;
}) {
  const columns = useMemo(
    () => [set.cartLine.product, ...set.alternates],
    [set],
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left">
            <th className="py-2 pr-4 text-[11.5px] uppercase text-[var(--muted)] font-medium">
              Spec
            </th>
            {columns.map((p, i) => (
              <th
                key={p.slug}
                className="py-2 pr-4 align-top min-w-[160px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--ink)] text-[13px]">
                    {p.name}
                  </span>
                  {i === 0 && (
                    <span className="rounded-full bg-[var(--leaf)] text-[var(--bg)] text-[10px] px-2 py-0.5 font-semibold">
                      In cart
                    </span>
                  )}
                </div>
                <div className="text-[11.5px] text-[var(--muted)]">{p.partner}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          <Row label="Format" cells={columns.map((p) => p.formatLabel)} />
          <Row label="Dose" cells={columns.map((p) => p.dose)} />
          <Row
            label="Price"
            cells={columns.map((p) => `$${p.price.toFixed(2)}`)}
          />
          <Row
            label="Improvement"
            cells={columns.map((p) =>
              p.pct > 0 ? `${p.pct}% (n=${p.n})` : "n/a",
            )}
          />
          <Row
            label="Lab verified"
            cells={columns.map((p) =>
              (p.labVerified ?? true) ? "Yes" : "No",
            )}
          />
          <tr>
            <td className="py-3 pr-4 text-[var(--muted)] text-[12px]">Action</td>
            {columns.map((p, i) => (
              <td key={p.slug} className="py-3 pr-4">
                {i === 0 ? (
                  <span className="text-[var(--muted)] text-[12px]">—</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSwap(set.cartLine.product.slug, p.slug)}
                      className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-3 py-1.5 text-[12px] font-medium hover:bg-[var(--leaf)]"
                    >
                      Swap into cart
                    </button>
                    <Link
                      href={`/leafmart/products/${p.slug}`}
                      className="text-[12px] text-[var(--leaf)] hover:underline"
                    >
                      View
                    </Link>
                  </div>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr>
      <td className="py-2.5 pr-4 text-[var(--muted)] text-[12px] whitespace-nowrap">
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} className="py-2.5 pr-4 text-[var(--text)] tabular-nums">
          {c}
        </td>
      ))}
    </tr>
  );
}

"use client";

// EMR-310 — Checkout compare + share.
//
// Sits in the right rail of the checkout page. Two jobs:
//
//   1. Show a side-by-side comparison of every item in the cart with
//      a few alternates the customer might want to swap in. Mirrors the
//      "compare these similar items" rail on Amazon's checkout but tuned
//      to our specs (format, dose, outcome %, price).
//
//   2. Let the customer share the comparison with a friend or clinician
//      so they can get a second opinion before they buy. The share
//      payload is just a permalink — no email collection here.
//
// This is a pure client component; the parent owns the cart and hands
// in alternates.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LeafmartProduct } from "./LeafmartProductCard";
import { ShareButton } from "./ShareButton";

interface CartLine {
  product: LeafmartProduct;
  quantity: number;
}

export interface ComparisonGroup {
  /** The cart line being compared against. */
  cartLine: CartLine;
  /** Up to 3 similar products. */
  alternates: LeafmartProduct[];
}

interface Props {
  groups: ComparisonGroup[];
  /** Called when the customer picks an alternate to swap in. */
  onSwap?: (cartSlug: string, alternateSlug: string) => void;
  /** Permalink to the comparison itself (used by the share button). */
  shareUrl?: string;
}

export function CompareItems({ groups, onSwap, shareUrl }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = groups[activeIndex];

  const totalAlternates = useMemo(
    () => groups.reduce((acc, g) => acc + g.alternates.length, 0),
    [groups]
  );

  if (groups.length === 0 || totalAlternates === 0) return null;

  const handleSwap = (alternateSlug: string) => {
    if (!active) return;
    onSwap?.(active.cartLine.product.slug, alternateSlug);
  };

  const fullShareUrl = shareUrl
    ? shareUrl
    : typeof window !== "undefined"
      ? window.location.href
      : "";

  const compareTitle = active
    ? `Comparing alternatives to ${active.cartLine.product.name}`
    : "Compare alternatives";

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 mt-6">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="eyebrow text-[var(--leaf)] mb-2">Before you check out</p>
          <h3 className="font-display text-[20px] font-medium text-[var(--ink)]">
            Compare similar items
          </h3>
          <p className="text-[12.5px] text-[var(--muted)] mt-1">
            Swap in a closer match — or ping a clinician for a second opinion.
          </p>
        </div>
        {fullShareUrl && (
          <ShareButton
            title={compareTitle}
            url={fullShareUrl}
            text="Quick compare from my Leafmart cart — second opinion?"
            variant="pill"
          />
        )}
      </header>

      {groups.length > 1 && (
        <div className="flex items-center gap-1 mb-4 overflow-x-auto no-scrollbar">
          {groups.map((g, i) => (
            <button
              key={g.cartLine.product.slug}
              onClick={() => setActiveIndex(i)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                i === activeIndex
                  ? "bg-[var(--ink)] text-[var(--bg)]"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-soft)]"
              }`}
            >
              {g.cartLine.product.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[520px] text-left text-[12.5px]">
            <thead>
              <tr className="text-[var(--muted)]">
                <th className="font-medium pb-3 pr-3 align-top">Spec</th>
                <th className="font-medium pb-3 px-3 align-top">
                  <span className="block text-[11px] uppercase tracking-wider text-[var(--leaf)]">In your cart</span>
                  {active.cartLine.product.name}
                </th>
                {active.alternates.map((alt) => (
                  <th key={alt.slug} className="font-medium pb-3 px-3 align-top">
                    <span className="block text-[11px] uppercase tracking-wider text-[var(--muted)]">Alternate</span>
                    <Link
                      href={`/leafmart/products/${alt.slug}`}
                      className="text-[var(--ink)] hover:text-[var(--leaf)]"
                    >
                      {alt.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[var(--text)]">
              <Row
                label="Format"
                cart={active.cartLine.product.formatLabel}
                alternates={active.alternates.map((a) => a.formatLabel)}
              />
              <Row
                label="Dose"
                cart={active.cartLine.product.dose}
                alternates={active.alternates.map((a) => a.dose)}
              />
              <Row
                label="Outcome"
                cart={`${active.cartLine.product.pct}% (n=${active.cartLine.product.n})`}
                alternates={active.alternates.map((a) => `${a.pct}% (n=${a.n})`)}
              />
              <Row
                label="Price"
                cart={`$${active.cartLine.product.price.toFixed(2)}`}
                alternates={active.alternates.map((a) => `$${a.price.toFixed(2)}`)}
                emphasize
              />
              <tr>
                <td className="py-3 pr-3 align-top text-[var(--muted)]">Action</td>
                <td className="py-3 px-3 align-top">
                  <span className="inline-flex items-center gap-1.5 text-[var(--leaf)] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
                    Currently selected
                  </span>
                </td>
                {active.alternates.map((alt) => (
                  <td key={alt.slug} className="py-3 px-3 align-top">
                    <button
                      type="button"
                      onClick={() => handleSwap(alt.slug)}
                      className="rounded-full bg-[var(--ink)] text-[var(--bg)] px-3 py-1.5 text-[11.5px] font-medium hover:bg-[var(--leaf)] transition-colors"
                    >
                      Swap in
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Row({
  label,
  cart,
  alternates,
  emphasize,
}: {
  label: string;
  cart: string;
  alternates: string[];
  emphasize?: boolean;
}) {
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="py-3 pr-3 align-top text-[var(--muted)] whitespace-nowrap">{label}</td>
      <td className={`py-3 px-3 align-top ${emphasize ? "font-medium" : ""}`}>
        {cart}
      </td>
      {alternates.map((value, i) => (
        <td key={i} className={`py-3 px-3 align-top ${emphasize ? "font-medium" : ""}`}>
          {value}
        </td>
      ))}
    </tr>
  );
}

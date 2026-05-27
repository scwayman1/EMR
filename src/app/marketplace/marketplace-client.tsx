"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface MarketplaceCardProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  shortDescription: string;
  price: number;
  compareAtPrice?: number;
  format: string;
  thcContent?: number;
  cbdContent?: number;
  cbnContent?: number;
  clinicianPick: boolean;
  labVerified: boolean;
  beginnerFriendly: boolean;
  averageRating: number;
  reviewCount: number;
  symptoms: string[];
  goals: string[];
  inStock: boolean;
  firstReview: { rating: number; title?: string; body?: string; authorName: string } | null;
}

const WISHLIST_KEY = "leafjourney.marketplace.wishlist";
const COMPARE_KEY = "leafjourney.marketplace.compare";
const MAX_COMPARE = 4;

export function MarketplaceClient({ products }: { products: MarketplaceCardProduct[] }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    try {
      const w = localStorage.getItem(WISHLIST_KEY);
      const c = localStorage.getItem(COMPARE_KEY);
      if (w) setWishlist(JSON.parse(w));
      if (c) setCompare(JSON.parse(c));
    } catch {
      // localStorage unavailable — feature degrades gracefully
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
    } catch {}
  }, [compare]);

  function toggleWishlist(id: string) {
    setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
  }

  function toggleCompare(id: string) {
    setCompare((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= MAX_COMPARE) return c;
      return [...c, id];
    });
  }

  const compareProducts = useMemo(
    () => compare.map((id) => products.find((p) => p.id === id)).filter(Boolean) as MarketplaceCardProduct[],
    [compare, products],
  );

  return (
    <>
      {/* Floating action bar — wish list count + open compare */}
      <div className="sticky top-16 z-20 bg-bg/80 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-12 px-4 sm:px-6 lg:px-12 py-3 mb-4 border-b border-border/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            <span className="font-medium text-text">{wishlist.length}</span> on wish list
          </span>
          <span aria-hidden>·</span>
          <span>
            <span className="font-medium text-text">{compare.length}</span> / {MAX_COMPARE} to compare
          </span>
        </div>
        <div className="flex items-center gap-2">
          {compare.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCompare(true)}
              className="h-9 px-3 rounded-full bg-accent text-white text-xs font-medium hover:bg-accent-strong"
            >
              Compare {compare.length}
            </button>
          )}
          {(wishlist.length > 0 || compare.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setWishlist([]);
                setCompare([]);
              }}
              className="h-9 px-3 rounded-full border border-border text-text-muted text-xs hover:bg-surface"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Product grid */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <li key={p.id}>
            <ProductCard
              product={p}
              wished={wishlist.includes(p.id)}
              comparing={compare.includes(p.id)}
              compareFull={compare.length >= MAX_COMPARE && !compare.includes(p.id)}
              onToggleWish={() => toggleWishlist(p.id)}
              onToggleCompare={() => toggleCompare(p.id)}
            />
          </li>
        ))}
      </ul>

      {/* Compare drawer */}
      {showCompare && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowCompare(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Compare products"
        >
          <div
            className="bg-surface-raised border border-border rounded-3xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between mb-5">
              <h3 className="font-display text-2xl tracking-tight text-text">
                Compare ({compareProducts.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowCompare(false)}
                className="text-xs text-text-muted hover:text-text"
                aria-label="Close compare"
              >
                Close
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                    <th className="px-3 py-2 w-32">Spec</th>
                    {compareProducts.map((p) => (
                      <th key={p.id} className="px-3 py-2 align-top">
                        <p className="font-display text-base text-text leading-tight">{p.name}</p>
                        <p className="text-[11px] text-text-subtle mt-1">{p.brand}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Price" values={compareProducts.map((p) => `$${p.price}`)} />
                  <CompareRow label="Format" values={compareProducts.map((p) => p.format)} />
                  <CompareRow
                    label="THC / CBD / CBN"
                    values={compareProducts.map(
                      (p) =>
                        `${fmt(p.thcContent)} / ${fmt(p.cbdContent)} / ${fmt(p.cbnContent)} mg`,
                    )}
                  />
                  <CompareRow
                    label="Rating"
                    values={compareProducts.map((p) => `★ ${p.averageRating.toFixed(1)} (${p.reviewCount})`)}
                  />
                  <CompareRow
                    label="Symptoms"
                    values={compareProducts.map((p) => p.symptoms.join(", ") || "—")}
                  />
                  <CompareRow
                    label="Goals"
                    values={compareProducts.map((p) => p.goals.join(", ") || "—")}
                  />
                  <CompareRow
                    label="Trust"
                    values={compareProducts.map((p) =>
                      [
                        p.clinicianPick && "Clinician pick",
                        p.labVerified && "Lab verified",
                        p.beginnerFriendly && "Beginner friendly",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—",
                    )}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CompareRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="border-t border-border/60">
      <th
        scope="row"
        className="px-3 py-3 text-[11px] uppercase tracking-wider text-text-subtle font-medium align-top"
      >
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-3 text-[13px] text-text-muted leading-relaxed align-top">
          {v}
        </td>
      ))}
    </tr>
  );
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return String(n);
}

function ProductCard({
  product: p,
  wished,
  comparing,
  compareFull,
  onToggleWish,
  onToggleCompare,
}: {
  product: MarketplaceCardProduct;
  wished: boolean;
  comparing: boolean;
  compareFull: boolean;
  onToggleWish: () => void;
  onToggleCompare: () => void;
}) {
  return (
    <article className="bg-surface-raised border border-border rounded-2xl p-4 flex flex-col h-full card-hover">
      {/* Top row — badges + actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1">
          {p.clinicianPick && (
            <Badge tone="accent" className="!text-[9px]">
              Clinician pick
            </Badge>
          )}
          {p.beginnerFriendly && (
            <Badge tone="success" className="!text-[9px]">
              Beginner
            </Badge>
          )}
          {!p.inStock && (
            <Badge tone="neutral" className="!text-[9px]">
              Out of stock
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleWish}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${p.name} from wish list` : `Add ${p.name} to wish list`}
          className={`h-7 w-7 rounded-full border transition-colors flex items-center justify-center ${
            wished
              ? "border-accent bg-accent text-white"
              : "border-border text-text-subtle hover:border-accent hover:text-accent"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill={wished ? "currentColor" : "none"}>
            <path
              d="M7 12 C 7 12 1.5 8.5 1.5 5 C 1.5 3 3 2 4.5 2 C 5.5 2 6.5 2.5 7 3.5 C 7.5 2.5 8.5 2 9.5 2 C 11 2 12.5 3 12.5 5 C 12.5 8.5 7 12 7 12 Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Visual */}
      <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-accent-soft via-surface to-highlight-soft flex items-center justify-center mb-3">
        <span className="font-display text-3xl text-accent/60 select-none">{p.brand[0]}</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.14em] text-text-subtle font-medium">
          {p.brand}
        </p>
        <h3 className="font-display text-base text-text tracking-tight mt-0.5 leading-tight line-clamp-2">
          <Link href={`/marketplace/products/${p.slug}`} className="hover:text-accent">
            {p.name}
          </Link>
        </h3>
        <p className="text-[12px] text-text-muted leading-relaxed mt-2 line-clamp-2">
          {p.shortDescription}
        </p>

        {p.firstReview && (
          <div className="mt-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1 text-[11px] text-text-subtle">
              <span className="text-amber-500">{"★".repeat(p.firstReview.rating)}</span>
              <span>·</span>
              <span className="font-medium text-text">{p.firstReview.authorName}</span>
            </div>
            {p.firstReview.title && (
              <p className="text-[11.5px] text-text-muted mt-1 italic line-clamp-1">
                &ldquo;{p.firstReview.title}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-baseline justify-between mt-4">
        <div>
          <p className="font-display text-lg text-text tabular-nums">${p.price}</p>
          {p.compareAtPrice && p.compareAtPrice > p.price && (
            <p className="text-[11px] text-text-subtle line-through tabular-nums">${p.compareAtPrice}</p>
          )}
        </div>
        <div className="text-[11px] text-text-subtle text-right">
          ★ {p.averageRating.toFixed(1)} ({p.reviewCount})
        </div>
      </div>

      {/* Compare */}
      <button
        type="button"
        onClick={onToggleCompare}
        disabled={compareFull}
        aria-pressed={comparing}
        className={`mt-3 h-9 rounded-full text-xs font-medium transition-colors ${
          comparing
            ? "bg-accent text-white"
            : compareFull
              ? "bg-surface-muted text-text-subtle cursor-not-allowed"
              : "border border-border text-text hover:border-accent hover:text-accent"
        }`}
      >
        {comparing ? "Selected to compare" : compareFull ? "Compare full" : "Add to compare"}
      </button>
    </article>
  );
}

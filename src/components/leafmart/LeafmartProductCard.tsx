"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { ProductImage } from "./ProductImage";
import { useCart } from "@/lib/leafmart/cart-store";

export interface LeafmartVariant {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  inStock: boolean;
}

export interface LeafmartReview {
  id: string;
  authorName: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  verified: boolean;
  createdAt: string;
}

export interface LeafmartProduct {
  slug: string;
  partner: string;
  name: string;
  format: string;
  formatLabel: string;
  support: string;
  dose: string;
  price: number;
  pct: number;
  n: number;
  bg: string;
  deep: string;
  shape: "bottle" | "can" | "jar" | "tin" | "serum" | "box";
  tag?: string;
  imageUrl?: string | null;

  // Optional richer fields surfaced on the PDP. Older callers (cart, demo data)
  // may omit these; the PDP falls back gracefully when they are absent.
  description?: string;
  compareAtPrice?: number | null;
  averageRating?: number;
  reviewCount?: number;
  labVerified?: boolean;
  coaUrl?: string | null;
  clinicianPick?: boolean;
  clinicianNote?: string | null;
  variants?: LeafmartVariant[];
  reviews?: LeafmartReview[];
}

export function LeafmartProductCard({ product }: { product: LeafmartProduct }) {
  const p = product;
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      addItem(p);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1200);
    },
    [addItem, p]
  );

  return (
    <Link href={`/leafmart/products/${p.slug}`} className="block card-lift rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
      <div className="relative">
        <ProductImage src={p.imageUrl} alt={p.name} shape={p.shape} bg={p.bg} deep={p.deep} height={280} />
        {p.tag && (
          <div
            className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11.5px] font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-sm"
            style={{ background: p.deep, color: "#FFF8E8" }}
          >
            <span className="w-[5px] h-[5px] rounded-full" style={{ background: "#FFF8E8", opacity: 0.85 }} />
            {p.tag}
          </div>
        )}
        <div className="absolute top-4 right-4 bg-white/85 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-[var(--leaf)] flex items-center gap-1.5 backdrop-blur-sm">
          <svg width="11" height="11" viewBox="0 0 11 11"><circle cx="5.5" cy="5.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M3 5.7L4.5 7.2L7.5 4.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          COA
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <p className="eyebrow text-[var(--text-soft)] mb-2">{p.partner} · {p.formatLabel}</p>
        <h4 className="font-display text-[22px] font-medium tracking-tight leading-tight text-[var(--ink)] mb-2">{p.name}</h4>
        <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed flex-1">{p.support}</p>
        <div className="flex justify-between items-center mt-4 pt-3.5 border-t border-[var(--border)]">
          <div>
            <div className="text-[11.5px] text-[var(--muted)] mb-0.5">{p.dose}</div>
            <div className="text-[11.5px] text-[var(--leaf)] font-semibold flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--leaf)]" />
              {p.pct}% helped · n={p.n}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-[22px] font-medium text-[var(--ink)] tabular-nums">${p.price}</span>
            <button
              onClick={handleQuickAdd}
              aria-label={`Add ${p.name} to cart`}
              className={`group relative rounded-full w-[42px] h-[42px] flex items-center justify-center transition-all duration-300 ${
                justAdded
                  ? "bg-[var(--leaf)] text-[#FFF8E8] scale-110"
                  : "bg-[var(--ink)] text-[#FFF8E8] hover:bg-[var(--leaf)] hover:scale-105"
              }`}
            >
              {justAdded ? (
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M3 8.5L6.5 12L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 3h1.5l.8 4m0 0L6.5 13h8l1.5-6H5.3z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="7.5" cy="15.5" r="1" fill="currentColor" />
                  <circle cx="13" cy="15.5" r="1" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function LeafmartProductGrid({ products }: { products: LeafmartProduct[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]">
      {products.map((p) => (
        <LeafmartProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}

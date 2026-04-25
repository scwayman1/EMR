"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { ProductSilhouette } from "./ProductSilhouette";
import { useCart } from "@/lib/leafmart/cart-store";

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
    <Link href={`/leafmart/products/${p.slug}`} className="block card-lift rounded-3xl overflow-hidden bg-white border border-[var(--border)]">
      <div className="relative">
        <ProductSilhouette shape={p.shape} bg={p.bg} deep={p.deep} height={280} />
        {p.tag && (
          <div className="absolute top-4 left-4 bg-white text-[var(--ink)] px-3 py-1.5 rounded-full text-[11.5px] font-semibold tracking-wide inline-flex items-center gap-1.5">
            <span className="w-[5px] h-[5px] rounded-full bg-[var(--leaf)]" />
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
            <div className="text-xs text-[var(--muted)] mb-0.5">{p.dose}</div>
            <div className="text-xs text-[var(--leaf)] font-semibold flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-[var(--leaf)]" />
              {p.pct}% helped · n={p.n}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-[22px] font-medium text-[var(--ink)]">${p.price}</span>
            <button
              onClick={handleQuickAdd}
              aria-label={`Add ${p.name} to cart`}
              className={`rounded-full w-[38px] h-[38px] flex items-center justify-center text-lg transition-all duration-300 ${
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
                "+"
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

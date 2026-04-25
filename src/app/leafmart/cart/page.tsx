"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { useCart, formatUSD } from "@/lib/leafmart/cart-store";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

const TAX_RATE = 0.0875;

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <section className="max-w-[820px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
        <p className="eyebrow text-[var(--text-soft)] mb-3">Your cart</p>
        <h1 className="font-display text-[44px] sm:text-[56px] font-medium tracking-tight text-[var(--ink)] leading-[1.05] mb-5">
          Nothing here yet.
        </h1>
        <p className="text-[16px] text-[var(--text-soft)] leading-relaxed max-w-[520px] mb-8">
          Every Leafmart product is reviewed by a clinician and verified by a third-party
          lab. Find a formula built for the way you actually feel.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/leafmart/shop"
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Browse the shop
          </Link>
          <Link
            href="/leafmart/quiz"
            className="inline-flex items-center rounded-full border-[1.5px] border-[var(--ink)] text-[var(--ink)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--ink)] hover:text-[#FFF8E8] transition-colors"
          >
            Take the quiz
          </Link>
        </div>

        <div className="mt-16 pt-10 border-t border-[var(--border)]">
          <p className="eyebrow text-[var(--text-soft)] mb-5">Clinician picks</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {DEMO_PRODUCTS.slice(0, 4).map((p) => (
              <Link
                key={p.slug}
                href={`/leafmart/products/${p.slug}`}
                className="block card-lift rounded-3xl overflow-hidden bg-white border border-[var(--border)]"
              >
                <ProductSilhouette shape={p.shape} bg={p.bg} deep={p.deep} height={180} />
                <div className="p-4">
                  <p className="font-display text-[15px] font-medium text-[var(--ink)] truncate">
                    {p.name}
                  </p>
                  <p className="text-[12px] text-[var(--muted)] mt-1">
                    {p.dose} · ${p.price}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12 lg:py-20">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <p className="eyebrow text-[var(--text-soft)] mb-2">Your cart</p>
          <h1 className="font-display text-[40px] sm:text-[52px] font-medium tracking-tight text-[var(--ink)] leading-[1.05]">
            Review your order
          </h1>
        </div>
        <Link
          href="/leafmart/shop"
          className="text-[14px] font-medium text-[var(--ink)] hover:text-[var(--leaf)] transition-colors inline-flex items-center gap-1.5"
        >
          <span aria-hidden>←</span> Continue shopping
        </Link>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">
        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {items.map(({ product, quantity }) => (
            <li
              key={product.slug}
              className="py-6 grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] gap-5 sm:gap-7"
            >
              <Link
                href={`/leafmart/products/${product.slug}`}
                className="block rounded-2xl overflow-hidden card-lift"
              >
                <ProductSilhouette
                  shape={product.shape}
                  bg={product.bg}
                  deep={product.deep}
                  height={200}
                />
              </Link>
              <div className="flex flex-col">
                <p className="eyebrow text-[var(--text-soft)] mb-1">
                  {product.partner} · {product.formatLabel}
                </p>
                <Link
                  href={`/leafmart/products/${product.slug}`}
                  className="font-display text-[22px] sm:text-[26px] font-medium text-[var(--ink)] leading-tight hover:text-[var(--leaf)] transition-colors"
                >
                  {product.name}
                </Link>
                <p className="text-[13.5px] text-[var(--text-soft)] mt-2 leading-relaxed line-clamp-2">
                  {product.support}
                </p>
                <p className="text-[12px] text-[var(--muted)] mt-2">{product.dose}</p>

                <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex items-center border border-[var(--border)] rounded-full overflow-hidden">
                    <button
                      onClick={() => updateQuantity(product.slug, quantity - 1)}
                      aria-label={`Decrease ${product.name} quantity`}
                      className="w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-[14px] font-medium tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(product.slug, quantity + 1)}
                      aria-label={`Increase ${product.name} quantity`}
                      className="w-10 h-10 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-5">
                    <button
                      onClick={() => removeItem(product.slug)}
                      className="text-[13px] text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      Remove
                    </button>
                    <span className="font-display text-[24px] font-medium text-[var(--ink)] tabular-nums">
                      {formatUSD(product.price * quantity)}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-[100px] rounded-3xl border border-[var(--border)] bg-white p-7">
          <p className="eyebrow text-[var(--text-soft)] mb-5">Order summary</p>
          <dl className="space-y-3 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-[var(--text-soft)]">Subtotal</dt>
              <dd className="text-[var(--ink)] font-medium tabular-nums">
                {formatUSD(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-soft)]">Shipping</dt>
              <dd className="text-[var(--leaf)] font-medium flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M3.5 6.2L5.2 7.8L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Free
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-soft)]">Estimated tax</dt>
              <dd className="text-[var(--ink)] font-medium tabular-nums">{formatUSD(tax)}</dd>
            </div>
          </dl>
          <div className="border-t border-[var(--border)] mt-5 pt-5 flex justify-between items-baseline">
            <span className="text-[14px] font-medium text-[var(--ink)]">Total</span>
            <span className="font-display text-[28px] font-medium text-[var(--ink)] tabular-nums">
              {formatUSD(total)}
            </span>
          </div>
          <Link
            href="/leafmart/checkout"
            className="mt-6 block w-full text-center rounded-full bg-[var(--ink)] text-[#FFF8E8] py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Continue to checkout
          </Link>
          <div className="mt-5 flex items-start gap-2.5 text-[12px] text-[var(--text-soft)] leading-relaxed">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              className="mt-0.5 flex-shrink-0"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="6" fill="none" stroke="var(--leaf)" strokeWidth="1.4" />
              <path
                d="M4 7.2L6 9L10 5"
                fill="none"
                stroke="var(--leaf)"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Every order ships discreet. Lab COA included with every product.
          </div>
        </aside>
      </div>

      {/* Recommendations */}
      {(() => {
        const cartSlugs = new Set(items.map((i) => i.product.slug));
        const recs = DEMO_PRODUCTS.filter((p) => !cartSlugs.has(p.slug)).slice(0, 4);
        if (recs.length === 0) return null;
        return (
          <div className="mt-14 pt-10 border-t border-[var(--border)]">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="eyebrow text-[var(--leaf)] mb-2">You might also like</p>
                <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">
                  Pairs well with your order
                </h2>
              </div>
              <Link
                href="/leafmart/shop"
                className="text-[14px] font-medium text-[var(--ink)] hover:text-[var(--leaf)] transition-colors hidden sm:inline-flex items-center gap-1.5"
              >
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recs.map((p) => (
                <Link
                  key={p.slug}
                  href={`/leafmart/products/${p.slug}`}
                  className="block card-lift rounded-3xl overflow-hidden bg-white border border-[var(--border)]"
                >
                  <ProductSilhouette shape={p.shape} bg={p.bg} deep={p.deep} height={180} />
                  <div className="p-4">
                    <p className="font-display text-[15px] font-medium text-[var(--ink)] truncate">
                      {p.name}
                    </p>
                    <p className="text-[12px] text-[var(--muted)] mt-1">
                      {p.dose} · ${p.price}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </section>
  );
}

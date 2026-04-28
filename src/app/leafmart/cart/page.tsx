"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { useCart, formatUSD } from "@/lib/leafmart/cart-store";
import { useAgeConfirmation } from "@/lib/leafmart/age-confirmation";
import { AgeGateModal } from "@/components/leafmart/AgeGateModal";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

const TAX_RATE = 0.0875;
const FREE_SHIPPING_THRESHOLD = 75;
const REMOVE_ANIM_MS = 260;

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const router = useRouter();
  const { isConfirmed, isDenied } = useAgeConfirmation();
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const cartRequiresAge = items.some((i) => i.product.requiresAgeVerification);

  const tax = useMemo(() => subtotal * TAX_RATE, [subtotal]);
  const total = subtotal + tax;
  const shippingProgress = Math.min(1, subtotal / FREE_SHIPPING_THRESHOLD);
  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Animate item removal: play exit anim, then dispatch remove.
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  // Bump key on quantity change to retrigger the count-tick animation.
  const prevQty = useRef<Record<string, number>>({});
  const [tickKey, setTickKey] = useState<Record<string, number>>({});

  useEffect(() => {
    const next = { ...tickKey };
    let changed = false;
    for (const { product, quantity } of items) {
      const prior = prevQty.current[product.slug];
      if (prior !== undefined && prior !== quantity) {
        next[product.slug] = (next[product.slug] ?? 0) + 1;
        changed = true;
      }
      prevQty.current[product.slug] = quantity;
    }
    for (const slug of Object.keys(prevQty.current)) {
      if (!items.find((i) => i.product.slug === slug)) {
        delete prevQty.current[slug];
      }
    }
    if (changed) setTickKey(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function handleRemove(slug: string) {
    setRemoving((prev) => {
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
    window.setTimeout(() => {
      removeItem(slug);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }, REMOVE_ANIM_MS);
  }

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
            className="inline-flex items-center rounded-full bg-[var(--ink)] text-[var(--bg)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
          >
            Browse the shop
          </Link>
          <Link
            href="/leafmart/quiz"
            className="inline-flex items-center rounded-full border-[1.5px] border-[var(--ink)] text-[var(--ink)] px-7 py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--ink)] hover:text-[var(--bg)] transition-colors"
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
                className="block card-lift rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]"
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

      {/* Free-shipping progress bar */}
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-5 sm:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2.5">
          {shippingRemaining > 0 ? (
            <p className="text-[13px] text-[var(--text-soft)]">
              Add{" "}
              <span className="font-semibold text-[var(--leaf)] tabular-nums">
                {formatUSD(shippingRemaining)}
              </span>{" "}
              more for{" "}
              <span className="font-medium text-[var(--ink)]">free shipping</span>.
            </p>
          ) : (
            <p className="text-[13px] font-medium text-[var(--leaf)] flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M4 7.2L6 9L10 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              You unlocked free shipping.
            </p>
          )}
          <span className="text-[11.5px] tabular-nums text-[var(--muted)]">
            {formatUSD(subtotal)} / {formatUSD(FREE_SHIPPING_THRESHOLD)}
          </span>
        </div>
        <div className="h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--leaf)] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${shippingProgress * 100}%` }}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">
        <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {items.map(({ product, quantity }) => {
            const isRemoving = removing.has(product.slug);
            const tk = tickKey[product.slug] ?? 0;
            return (
              <li
                key={product.slug}
                className={`py-6 grid grid-cols-[160px_1fr] sm:grid-cols-[200px_1fr] gap-5 sm:gap-7 ${
                  isRemoving ? "lm-item-exit" : "lm-item-enter"
                }`}
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
                        className="w-11 h-11 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] active:scale-90 transition-all text-[16px]"
                      >
                        −
                      </button>
                      <span
                        key={`qty-${product.slug}-${tk}`}
                        className="w-11 text-center text-[14px] font-medium tabular-nums lm-count-tick inline-block"
                      >
                        {quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(product.slug, quantity + 1)}
                        aria-label={`Increase ${product.name} quantity`}
                        className="w-11 h-11 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] active:scale-90 transition-all text-[16px]"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => handleRemove(product.slug)}
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
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-[100px] rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7">
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
          {cartRequiresAge && (!isConfirmed || isDenied) ? (
            <button
              type="button"
              onClick={() => setAgeGateOpen(true)}
              aria-haspopup="dialog"
              className="mt-6 block w-full text-center rounded-full bg-[var(--ink)] text-[var(--bg)] py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
            >
              Continue to checkout
            </button>
          ) : (
            <Link
              href="/leafmart/checkout"
              className="mt-6 block w-full text-center rounded-full bg-[var(--ink)] text-[var(--bg)] py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
            >
              Continue to checkout
            </Link>
          )}

          <AgeGateModal
            open={ageGateOpen}
            onClose={() => setAgeGateOpen(false)}
            onConfirmed={() => router.push("/leafmart/checkout")}
          />

          {/* Trust signal stack */}
          <ul className="mt-5 space-y-3 text-[12px] text-[var(--text-soft)] leading-relaxed">
            <li className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                <rect x="2.5" y="6" width="9" height="6.5" rx="1.2" fill="none" stroke="var(--leaf)" strokeWidth="1.3" />
                <path d="M4.5 6V4.2a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="var(--leaf)" strokeWidth="1.3" />
              </svg>
              <span>
                <span className="font-medium text-[var(--ink)]">Secure checkout.</span>{" "}
                256-bit encryption, no card stored.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                <path d="M1.5 9.5h6.5a1.5 1.5 0 0 0 1.5-1.5V3H4a2.5 2.5 0 0 0-2.5 2.5v4z" fill="none" stroke="var(--leaf)" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M9.5 5.5h2.4a1 1 0 0 1 .85.47L13.5 7v2.5h-4" fill="none" stroke="var(--leaf)" strokeWidth="1.3" strokeLinejoin="round" />
                <circle cx="4.5" cy="10.5" r="1.2" fill="none" stroke="var(--leaf)" strokeWidth="1.3" />
                <circle cx="11" cy="10.5" r="1.2" fill="none" stroke="var(--leaf)" strokeWidth="1.3" />
              </svg>
              <span>
                <span className="font-medium text-[var(--ink)]">Ships in 1–2 business days.</span>{" "}
                Discreet, recyclable packaging.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                <circle cx="7" cy="7" r="6" fill="none" stroke="var(--leaf)" strokeWidth="1.3" />
                <path d="M4 7.2L6 9L10 5" fill="none" stroke="var(--leaf)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <span className="font-medium text-[var(--ink)]">30-day return policy.</span>{" "}
                <Link href="/leafmart/faq" className="underline hover:text-[var(--leaf)]">
                  See details
                </Link>
                .
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 flex-shrink-0" aria-hidden="true">
                <path d="M7 1.5l4.5 2v3.5c0 3-2 5-4.5 6-2.5-1-4.5-3-4.5-6V3.5L7 1.5z" fill="none" stroke="var(--leaf)" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M5 7.2L6.6 8.8L9.2 6" fill="none" stroke="var(--leaf)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <span className="font-medium text-[var(--ink)]">Lab COA on every order.</span>{" "}
                Third-party verified potency &amp; purity.
              </span>
            </li>
          </ul>
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
                  className="block card-lift rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]"
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

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart, formatUSD } from "@/lib/leafmart/cart-store";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={`fixed inset-0 z-40 bg-[var(--ink)]/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div>
            <p className="eyebrow text-[var(--text-soft)]">Your cart</p>
            <h2 className="font-display text-[24px] font-medium tracking-tight text-[var(--ink)]">
              {items.length === 0 ? "Empty" : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </h2>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-full w-9 h-9 flex items-center justify-center border border-[var(--border)] text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-8 text-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "var(--sage)" }}
              >
                <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                  <path
                    d="M6 9h20l-2 14a3 3 0 0 1-3 2.6H11A3 3 0 0 1 8 23L6 9z"
                    fill="none"
                    stroke="var(--leaf)"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11 9V7a5 5 0 0 1 10 0v2"
                    fill="none"
                    stroke="var(--leaf)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="font-display text-[22px] font-medium text-[var(--ink)]">
                Your cart is empty
              </p>
              <p className="text-[14px] text-[var(--text-soft)] leading-relaxed max-w-[260px]">
                Browse physician-curated formulas, lab-verified and ranked by real outcomes.
              </p>
              <Link
                href="/leafmart/shop"
                onClick={closeCart}
                className="mt-2 inline-flex items-center rounded-full bg-[var(--ink)] text-[#FFF8E8] px-6 py-3 text-[13px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
              >
                Browse the shop
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {items.map(({ product, quantity }) => (
                <li key={product.slug} className="px-6 py-5 flex gap-4">
                  <div
                    className="w-[68px] h-[68px] rounded-2xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: product.bg }}
                  >
                    <span
                      className="font-display text-[18px] font-medium"
                      style={{ color: product.deep }}
                    >
                      {product.name.slice(0, 1)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="eyebrow text-[var(--text-soft)] mb-1">{product.partner}</p>
                    <p className="font-display text-[16px] font-medium text-[var(--ink)] leading-tight truncate">
                      {product.name}
                    </p>
                    <p className="text-[12px] text-[var(--muted)] mt-0.5">{product.dose}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[var(--border)] rounded-full overflow-hidden">
                        <button
                          onClick={() => updateQuantity(product.slug, quantity - 1)}
                          aria-label={`Decrease ${product.name} quantity`}
                          className="w-8 h-8 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-[13px] font-medium tabular-nums">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.slug, quantity + 1)}
                          aria-label={`Increase ${product.name} quantity`}
                          className="w-8 h-8 flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-display text-[17px] font-medium text-[var(--ink)] tabular-nums">
                        {formatUSD(product.price * quantity)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeItem(product.slug)}
                      className="mt-2 text-[12px] text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-[var(--border)] px-6 py-5 bg-[var(--bg)]">
            <div className="flex items-center justify-between mb-4">
              <span className="eyebrow text-[var(--text-soft)]">Subtotal</span>
              <span className="font-display text-[24px] font-medium text-[var(--ink)] tabular-nums">
                {formatUSD(subtotal)}
              </span>
            </div>
            <p className="text-[12px] text-[var(--muted)] mb-4 leading-relaxed">
              Shipping &amp; tax calculated at checkout.
            </p>
            <Link
              href="/leafmart/checkout"
              onClick={closeCart}
              className="block w-full text-center rounded-full bg-[var(--ink)] text-[#FFF8E8] py-4 text-[14px] font-medium tracking-wide hover:bg-[var(--leaf)] transition-colors"
            >
              Checkout
            </Link>
            <Link
              href="/leafmart/cart"
              onClick={closeCart}
              className="block w-full text-center mt-2 py-3 text-[13px] font-medium text-[var(--ink)] hover:text-[var(--leaf)] transition-colors"
            >
              View full cart
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}

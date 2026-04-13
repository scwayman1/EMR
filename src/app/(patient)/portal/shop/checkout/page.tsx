"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useCart } from "@/components/marketplace/CartProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(cents: number): string {
  return `$${cents.toFixed(2)}`;
}

const TAX_RATE = 0.08;

const INPUT_CLASS =
  "flex w-full rounded-md border border-border-strong bg-surface px-3 h-10 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const [confirmed, setConfirmed] = useState(false);

  const estimatedTax = subtotal * TAX_RATE;
  const total = subtotal + estimatedTax;
  const isEmpty = items.length === 0;

  // ── Order confirmed state ───────────────────────────────────────────────
  if (confirmed) {
    return (
      <PageShell maxWidth="max-w-[1100px]">
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-6">
            <svg
              className="w-8 h-8 text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-text tracking-tight">
            Order Confirmed
          </h1>
          <p className="text-sm text-text-muted mt-2 max-w-md">
            Thank you for your order. You will receive a confirmation email
            shortly with tracking details.
          </p>
          <Link href="/portal/shop" className="mt-8">
            <Button variant="primary" size="lg">
              Back to Shop
            </Button>
          </Link>
        </div>
      </PageShell>
    );
  }

  // ── Empty cart state ────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <PageShell maxWidth="max-w-[1100px]">
        <Link
          href="/portal/shop"
          className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text transition-colors duration-200 mb-6"
        >
          <span aria-hidden="true">&larr;</span>
          Back to Shop
        </Link>

        <PageHeader title="Checkout" />

        <EmptyState
          title="Your cart is empty"
          description="Add some products before checking out."
          action={
            <Link href="/portal/shop">
              <Button variant="primary">Continue shopping</Button>
            </Link>
          }
        />
      </PageShell>
    );
  }

  // ── Handle place order ──────────────────────────────────────────────────
  function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    clearCart();
    setConfirmed(true);
  }

  // ── Checkout layout ─────────────────────────────────────────────────────
  return (
    <PageShell maxWidth="max-w-[1100px]">
      {/* Back link */}
      <Link
        href="/portal/shop/cart"
        className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text transition-colors duration-200 mb-6"
      >
        <span aria-hidden="true">&larr;</span>
        Back to Cart
      </Link>

      <PageHeader title="Checkout" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* ── Left: Order summary ────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-text mb-4">
            Order Summary
          </h2>

          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? ""}`}
                className="flex items-center justify-between py-3 first:pt-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Qty: {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium text-text tabular-nums shrink-0 ml-4">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Estimated tax</span>
              <span className="tabular-nums">
                {formatCurrency(estimatedTax)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold text-text">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Shipping + payment form ─────────────────────────── */}
        <div>
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-base font-semibold text-text mb-5">
                Shipping Information
              </h2>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Name */}
                <div>
                  <label
                    htmlFor="checkout-name"
                    className="block text-sm font-medium text-text mb-1.5"
                  >
                    Full name
                  </label>
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className={INPUT_CLASS}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="checkout-email"
                    className="block text-sm font-medium text-text mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    placeholder="jane@example.com"
                    className={INPUT_CLASS}
                  />
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor="checkout-address"
                    className="block text-sm font-medium text-text mb-1.5"
                  >
                    Address
                  </label>
                  <input
                    id="checkout-address"
                    type="text"
                    required
                    placeholder="123 Main St"
                    className={INPUT_CLASS}
                  />
                </div>

                {/* City / State / Zip */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label
                      htmlFor="checkout-city"
                      className="block text-sm font-medium text-text mb-1.5"
                    >
                      City
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      required
                      placeholder="Portland"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="col-span-1">
                    <label
                      htmlFor="checkout-state"
                      className="block text-sm font-medium text-text mb-1.5"
                    >
                      State
                    </label>
                    <input
                      id="checkout-state"
                      type="text"
                      required
                      placeholder="OR"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div className="col-span-1">
                    <label
                      htmlFor="checkout-zip"
                      className="block text-sm font-medium text-text mb-1.5"
                    >
                      Zip
                    </label>
                    <input
                      id="checkout-zip"
                      type="text"
                      required
                      placeholder="97201"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {/* Trust line */}
                <p className="text-xs text-text-muted text-center pt-2">
                  Secure checkout — your information is protected.
                </p>

                {/* Submit */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Place order
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

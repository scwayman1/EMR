"use client";

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  const estimatedTax = subtotal * TAX_RATE;
  const total = subtotal + estimatedTax;
  const isEmpty = items.length === 0;

  return (
    <PageShell maxWidth="max-w-[1100px]">
      {/* Back link */}
      <Link
        href="/portal/shop"
        className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text transition-colors duration-200 mb-6"
      >
        <span aria-hidden="true">&larr;</span>
        Continue shopping
      </Link>

      <PageHeader title="Your Cart" />

      {isEmpty ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse the marketplace and add products to get started."
          action={
            <Link href="/portal/shop">
              <Button variant="primary">Continue shopping</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Cart items ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="divide-y divide-border">
              {items.map((item) => {
                const lineTotal = item.price * item.quantity;

                return (
                  <div
                    key={`${item.productId}-${item.variantId ?? ""}`}
                    className="flex items-start justify-between gap-4 py-5 first:pt-0"
                  >
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {item.name}
                      </p>
                      {item.variantId && (
                        <p className="text-xs text-text-muted mt-0.5">
                          Variant: {item.variantId}
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        {formatCurrency(item.price)} each
                      </p>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity - 1,
                              item.variantId
                            )
                          }
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-surface text-sm font-medium text-text hover:bg-surface-muted transition-colors"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium text-text w-6 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.quantity + 1,
                              item.variantId
                            )
                          }
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-surface text-sm font-medium text-text hover:bg-surface-muted transition-colors"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Line total + remove */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="text-sm font-semibold text-text tabular-nums">
                        {formatCurrency(lineTotal)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(item.productId, item.variantId)
                        }
                        className="text-xs text-text-muted hover:text-danger transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Order summary ──────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-base font-semibold text-text">
                  Order Summary
                </h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-text-muted">
                    <span>Subtotal</span>
                    <span className="tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Estimated tax</span>
                    <span className="tabular-nums">
                      {formatCurrency(estimatedTax)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-semibold text-text">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <Link href="/portal/shop/checkout" className="block">
                  <Button variant="primary" size="lg" className="w-full">
                    Proceed to checkout
                  </Button>
                </Link>

                <Link
                  href="/portal/shop"
                  className="block text-center text-sm text-text-muted hover:text-text transition-colors"
                >
                  Continue shopping
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}

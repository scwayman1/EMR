"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

/**
 * Small cart link that surfaces the current item count from the cart
 * provider. Renders inside the shop topbar so users always have a
 * one-click path to their cart from any shop surface.
 */
export function CartBadgeLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/portal/shop/cart"
      className="relative inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
      aria-label={`Cart (${itemCount} item${itemCount === 1 ? "" : "s"})`}
    >
      <span aria-hidden="true">{"\u{1F6D2}"}</span>
      <span className="hidden sm:inline">Cart</span>
      {itemCount > 0 && (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold tabular-nums">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

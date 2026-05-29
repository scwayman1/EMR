"use client";

// EMR-188 / EMR-303 — Amazon-style storefront top bar: wordmark, prominent
// search, and a live cart count. Sits above the department nav.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, Leaf } from "lucide-react";
import { useStoreCart } from "./cart";

export function ShopTopBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const { itemCount } = useStoreCart();
  const [query, setQuery] = React.useState(initialQuery);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-12">
        <Link href="/shop" className="flex shrink-0 items-center gap-1.5 font-display text-lg text-text">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-accent-ink">
            <Leaf width={18} height={18} />
          </span>
          <span className="hidden sm:inline">Leafmart</span>
        </Link>

        <form onSubmit={onSearch} className="flex flex-1 items-center">
          <div className="flex w-full items-center rounded-full border border-border bg-surface-raised pl-4 pr-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the cannabis marketplace…"
              className="h-9 flex-1 bg-transparent text-[14px] text-text placeholder:text-text-subtle focus:outline-none"
              aria-label="Search products"
            />
            <button
              type="submit"
              className="grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-ink"
              aria-label="Search"
            >
              <Search width={15} height={15} />
            </button>
          </div>
        </form>

        <Link
          href="/shop/checkout"
          className="relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-medium text-text hover:bg-surface-muted"
          aria-label={`Cart, ${itemCount} items`}
        >
          <ShoppingCart width={20} height={20} />
          <span className="hidden sm:inline">Cart</span>
          {itemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-accent-ink">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

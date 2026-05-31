"use client";

// EMR-188 — PDP purchase panel: quantity stepper + add to cart, with a
// confirmation state. Pairs with the Share and Compare controls on the PDP.

import * as React from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreCart, formatUSD } from "./cart";

export function AddToCartPanel({
  slug,
  name,
  brand,
  price,
  distributorId,
}: {
  slug: string;
  name: string;
  brand: string;
  price: number;
  distributorId?: string;
}) {
  const { add } = useStoreCart();
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const onAdd = () => {
    add({ slug, name, brand, price, distributorId }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl text-text">{formatUSD(price)}</span>
        <div className="flex items-center rounded-full border border-border">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="grid h-9 w-9 place-items-center rounded-l-full text-text-muted hover:bg-surface-muted"
            aria-label="Decrease quantity"
          >
            <Minus width={15} height={15} />
          </button>
          <span className="w-9 text-center text-[14px] tabular-nums text-text" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="grid h-9 w-9 place-items-center rounded-r-full text-text-muted hover:bg-surface-muted"
            aria-label="Increase quantity"
          >
            <Plus width={15} height={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Button
          type="button"
          onClick={onAdd}
          leadingIcon={added ? <Check width={16} height={16} /> : <ShoppingCart width={16} height={16} />}
          className="w-full"
        >
          {added ? "Added to cart" : "Add to cart"}
        </Button>
        <Link href="/shop/checkout" className="w-full">
          <Button variant="secondary" className="w-full">
            Go to checkout
          </Button>
        </Link>
      </div>
    </div>
  );
}

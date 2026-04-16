"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "./CartProvider";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

interface AddToCartIslandProps {
  product: MarketplaceProduct;
}

/**
 * Client-side interactive area on the product detail page: variant
 * selector + Add to Cart button. Owns variant selection state and
 * "added to cart" confirmation feedback.
 */
export function AddToCartIsland({ product }: AddToCartIslandProps) {
  const { addItem } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    product.variants[0]?.id,
  );
  const [justAdded, setJustAdded] = useState(false);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const effectivePrice = selectedVariant?.price ?? product.price;
  const canBuy = product.inStock && (selectedVariant?.inStock ?? true);

  function handleAdd() {
    addItem(product.id, selectedVariantId, effectivePrice, product.name);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <div className="space-y-4">
      {/* Variant selector */}
      {product.variants.length > 1 && (
        <div className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            Size
          </span>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const isSelected = variant.id === selectedVariantId;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => variant.inStock && setSelectedVariantId(variant.id)}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    isSelected
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-surface text-text hover:bg-surface-muted"
                  } ${!variant.inStock ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!variant.inStock}
                  aria-pressed={isSelected}
                >
                  {variant.name}
                  {variant.price !== product.variants[0]?.price && (
                    <span className="ml-1.5 text-text-subtle">
                      ${variant.price.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add to cart */}
      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!canBuy}
        onClick={handleAdd}
      >
        {!canBuy
          ? "Out of stock"
          : justAdded
            ? "Added \u2713"
            : `Add to cart \u00b7 $${effectivePrice.toFixed(2)}`}
      </Button>

      {justAdded && (
        <p className="text-xs text-success text-center" role="status">
          Added to your cart.
        </p>
      )}
    </div>
  );
}

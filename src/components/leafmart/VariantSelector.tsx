"use client";

import type { LeafmartVariant } from "./LeafmartProductCard";

interface Props {
  variants: LeafmartVariant[];
  selectedId: string;
  onSelect: (variantId: string) => void;
}

/** Pill-style size/format selector. Renders nothing for single-variant SKUs. */
export function VariantSelector({ variants, selectedId, onSelect }: Props) {
  if (variants.length <= 1) return null;
  return (
    <div className="mb-7 sm:mb-8">
      <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--muted)] font-medium mb-2.5">
        Size
      </p>
      <div className="flex flex-wrap gap-2">
        {variants.map((v) => {
          const selected = v.id === selectedId;
          const disabled = !v.inStock;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => !disabled && onSelect(v.id)}
              disabled={disabled}
              aria-pressed={selected}
              className={`px-4 py-2.5 rounded-full border text-[13px] font-medium transition-all duration-200 ${
                disabled
                  ? "border-[var(--border)] text-[var(--muted)] line-through cursor-not-allowed"
                  : selected
                    ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] scale-[1.02]"
                    : "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:border-[var(--ink)]"
              }`}
            >
              {v.name}
              {!disabled && (
                <span
                  className={`ml-2 text-[12px] tabular-nums ${
                    selected ? "text-[#FFF8E8]/75" : "text-[var(--muted)]"
                  }`}
                >
                  ${v.price}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface PriceProps {
  price: number;
  compareAtPrice?: number | null;
}

/** Display block: current price + compare-at strikethrough + savings badge. */
export function PriceDisplay({ price, compareAtPrice }: PriceProps) {
  const showCompare = !!compareAtPrice && compareAtPrice > price;
  const savings = showCompare ? Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100) : 0;
  return (
    <div className="inline-flex items-baseline gap-3 flex-wrap">
      <span className="font-display text-[32px] sm:text-[36px] font-medium text-[var(--ink)] tabular-nums">
        ${price}
      </span>
      {showCompare && (
        <>
          <span className="text-[var(--muted)] text-[16px] line-through tabular-nums">
            ${compareAtPrice}
          </span>
          <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-1 rounded-full bg-[var(--leaf-soft)] text-[var(--leaf)]">
            Save {savings}%
          </span>
        </>
      )}
    </div>
  );
}

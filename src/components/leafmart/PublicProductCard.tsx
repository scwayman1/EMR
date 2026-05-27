import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/marketplace/RatingStars";
import { ProductTile } from "./ProductTile";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

/**
 * Leafmart's public product card. No add-to-cart affordance (public
 * surface doesn't wire checkout). All CTAs route to the PDP.
 *
 * Visual contract: every card is a two-block stack — a brand-coded
 * ProductTile at the top and an editorial info block below. Resting
 * shadow is hairline `shadow-sm`; hover gains depth + subtle lift.
 */
export function PublicProductCard({
  product,
  className,
}: {
  product: MarketplaceProduct;
  className?: string;
}) {
  return (
    <Link
      href={`/leafmart/products/${product.slug}`}
      className={cn(
        "group flex flex-col rounded-lg border border-border bg-surface overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-border-strong",
        className,
      )}
    >
      <ProductTile
        format={product.format}
        brand={product.brand}
        className="transition-transform duration-500 group-hover:scale-[1.02]"
      />

      <div className="p-5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle truncate">
            {product.brand}
          </p>
          {product.clinicianPick && (
            <Badge tone="accent" className="shrink-0 text-[10px]">
              Pick
            </Badge>
          )}
        </div>

        <p className="font-display text-lg leading-snug tracking-tight text-text group-hover:text-accent transition-colors line-clamp-2 min-h-[2.75rem]">
          {product.name}
        </p>

        {/* Cannabinoid micro-badges */}
        {(product.thcContent != null || product.cbdContent != null) && (
          <div className="flex gap-1.5 mt-1">
            {product.thcContent != null && (
              <span className="inline-flex items-center rounded bg-surface-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-text-muted tabular-nums">
                THC {product.thcContent}%
              </span>
            )}
            {product.cbdContent != null && (
              <span className="inline-flex items-center rounded bg-surface-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-text-muted tabular-nums">
                CBD {product.cbdContent}%
              </span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-auto pt-2">
          <span className="text-base font-semibold text-text tabular-nums">
            ${product.price.toFixed(2)}
          </span>
          {product.compareAtPrice != null &&
            product.compareAtPrice > product.price && (
              <span className="text-xs text-text-subtle line-through tabular-nums">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          {product.reviewCount > 0 && (
            <span className="ml-auto">
              <RatingStars
                rating={product.averageRating}
                count={product.reviewCount}
              />
            </span>
          )}
        </div>

        {!product.inStock && (
          <p className="text-xs text-text-subtle">Out of stock</p>
        )}
      </div>
    </Link>
  );
}

export function PublicProductGrid({
  products,
  columns = 3,
  className,
}: {
  products: MarketplaceProduct[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols: Record<number, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };
  return (
    <div className={cn("grid gap-6", cols[columns], className)}>
      {products.map((p) => (
        <PublicProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

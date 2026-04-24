import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/marketplace/RatingStars";
import type { MarketplaceProduct } from "@/lib/marketplace/types";
import { FORMAT_LABELS } from "@/lib/marketplace/types";

/**
 * Public product card for Leafmart. Differs from the portal ProductCard
 * in that it has no add-to-cart affordance — all CTAs route to the PDP,
 * and the "buy" action only appears inside the authenticated portal.
 */
export function PublicProductCard({
  product,
  className,
}: {
  product: MarketplaceProduct;
  className?: string;
}) {
  const formatLabel = FORMAT_LABELS[product.format] ?? product.format;

  return (
    <Link
      href={`/leafmart/products/${product.slug}`}
      className={cn(
        "group rounded-lg border border-border bg-surface overflow-hidden transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="aspect-[4/3] bg-surface-muted flex items-center justify-center">
        <span className="text-sm font-medium text-text-subtle tracking-wide capitalize">
          {formatLabel}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-xs uppercase tracking-wider text-text-subtle truncate">
            {product.brand}
          </p>
          {product.clinicianPick && (
            <Badge tone="accent" className="shrink-0 text-[10px]">
              Pick
            </Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-text group-hover:text-accent transition-colors line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </p>

        {/* Cannabinoid micro-badges */}
        {(product.thcContent != null || product.cbdContent != null) && (
          <div className="flex gap-1.5 mt-2">
            {product.thcContent != null && (
              <span className="inline-flex items-center rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted tabular-nums">
                THC {product.thcContent}%
              </span>
            )}
            {product.cbdContent != null && (
              <span className="inline-flex items-center rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted tabular-nums">
                CBD {product.cbdContent}%
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm font-semibold text-text">
            ${product.price.toFixed(2)}
          </span>
          {product.compareAtPrice != null &&
            product.compareAtPrice > product.price && (
              <span className="text-xs text-text-subtle line-through">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
        </div>

        {product.reviewCount > 0 && (
          <div className="mt-2">
            <RatingStars
              rating={product.averageRating}
              count={product.reviewCount}
            />
          </div>
        )}

        {!product.inStock && (
          <p className="text-xs text-text-subtle mt-2">Out of stock</p>
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
    <div className={cn("grid gap-5", cols[columns], className)}>
      {products.map((p) => (
        <PublicProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

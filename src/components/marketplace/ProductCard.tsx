import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/marketplace/RatingStars";
import type { MarketplaceProduct } from "@/lib/marketplace/types";
import { FORMAT_LABELS } from "@/lib/marketplace/types";

const FORMAT_ICONS: Record<string, string> = {
  tincture: "\u2697",
  flower: "\u2698",
  edible: "\u2615",
  topical: "\u2740",
  capsule: "\u25CF",
  vape: "\u2601",
  concentrate: "\u25C6",
  patch: "\u25A3",
};

interface ProductCardProps {
  product: MarketplaceProduct;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const formatIcon = FORMAT_ICONS[product.format] ?? "\u25CB";
  const formatLabel = FORMAT_LABELS[product.format] ?? product.format;

  return (
    <Link
      href={`/portal/shop/products/${product.slug}`}
      className={cn("group block", className)}
    >
      <Card className="h-full flex flex-col transition-shadow duration-200 ease-smooth hover:shadow-md">
        {/* Image placeholder */}
        <div className="relative aspect-square bg-surface-muted rounded-t-lg flex items-center justify-center overflow-hidden">
          <span className="text-4xl text-text-subtle select-none" aria-hidden="true">
            {formatIcon}
          </span>
          {product.clinicianPick && (
            <Badge
              tone="accent"
              className="absolute top-3 left-3"
            >
              Clinician Pick
            </Badge>
          )}
          {!product.inStock && (
            <div className="absolute inset-0 bg-surface/60 flex items-center justify-center">
              <span className="text-sm font-medium text-text-muted">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        <CardContent className="flex flex-col flex-1 gap-2 pt-4">
          {/* Brand */}
          <span className="text-xs font-medium uppercase tracking-wide text-text-subtle">
            {product.brand}
          </span>

          {/* Name */}
          <h3 className="text-sm font-semibold text-text leading-snug group-hover:text-accent transition-colors duration-200">
            {product.name}
          </h3>

          {/* Short description */}
          <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Cannabinoid badges */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {typeof product.thcContent === "number" && (
              <Badge tone="neutral" className="text-[11px]">
                THC {product.thcContent}%
              </Badge>
            )}
            {typeof product.cbdContent === "number" && (
              <Badge tone="neutral" className="text-[11px]">
                CBD {product.cbdContent}%
              </Badge>
            )}
            <Badge tone="neutral" className="text-[11px]">
              {formatLabel}
            </Badge>
          </div>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <RatingStars
              rating={product.averageRating}
              count={product.reviewCount}
            />
          )}

          {/* Spacer to push price and button to bottom */}
          <div className="flex-1" />

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-semibold text-text">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice != null &&
              product.compareAtPrice > product.price && (
                <span className="text-xs text-text-subtle line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
          </div>

          {/* CTA */}
          <div className="w-full mt-2 h-8 flex items-center justify-center rounded-md bg-accent text-white text-sm font-medium">
            {product.inStock ? "View product" : "Unavailable"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

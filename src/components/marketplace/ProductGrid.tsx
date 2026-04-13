import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/components/marketplace/ProductCard";
import type { MarketplaceProduct } from "@/lib/marketplace/types";

const COLUMN_CLASSES: Record<number, string> = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

interface ProductGridProps {
  products: MarketplaceProduct[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ProductGrid({
  products,
  columns = 3,
  className,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Try adjusting your search or filters to find what you are looking for."
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid gap-6",
        COLUMN_CLASSES[columns],
        className
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

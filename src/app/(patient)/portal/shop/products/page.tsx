import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { SearchBar } from "@/components/marketplace/SearchBar";
import { searchProducts, PRODUCTS, CATEGORIES } from "@/lib/marketplace/data";
import type { ProductFormat } from "@/lib/marketplace/types";
import { FORMAT_LABELS } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    format?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const q = params.q;
  const category = params.category;
  const format = params.format as ProductFormat | undefined;

  // Build filtered product list
  let products = PRODUCTS;

  if (q) {
    products = searchProducts(q);
  }

  if (category) {
    const cat = CATEGORIES.find(
      (c) => c.slug === category || c.id === category
    );
    if (cat) {
      products = products.filter((p) => p.categoryIds.includes(cat.id));
    }
  }

  if (format) {
    products = products.filter((p) => p.format === format);
  }

  // Title logic
  const title = q ? `Results for '${q}'` : "All Products";

  // Active filter labels for display
  const activeCategory = category
    ? CATEGORIES.find((c) => c.slug === category || c.id === category)
    : undefined;
  const activeFormatLabel = format ? FORMAT_LABELS[format] : undefined;

  return (
    <PageShell maxWidth="max-w-[1100px]">
      {/* Back link */}
      <Link
        href="/portal/shop"
        className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text transition-colors duration-200 mb-6"
      >
        <span aria-hidden="true">&larr;</span>
        Back to Shop
      </Link>

      <PageHeader title={title} />

      {/* Search + result count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <SearchBar defaultValue={q} />
        <p className="text-sm text-text-muted whitespace-nowrap">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* Active filters */}
      {(activeCategory || activeFormatLabel) && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-text-subtle">Filtered by:</span>
          {activeCategory && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-medium text-text-muted">
              {activeCategory.name}
              <Link
                href={{
                  pathname: "/portal/shop/products",
                  query: {
                    ...(q ? { q } : {}),
                    ...(format ? { format } : {}),
                  },
                }}
                className="ml-0.5 text-text-subtle hover:text-text"
                aria-label={`Remove ${activeCategory.name} filter`}
              >
                &times;
              </Link>
            </span>
          )}
          {activeFormatLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-medium text-text-muted">
              {activeFormatLabel}
              <Link
                href={{
                  pathname: "/portal/shop/products",
                  query: {
                    ...(q ? { q } : {}),
                    ...(category ? { category } : {}),
                  },
                }}
                className="ml-0.5 text-text-subtle hover:text-text"
                aria-label={`Remove ${activeFormatLabel} filter`}
              >
                &times;
              </Link>
            </span>
          )}
        </div>
      )}

      {/* Product grid */}
      <ProductGrid products={products} columns={3} />
    </PageShell>
  );
}

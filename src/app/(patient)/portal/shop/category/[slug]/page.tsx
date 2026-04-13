import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCategoryBySlug,
  getProductsByCategory,
  PRODUCTS,
} from "@/lib/marketplace/data";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  return { title: category?.name ?? "Category" };
}

// ---------------------------------------------------------------------------
// Collection slug helpers
// ---------------------------------------------------------------------------

const COLLECTION_FILTERS: Record<
  string,
  (p: (typeof PRODUCTS)[number]) => boolean
> = {
  "clinician-picks": (p) => p.clinicianPick,
  "best-sellers": (p) => p.featured,
  "beginner-friendly": (p) => p.beginnerFriendly,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return (
      <PageShell maxWidth="max-w-[1100px]">
        <Link
          href="/portal/shop"
          className="inline-flex items-center gap-1.5 text-sm text-text-subtle hover:text-text transition-colors duration-200 mb-6"
        >
          <span aria-hidden="true">&larr;</span>
          Back to Shop
        </Link>

        <EmptyState
          title="Category not found"
          description="The category you are looking for does not exist or may have been removed."
          action={
            <Link
              href="/portal/shop"
              className="inline-flex items-center justify-center rounded-md bg-accent text-white font-medium text-sm h-10 px-4 hover:bg-accent/90 transition-colors"
            >
              Browse all products
            </Link>
          }
        />
      </PageShell>
    );
  }

  // Determine products — special handling for collection slugs
  const collectionFilter = COLLECTION_FILTERS[slug];
  const products = collectionFilter
    ? PRODUCTS.filter(collectionFilter)
    : getProductsByCategory(slug);

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

      <PageHeader title={category.name} description={category.description} />

      {products.length > 0 ? (
        <ProductGrid products={products} columns={3} />
      ) : (
        <EmptyState
          title="No products yet"
          description="There are no products in this category right now. Check back soon."
        />
      )}
    </PageShell>
  );
}

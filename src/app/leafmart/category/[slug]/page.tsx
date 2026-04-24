import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PublicProductGrid } from "@/components/leafmart/PublicProductCard";
import {
  getPublicCategoryBySlug,
  getPublicProductsByCategory,
} from "@/lib/marketplace/public-queries";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);
  return { title: category?.name ?? "Category" };
}

export default async function LeafmartCategoryPage({
  params,
}: CategoryPageProps) {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16">
        <div className="flex items-center gap-2 text-xs text-text-subtle mb-6">
          <Link href="/leafmart" className="hover:text-text transition-colors">
            Leafmart
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text">Not found</span>
        </div>
        <EmptyState
          title="Category not found"
          description="This category doesn't exist or may have been renamed."
          action={
            <Link
              href="/leafmart/products"
              className="text-sm text-accent hover:underline"
            >
              Browse all products →
            </Link>
          }
        />
      </div>
    );
  }

  const products = await getPublicProductsByCategory(slug);

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12">
      <div className="flex items-center gap-2 text-xs text-text-subtle mb-6">
        <Link href="/leafmart" className="hover:text-text transition-colors">
          Leafmart
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href="/leafmart/products"
          className="hover:text-text transition-colors"
        >
          Shop
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text">{category.name}</span>
      </div>

      <header className="mb-10 max-w-2xl">
        {category.icon && (
          <span
            className="block text-3xl text-accent mb-3"
            aria-hidden="true"
          >
            {category.icon}
          </span>
        )}
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-text">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-sm text-text-muted mt-2 leading-relaxed">
            {category.description}
          </p>
        )}
        <p className="text-xs text-text-subtle mt-3">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </header>

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="We haven't curated anything for this category yet. Check back soon."
        />
      ) : (
        <PublicProductGrid products={products} columns={4} />
      )}
    </div>
  );
}

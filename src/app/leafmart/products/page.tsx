import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/marketplace/SearchBar";
import { PublicProductGrid } from "@/components/leafmart/PublicProductCard";
import {
  getAllPublicProducts,
  searchPublicProducts,
  getPublicCategories,
} from "@/lib/marketplace/public-queries";
import { FORMAT_LABELS, type ProductFormat } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop all products" };

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    format?: string;
  }>;
}

export default async function LeafmartProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { q, category, format } = await searchParams;
  const formatFilter = format as ProductFormat | undefined;

  const [base, categories] = await Promise.all([
    q ? searchPublicProducts(q) : getAllPublicProducts(),
    getPublicCategories(),
  ]);

  let products = base;
  if (category) {
    const cat = categories.find(
      (c) => c.slug === category || c.id === category,
    );
    if (cat) products = products.filter((p) => p.categoryIds.includes(cat.id));
  }
  if (formatFilter) {
    products = products.filter((p) => p.format === formatFilter);
  }

  const activeCategory = category
    ? categories.find((c) => c.slug === category || c.id === category)
    : undefined;
  const activeFormatLabel = formatFilter
    ? FORMAT_LABELS[formatFilter]
    : undefined;
  const title = q ? `Results for "${q}"` : "All products";

  return (
    <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-12">
      <div className="flex items-center gap-2 text-xs text-text-subtle mb-6">
        <Link href="/leafmart" className="hover:text-text transition-colors">
          Leafmart
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-text">Shop</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight text-text">
            {title}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {products.length}{" "}
            {products.length === 1 ? "product" : "products"}
          </p>
        </div>
        <SearchBar defaultValue={q} className="w-full md:w-[360px]" />
      </div>

      {/* Format filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-medium uppercase tracking-wider text-text-subtle mr-1">
          Format
        </span>
        <FormatChip
          label="All"
          active={!formatFilter}
          href={{ pathname: "/leafmart/products", query: queryWithout({ q, category }, "format") }}
        />
        {(Object.keys(FORMAT_LABELS) as ProductFormat[]).map((f) => (
          <FormatChip
            key={f}
            label={FORMAT_LABELS[f]}
            active={formatFilter === f}
            href={{
              pathname: "/leafmart/products",
              query: queryWith({ q, category, format: f }),
            }}
          />
        ))}
      </div>

      {/* Active filter pills */}
      {(activeCategory || activeFormatLabel) && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] uppercase tracking-wider text-text-subtle">
            Filters:
          </span>
          {activeCategory && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-medium text-text-muted">
              {activeCategory.name}
              <Link
                href={{
                  pathname: "/leafmart/products",
                  query: queryWithout({ q, format }, "category"),
                }}
                className="ml-0.5 text-text-subtle hover:text-text"
                aria-label={`Remove ${activeCategory.name} filter`}
              >
                ×
              </Link>
            </span>
          )}
          {activeFormatLabel && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-medium text-text-muted">
              {activeFormatLabel}
              <Link
                href={{
                  pathname: "/leafmart/products",
                  query: queryWithout({ q, category }, "format"),
                }}
                className="ml-0.5 text-text-subtle hover:text-text"
                aria-label={`Remove ${activeFormatLabel} filter`}
              >
                ×
              </Link>
            </span>
          )}
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          title="No products match"
          description="Try adjusting your filters or removing your search."
        />
      ) : (
        <PublicProductGrid products={products} columns={4} />
      )}
    </div>
  );
}

function queryWith(parts: Record<string, string | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parts)) {
    if (v) out[k] = v;
  }
  return out;
}

function queryWithout(
  parts: Record<string, string | undefined>,
  drop: string,
) {
  const { [drop]: _dropped, ...rest } = parts;
  return queryWith(rest);
}

function FormatChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: Parameters<typeof Link>[0]["href"];
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface text-text-muted hover:text-text"
      }`}
    >
      {label}
    </Link>
  );
}

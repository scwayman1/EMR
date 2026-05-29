import Link from "next/link";
import { ShieldCheck, Sparkles, Truck, Leaf } from "lucide-react";
import {
  PRODUCTS,
  getClinicianPicks,
  getFeaturedProducts,
  searchProducts,
  getProductsByCategory,
  getCategoryBySlug,
} from "@/lib/marketplace/data";
import type { MarketplaceProduct } from "@/lib/marketplace/types";
import { StoreProductCard } from "@/components/store/StoreProductCard";
import { BenchmarkScorecard } from "@/components/store/BenchmarkScorecard";
import { Eyebrow } from "@/components/ui/ornament";
import { Button } from "@/components/ui/button";

// EMR-188 / EMR-303 — Storefront home. Amazon-style: curated rails,
// search + category results, trust signals, and the "rival Amazon"
// benchmark scorecard.

function ProductGrid({ products }: { products: MarketplaceProduct[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <StoreProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}

function Rail({ title, eyebrow, products }: { title: string; eyebrow: string; products: MarketplaceProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section className="mb-12">
      <Eyebrow className="mb-2">{eyebrow}</Eyebrow>
      <h2 className="mb-4 font-display text-2xl tracking-tight text-text">{title}</h2>
      <ProductGrid products={products.slice(0, 8)} />
    </section>
  );
}

const TRUST = [
  { icon: Leaf, title: "Curated, not warehoused", body: "We're a distributor — every SKU is vetted, none is held by us." },
  { icon: ShieldCheck, title: "Lab-verified", body: "COAs on file, clinician-picked products flagged." },
  { icon: Truck, title: "Clear fulfillment", body: "Per-distributor handling times and return windows up front." },
  { icon: Sparkles, title: "AI throughout", body: "AI-curated details, Q&A summaries, and supply recommendations." },
];

export default function ShopHomePage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string };
}) {
  const q = searchParams?.q?.trim();
  const categorySlug = searchParams?.category?.trim();

  // Filtered view (search or category).
  if (q || categorySlug) {
    let products: MarketplaceProduct[] = [];
    let heading = "";
    if (q) {
      products = searchProducts(q);
      heading = `Results for “${q}”`;
    } else if (categorySlug) {
      const cat = getCategoryBySlug(categorySlug);
      products = getProductsByCategory(categorySlug);
      heading = cat ? cat.name : "Products";
    }
    return (
      <div className="px-4 py-8 lg:px-12">
        <h1 className="mb-1 font-display text-3xl tracking-tight text-text">{heading}</h1>
        <p className="mb-6 text-[14px] text-text-muted">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong/60 p-10 text-center">
            <p className="text-text-muted">No products matched. Try a different search.</p>
            <Link href="/shop" className="mt-3 inline-block">
              <Button variant="secondary" size="sm">
                Back to storefront
              </Button>
            </Link>
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    );
  }

  // Default storefront.
  const clinicianPicks = getClinicianPicks();
  const featured = getFeaturedProducts();
  const beginner = PRODUCTS.filter((p) => p.beginnerFriendly);

  return (
    <div className="px-4 py-8 lg:px-12">
      {/* Hero */}
      <section className="mb-10 overflow-hidden rounded-3xl border border-border bg-surface-raised p-8 sm:p-12">
        <Eyebrow className="mb-3">The Amazon of cannabis</Eyebrow>
        <h1 className="max-w-2xl font-display text-4xl leading-[1.05] tracking-tight text-text sm:text-5xl">
          Everything cannabis, <span className="text-accent">curated and verified.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-text-muted">
          A distributor marketplace built to rival Amazon — clinician picks, lab-verified COAs,
          AI-curated product details, reviews with photos, and a checkout that lets you compare
          before you pay.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop/supply">
            <Button leadingIcon={<Sparkles width={16} height={16} />}>Try the AI supply finder</Button>
          </Link>
          <Link href="/shop/distributors">
            <Button variant="secondary">How our marketplace works</Button>
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <section className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="rounded-2xl border border-border bg-surface p-4">
            <t.icon width={20} height={20} className="text-accent" />
            <p className="mt-2 font-medium text-text">{t.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">{t.body}</p>
          </div>
        ))}
      </section>

      <Rail eyebrow="Selected by our care team" title="Clinician picks" products={clinicianPicks} />
      <Rail eyebrow="Most trusted & reordered" title="Featured products" products={featured} />
      <Rail eyebrow="New to cannabis?" title="Beginner friendly" products={beginner} />

      <BenchmarkScorecard />
    </div>
  );
}

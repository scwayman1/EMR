import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { LeafmartProductGrid } from "@/components/leafmart/LeafmartProductCard";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

export const metadata: Metadata = {
  title: "All Products",
  description: "Browse every clinician-curated product on Leafmart.",
};

function ProductCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white border border-[var(--border)]" aria-hidden="true">
      <div className="lm-skeleton h-[260px] sm:h-[280px] w-full" />
      <div className="p-5">
        <div className="lm-skeleton h-3 w-1/2 rounded-full mb-3" />
        <div className="lm-skeleton h-5 w-3/4 rounded-md mb-3" />
        <div className="lm-skeleton h-3 w-full rounded-full mb-2" />
        <div className="lm-skeleton h-3 w-5/6 rounded-full" />
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-[var(--border)]">
          <div className="lm-skeleton h-4 w-24 rounded-full" />
          <div className="lm-skeleton h-9 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ProductsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px]"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <>
      <section className="px-4 sm:px-6 lg:px-14 pt-10 sm:pt-12 pb-6 sm:pb-8 max-w-[1440px] mx-auto lm-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between">
          <div>
            <p className="eyebrow text-[var(--leaf)] mb-2.5">All products</p>
            <h1 className="font-display text-[34px] sm:text-[48px] lg:text-[56px] font-normal tracking-[-1.2px] sm:tracking-[-1.4px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)]">
              Everything on <em className="font-accent not-italic text-[var(--leaf)]">the shelf</em>.
            </h1>
            <p className="mt-3 text-[14px] sm:text-[15px] text-[var(--text-soft)]">
              {DEMO_PRODUCTS.length} products · all clinician-reviewed · lab-verified
            </p>
          </div>
          <Link href="/leafmart/shop" className="text-sm font-medium text-[var(--leaf)] hover:underline mt-3 sm:mt-0">
            ← Shop by category
          </Link>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-14 py-6 sm:py-8 pb-14 sm:pb-20 max-w-[1440px] mx-auto">
        <Suspense fallback={<ProductsLoading />}>
          <div className="lm-stagger">
            <LeafmartProductGrid products={DEMO_PRODUCTS} />
          </div>
        </Suspense>
      </section>
    </>
  );
}

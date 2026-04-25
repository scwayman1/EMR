import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { LeafmartProductGrid } from "@/components/leafmart/LeafmartProductCard";
import { DEMO_PRODUCTS } from "@/components/leafmart/demo-data";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = DEMO_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) return { title: "Product" };
  return { title: product.name, description: product.support };
}

export default function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = DEMO_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const related = DEMO_PRODUCTS.filter((p) => p.slug !== params.slug).slice(0, 3);

  return (
    <>
      {/* Breadcrumb */}
      <div className="px-4 sm:px-6 lg:px-14 pt-5 sm:pt-6 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-2 text-[11.5px] sm:text-xs text-[var(--muted)] flex-wrap">
          <Link href="/leafmart" className="hover:text-[var(--leaf)]">Leafmart</Link>
          <span>·</span>
          <Link href="/leafmart/products" className="hover:text-[var(--leaf)]">Products</Link>
          <span>·</span>
          <span className="text-[var(--text)]">{product.name}</span>
        </div>
      </div>

      {/* Product hero */}
      <section className="px-4 sm:px-6 lg:px-14 py-6 sm:py-10 max-w-[1440px] mx-auto lm-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
          {/* Silhouette — appears above info on mobile, beside on desktop */}
          <div className="relative order-1">
            <ProductSilhouette shape={product.shape} bg={product.bg} deep={product.deep} height={480} big />
            {product.tag && (
              <div className="absolute top-4 left-4 sm:top-5 sm:left-5 bg-white text-[var(--ink)] px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11.5px] sm:text-[12px] font-semibold tracking-wide inline-flex items-center gap-2">
                <span className="w-[5px] h-[5px] rounded-full bg-[var(--leaf)]" />
                {product.tag}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="order-2 lg:pt-8">
            <p className="eyebrow text-[var(--muted)] mb-3">{product.partner} · {product.formatLabel}</p>
            <h1 className="font-display text-[32px] sm:text-[40px] lg:text-[48px] font-normal tracking-[-1.0px] sm:tracking-[-1.2px] leading-[1.05] text-[var(--ink)] mb-3 sm:mb-4">
              {product.name}
            </h1>
            <p className="text-[15.5px] sm:text-[17px] text-[var(--text-soft)] leading-relaxed max-w-[500px] mb-5 sm:mb-6">
              {product.support}
            </p>

            {/* Details */}
            <div className="space-y-3 mb-7 sm:mb-8">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[var(--muted)] w-16">Format</span>
                <span className="font-medium">{product.formatLabel}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[var(--muted)] w-16">Dose</span>
                <span className="font-medium">{product.dose}</span>
              </div>
            </div>

            {/* Trust chips */}
            <div className="flex flex-wrap gap-2 sm:gap-2.5 mb-7 sm:mb-8">
              {["Physician Curated", "Lab Verified", "Outcome Informed"].map((t) => (
                <span key={t} className="trust-chip">
                  <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3.5 6.2L5.2 7.8L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {t}
                </span>
              ))}
            </div>

            {/* Outcome ornament */}
            <div className="flex items-center gap-3 text-[var(--leaf)] mb-7 sm:mb-8 font-mono text-[13px] sm:text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
              {product.pct}% reported improvement · n={product.n}
            </div>

            {/* Price + CTA */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-5 sm:pt-6 border-t border-[var(--border)]">
              <span className="font-display text-[32px] sm:text-[36px] font-medium text-[var(--ink)]">${product.price}</span>
              <button className="bg-[var(--ink)] text-[#FFF8E8] rounded-full px-6 sm:px-8 py-3.5 sm:py-4 text-[14.5px] sm:text-[15px] font-medium hover:bg-[var(--leaf)] transition-colors flex-1 sm:flex-none min-w-[140px]">
                Add to cart
              </button>
              <div className="flex items-center gap-1.5 text-[var(--leaf)] text-[12px] font-semibold">
                <svg width="14" height="14" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M3.5 6.2L5.2 7.8L8.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                COA on file
              </div>
            </div>

            {/* Clinician note */}
            <div className="mt-8 sm:mt-10 rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6 border-l-4 border-[var(--leaf)]">
              <p className="eyebrow text-[var(--leaf)] mb-2">Clinician note</p>
              <p className="font-display text-[15.5px] sm:text-[17px] leading-relaxed text-[var(--text)]">
                &ldquo;We reviewed this product&apos;s COA and formulation. The cannabinoid profile matches the label, and the delivery format aligns with the intended use case.&rdquo;
              </p>
              <div className="flex items-center gap-2.5 mt-4">
                <div className="w-7 h-7 rounded-full bg-[var(--peach)] flex items-center justify-center font-display text-xs font-medium">MC</div>
                <div className="text-xs text-[var(--muted)]">Dr. M. Castellanos · Medical Lead</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 pb-14 sm:pb-20 max-w-[1440px] mx-auto border-t border-[var(--border)]">
          <div className="mb-6 sm:mb-8">
            <p className="eyebrow text-[var(--leaf)] mb-2">You might also like</p>
            <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">More from the shelf</h2>
          </div>
          <div className="lm-stagger">
            <LeafmartProductGrid products={related} />
          </div>
        </section>
      )}
    </>
  );
}

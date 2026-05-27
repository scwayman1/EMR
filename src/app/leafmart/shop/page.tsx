import Link from "next/link";
import type { Metadata } from "next";
import { ProductSilhouette } from "@/components/leafmart/ProductSilhouette";
import { CategoryIcon } from "@/components/leafmart/CategoryIcon";
import { getCategories } from "@/lib/leafmart/products";

export const metadata: Metadata = {
  title: "Shop by what you need",
  description: "Browse clinician-curated cannabis wellness products organized by how you want to feel.",
};

export const revalidate = 3600;

export default async function ShopPage() {
  const categories = await getCategories();
  return (
    <>
      <section className="px-4 sm:px-6 lg:px-14 pt-10 sm:pt-12 pb-6 sm:pb-8 max-w-[1440px] mx-auto lm-fade-in">
        <p className="eyebrow text-[var(--leaf)] mb-2.5">Shop</p>
        <h1 className="font-display text-[34px] sm:text-[48px] lg:text-[56px] font-normal tracking-[-1.2px] sm:tracking-[-1.4px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)]">
          Start with how you <em className="font-accent not-italic text-[var(--leaf)]">want to feel</em>.
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] text-[var(--text-soft)] max-w-[600px] leading-relaxed">
          Every shelf is reviewed by a licensed clinician. Pick a category, or browse everything.
        </p>
      </section>

      <section className="px-4 sm:px-6 lg:px-14 pb-14 sm:pb-20 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lm-stagger">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/leafmart/category/${c.slug}`}
              className="card-lift rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 flex items-center gap-6 sm:gap-8 overflow-hidden relative"
              style={{
                backgroundImage: `linear-gradient(180deg, ${c.bg} 0%, color-mix(in srgb, ${c.bg} 78%, ${c.deep}) 100%)`,
                backgroundColor: c.bg,
                minHeight: 180,
              }}
            >
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--chip-overlay)", color: c.deep }}
                  >
                    <CategoryIcon slug={c.slug} size={18} />
                  </div>
                  <h2 className="font-display text-[28px] sm:text-[36px] font-medium tracking-tight text-[var(--ink)] leading-[1.0]">{c.name}</h2>
                </div>
                <p className="text-[13.5px] sm:text-[14.5px] text-[var(--text-soft)] mt-2 leading-snug max-w-[280px]">{c.sub}</p>
                <div
                  className="mt-3 sm:mt-4 inline-flex items-center text-[10.5px] font-semibold tracking-[1.4px] uppercase"
                  style={{ color: c.deep }}
                >
                  {c.count} {c.count === 1 ? "product" : "products"} · all reviewed
                </div>
              </div>
              <div className="w-[110px] h-[150px] sm:w-[140px] sm:h-[180px] flex-shrink-0 hidden xs:block sm:block">
                <ProductSilhouette shape={c.shape} bg="transparent" deep={c.deep} height={180} />
              </div>
            </Link>
          ))}
        </div>

        {/* Browse all link */}
        <div className="mt-8 sm:mt-10 text-center">
          <Link
            href="/leafmart/products"
            className="inline-flex items-center justify-center rounded-full font-medium bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--leaf)] transition-colors w-full sm:w-auto px-6 py-3.5 sm:py-3 text-[14.5px] sm:text-[15px]"
          >
            Browse all products →
          </Link>
        </div>
      </section>
    </>
  );
}

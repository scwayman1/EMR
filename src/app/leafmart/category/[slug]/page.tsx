import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeafmartProductGrid } from "@/components/leafmart/LeafmartProductCard";
import { getCategories, getProductsByCategory } from "@/lib/leafmart/products";

const CATEGORY_META: Record<string, { title: string; headline: string; accent: string; bg: string }> = {
  sleep: { title: "Sleep", headline: "For evenings that should end quietly.", accent: "before bed", bg: "var(--sage)" },
  recovery: { title: "Recovery", headline: "Built for the day after a long one.", accent: "long days", bg: "var(--peach)" },
  calm: { title: "Calm", headline: "Take the edge off, gently.", accent: "gently", bg: "var(--butter)" },
  skin: { title: "Skin", headline: "Plant-powered skin recovery.", accent: "recovery", bg: "var(--rose)" },
  focus: { title: "Focus", headline: "Clarity when it counts.", accent: "clarity", bg: "var(--lilac)" },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = CATEGORY_META[params.slug];
  if (!cat) return { title: "Category" };
  return { title: `${cat.title} Shelf`, description: cat.headline };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = CATEGORY_META[params.slug];
  if (!cat) notFound();

  const [products, categories] = await Promise.all([
    getProductsByCategory(params.slug),
    getCategories(),
  ]);
  const catInfo = categories.find((c) => c.slug === params.slug);

  return (
    <>
      {/* Shelf header */}
      <section className="px-4 sm:px-6 lg:px-14 pt-10 sm:pt-12 pb-6 sm:pb-8 max-w-[1440px] mx-auto lm-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between">
          <div>
            <p className="eyebrow text-[var(--muted)] mb-1.5">
              Shelf · {cat.title}
            </p>
            <h1 className="font-display text-[34px] sm:text-[48px] lg:text-[56px] font-normal tracking-[-1.2px] sm:tracking-[-1.4px] leading-[1.05] sm:leading-[1.0] text-[var(--ink)]">
              {cat.headline}
            </h1>
            <p className="mt-3 text-[14px] sm:text-[15px] text-[var(--text-soft)]">
              {catInfo?.count ?? 0} products · all clinician-reviewed
            </p>
          </div>
          <Link href="/leafmart/shop" className="text-sm font-medium text-[var(--leaf)] hover:underline mt-3 sm:mt-0">
            ← All shelves
          </Link>
        </div>
      </section>

      {/* Category accent strip */}
      <div className="mx-4 sm:mx-6 lg:mx-14 h-1.5 rounded-full max-w-[1440px]" style={{ background: cat.bg }} />

      {/* Product grid */}
      <section className="px-4 sm:px-6 lg:px-14 py-8 sm:py-12 pb-14 sm:pb-20 max-w-[1440px] mx-auto">
        <div className="lm-stagger">
          <LeafmartProductGrid products={products} />
        </div>
      </section>
    </>
  );
}

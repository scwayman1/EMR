import type { Metadata } from "next";
import { PRODUCTS } from "@/lib/marketplace/data";
import { SupplyRecommender } from "@/components/store/SupplyRecommender";
import { Eyebrow } from "@/components/ui/ornament";

export const metadata: Metadata = {
  title: "AI Supply Store — Leafmart",
  description:
    "Tell us what you're managing and how you want to feel. Our AI ranks the cannabis and wellness supply catalog to you and explains every recommendation.",
};

// EMR-007 — AI-Powered Supply Store.
export default function SupplyStorePage() {
  return (
    <div className="px-4 py-8 lg:px-12">
      <div className="mb-6 max-w-2xl">
        <Eyebrow className="mb-2">AI-powered supply store</Eyebrow>
        <h1 className="font-display text-3xl tracking-tight text-text sm:text-4xl">
          Find the right supply, guided by AI
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
          No more guessing. Pick what you&apos;re managing and your goal — the recommender scores the
          catalog to you, surfaces clinician picks first, and tells you exactly why each product fits.
        </p>
      </div>
      <SupplyRecommender products={PRODUCTS} />
    </div>
  );
}

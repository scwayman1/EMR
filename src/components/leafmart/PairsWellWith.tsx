import { LeafmartProductGrid, type LeafmartProduct } from "./LeafmartProductCard";

interface Props {
  products: LeafmartProduct[];
}

export function PairsWellWith({ products }: Props) {
  if (products.length === 0) return null;
  return (
    <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 pb-14 sm:pb-20 max-w-[1440px] mx-auto border-t border-[var(--border)]">
      <div className="mb-6 sm:mb-8 max-w-[640px]">
        <p className="eyebrow text-[var(--leaf)] mb-2">Clinician also recommends</p>
        <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">
          Pairs well with
        </h2>
        <p className="mt-2 text-[14px] text-[var(--text-soft)]">
          Patients with similar goals reach for these alongside this product.
        </p>
      </div>
      <div className="lm-stagger">
        <LeafmartProductGrid products={products} />
      </div>
    </section>
  );
}

// EMR-307 — AI-curated Product Details list rendered on the PDP.
//
// Server component (no client interactivity needed). Two columns of
// scannable bullets — highlights on the left, full specs on the right.

import type {
  CuratedProductDetails,
  ProductDetailItem,
} from "@/lib/marketplace/product-details";

const EMPHASIS_TONE: Record<NonNullable<ProductDetailItem["emphasis"]>, string> = {
  trust: "text-[var(--leaf)]",
  warning: "text-amber-700",
  neutral: "text-[var(--text)]",
};

export function ProductDetailsList({ details }: { details: CuratedProductDetails }) {
  if (details.highlights.length === 0 && details.specs.length === 0) {
    return null;
  }

  return (
    <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto border-t border-[var(--border)]">
      <p className="eyebrow text-[var(--leaf)] mb-2">About this product</p>
      <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)] mb-6 sm:mb-8">
        Product details
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
        {details.highlights.length > 0 && (
          <div>
            <p className="eyebrow text-[var(--muted)] mb-3">Highlights</p>
            <ul className="space-y-2.5">
              {details.highlights.map((item, i) => (
                <DetailRow key={i} item={item} />
              ))}
            </ul>
          </div>
        )}

        {details.specs.length > 0 && (
          <div>
            <p className="eyebrow text-[var(--muted)] mb-3">Specifications</p>
            <ul className="space-y-2.5">
              {details.specs.map((item, i) => (
                <DetailRow key={i} item={item} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function DetailRow({ item }: { item: ProductDetailItem }) {
  const tone = item.emphasis ? EMPHASIS_TONE[item.emphasis] : "text-[var(--text)]";
  return (
    <li className="flex items-start gap-3 text-[14px] leading-relaxed">
      <span
        aria-hidden="true"
        className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--leaf)] shrink-0"
      />
      <div className="flex-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-[var(--muted)] text-[13px]">{item.label}</span>
        <span className={`font-medium ${tone}`}>{item.value}</span>
      </div>
    </li>
  );
}

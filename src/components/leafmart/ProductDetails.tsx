// EMR-307 — AI-curated Product Details.
//
// Summary block on the PDP that an AI step has stitched together from
// the COA, vendor copy, and our own clinician notes. Three sections:
//
//   • Highlights  — three to five scannable bullets
//   • Specifications — exhaustive label spec table
//   • Why it's on our shelf — the clinician rationale (free-form text)
//
// Pure server component (no interactivity required). The curation
// itself happens upstream in `curateProductDetails` — this component
// just renders whatever the curator returned and degrades gracefully
// when fields are missing.

import type { LeafmartProduct } from "./LeafmartProductCard";

export type DetailEmphasis = "trust" | "warning" | "neutral";

export interface ProductDetailRow {
  label: string;
  value: string;
  emphasis?: DetailEmphasis;
}

export interface CuratedDetails {
  highlights: ProductDetailRow[];
  specs: ProductDetailRow[];
  /** Free-form clinician rationale rendered as a pull-quote. */
  rationale?: string;
  /** True when the AI curator returned content; helps QA spot fallbacks. */
  aiCurated?: boolean;
}

interface Props {
  product: LeafmartProduct;
  details?: CuratedDetails;
}

const EMPHASIS_TONE: Record<DetailEmphasis, string> = {
  trust: "text-[var(--leaf)]",
  warning: "text-amber-700",
  neutral: "text-[var(--text)]",
};

export function ProductDetails({ product, details }: Props) {
  const resolved = details ?? deriveFallback(product);
  if (resolved.highlights.length === 0 && resolved.specs.length === 0) {
    return null;
  }

  return (
    <section className="px-4 sm:px-6 lg:px-14 py-10 sm:py-12 max-w-[1440px] mx-auto border-t border-[var(--border)]">
      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 flex-wrap">
        <div>
          <p className="eyebrow text-[var(--leaf)] mb-2">About this product</p>
          <h2 className="font-display text-[26px] sm:text-[32px] font-normal tracking-tight text-[var(--ink)]">
            Product details
          </h2>
        </div>
        {resolved.aiCurated && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] text-[var(--muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--leaf)]" />
            AI-curated · clinician-reviewed
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
        {resolved.highlights.length > 0 && (
          <div>
            <p className="eyebrow text-[var(--muted)] mb-3">Highlights</p>
            <ul className="space-y-2.5">
              {resolved.highlights.map((row, i) => (
                <DetailRow key={i} row={row} />
              ))}
            </ul>
          </div>
        )}

        {resolved.specs.length > 0 && (
          <div>
            <p className="eyebrow text-[var(--muted)] mb-3">Specifications</p>
            <ul className="space-y-2.5">
              {resolved.specs.map((row, i) => (
                <DetailRow key={i} row={row} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {resolved.rationale && (
        <blockquote className="mt-8 sm:mt-10 rounded-2xl bg-[var(--surface-muted)] p-5 sm:p-6 border-l-4 border-[var(--leaf)]">
          <p className="eyebrow text-[var(--leaf)] mb-2">Why it's on our shelf</p>
          <p className="font-display text-[15.5px] sm:text-[17px] leading-relaxed text-[var(--text)]">
            {resolved.rationale}
          </p>
        </blockquote>
      )}
    </section>
  );
}

function DetailRow({ row }: { row: ProductDetailRow }) {
  const tone = row.emphasis ? EMPHASIS_TONE[row.emphasis] : "text-[var(--text)]";
  return (
    <li className="flex items-start gap-3 text-[14px] leading-relaxed">
      <span
        aria-hidden="true"
        className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--leaf)] shrink-0"
      />
      <div className="flex-1 flex items-baseline gap-2 flex-wrap">
        <span className="text-[var(--muted)] text-[13px]">{row.label}</span>
        <span className={`font-medium ${tone}`}>{row.value}</span>
      </div>
    </li>
  );
}

/**
 * Derive a presentable details block from the product itself when no
 * AI-curated payload is available. Intentionally lossy — it only uses
 * fields that already exist on the product, so the storefront never
 * renders an empty section because of a curator outage.
 */
function deriveFallback(product: LeafmartProduct): CuratedDetails {
  const highlights: ProductDetailRow[] = [];
  const specs: ProductDetailRow[] = [];

  if (product.support) {
    highlights.push({ label: "Best for", value: product.support, emphasis: "trust" });
  }
  if (product.formatLabel) {
    highlights.push({ label: "Format", value: product.formatLabel });
  }
  if (typeof product.pct === "number" && product.pct > 0) {
    highlights.push({
      label: "Outcome data",
      value: `${product.pct}% reported improvement (n=${product.n ?? 0})`,
      emphasis: "trust",
    });
  }
  if (product.labVerified) {
    highlights.push({ label: "Lab verified", value: "COA on file", emphasis: "trust" });
  }
  if (product.requiresAgeVerification) {
    highlights.push({
      label: "Age gate",
      value: "21+ required at checkout",
      emphasis: "warning",
    });
  }

  if (product.dose) specs.push({ label: "Dose", value: product.dose });
  if (product.partner) specs.push({ label: "Brand", value: product.partner });
  if (typeof product.price === "number") {
    specs.push({ label: "Price", value: `$${product.price.toFixed(2)}` });
  }
  if (product.tag) specs.push({ label: "Shelf tag", value: product.tag });

  return {
    highlights,
    specs,
    rationale: product.clinicianNote ?? undefined,
    aiCurated: false,
  };
}

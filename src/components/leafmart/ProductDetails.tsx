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
import { VendorSiteLink } from "./VendorSiteLink";

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

      {/* EMR-280 — Visit vendor site (with leaving-site disclaimer) */}
      <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
        <VendorSiteLink
          vendorName={product.partner}
          vendorUrl={vendorUrlFor(product)}
        />
        <p className="text-[12px] text-[var(--muted)] max-w-[420px] leading-relaxed">
          We don't sell direct-message access to vendors — for clinical or
          dosing questions, message your Leafjourney clinician.
        </p>
      </div>

      {/* EMR-364 — Fill empty space under hero with "How patients use it"
          tips and "When to consider" / "When to avoid" guidance. Pulled
          from product fields with sensible defaults so every PDP fills. */}
      <UsageTips product={product} />
    </section>
  );
}

function UsageTips({ product }: { product: LeafmartProduct }) {
  const format = (product.format ?? "").toLowerCase();
  const tips = TIPS_BY_FORMAT[format] ?? TIPS_BY_FORMAT.default;
  return (
    <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="eyebrow text-[var(--leaf)] mb-2">How patients use it</p>
        <ul className="space-y-2 text-[13.5px] text-[var(--text-soft)] leading-relaxed">
          {tips.howTo.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[var(--leaf)] shrink-0" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="eyebrow text-[var(--leaf)] mb-2">When to consider</p>
        <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed">{tips.consider}</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
        <p className="eyebrow text-amber-700 mb-2">When to skip</p>
        <p className="text-[13.5px] text-[var(--text-soft)] leading-relaxed">{tips.skip}</p>
      </div>
    </div>
  );
}

const TIPS_BY_FORMAT: Record<string, { howTo: string[]; consider: string; skip: string }> = {
  topical: {
    howTo: [
      "Wash and dry the area; apply a pea-sized amount.",
      "Massage in until absorbed — a little goes a long way.",
      "Reapply every 4–6 hours as needed.",
    ],
    consider:
      "Localized soreness, post-workout recovery, or stiff joints — anywhere you'd reach for a balm.",
    skip: "Open wounds, fresh tattoos, or known fragrance/coconut allergies.",
  },
  balm: {
    howTo: [
      "Wash and dry the area; apply a pea-sized amount.",
      "Massage in until absorbed.",
      "Reapply every 4–6 hours as needed.",
    ],
    consider: "Targeted muscle or joint relief without systemic effects.",
    skip: "Broken skin or known carrier-oil allergies.",
  },
  tincture: {
    howTo: [
      "Shake the bottle; place dose under your tongue.",
      "Hold for 60 seconds before swallowing for faster onset.",
      "Start at the lowest line and titrate up over a few days.",
    ],
    consider: "Steady support that's easy to titrate — sleep, anxiety, daily wellness.",
    skip: "Empty-stomach sensitivity, MAOIs, or active interaction concerns.",
  },
  oil: {
    howTo: [
      "Shake the bottle; place dose under your tongue.",
      "Hold for 60 seconds before swallowing.",
      "Start low and titrate up.",
    ],
    consider: "Steady, titratable daily support.",
    skip: "Active interaction concerns — review with your provider.",
  },
  capsule: {
    howTo: [
      "Take with water and a small bite of food.",
      "Allow 60–90 minutes for full effect.",
      "Pair with a sleep or wind-down routine for best results.",
    ],
    consider: "Discreet, predictable dosing for sleep or longer-acting support.",
    skip: "Known liver-metabolism concerns — check with your clinician.",
  },
  gummy: {
    howTo: [
      "Start with one piece.",
      "Allow 60–90 minutes before redosing.",
      "Store in a cool, dry place out of reach of children.",
    ],
    consider: "Patients who prefer a familiar format and don't mind onset latency.",
    skip: "Diabetes considerations or fasting — check labels for sugar content.",
  },
  beverage: {
    howTo: [
      "Shake well; serve chilled.",
      "Pace yourself — onset is faster than a gummy.",
      "Pair with a meal for the smoothest experience.",
    ],
    consider: "Social settings or replacing an evening drink.",
    skip: "Mixing with alcohol — additive effects can be unpredictable.",
  },
  vape: {
    howTo: [
      "Take a slow 2–3 second draw.",
      "Wait 10 minutes before deciding to redose.",
      "Charge fully and store upright.",
    ],
    consider: "Fast onset for breakthrough symptoms.",
    skip: "Lung conditions or any history of EVALI symptoms.",
  },
  flower: {
    howTo: [
      "Grind to a coarse texture for an even burn.",
      "Use a clean filter or screen.",
      "Hydrate and pace your sessions.",
    ],
    consider: "Patients who want maximum titratability and fast onset.",
    skip: "Lung conditions, asthma, or pulmonary disease.",
  },
  patch: {
    howTo: [
      "Apply to clean, dry skin on a non-bony area.",
      "Rotate sites every 8–12 hours.",
      "Remove and discard responsibly when done.",
    ],
    consider: "Long-acting, hands-free dosing.",
    skip: "Adhesive sensitivities or eczema in the application area.",
  },
  default: {
    howTo: [
      "Start at the lowest dose.",
      "Wait the full onset window before redosing.",
      "Log the outcome in your portal so we can refine recommendations.",
    ],
    consider: "Speak with your clinician about how this fits your goals.",
    skip: "Pregnancy, lactation, or known interaction concerns — review first.",
  },
};

function vendorUrlFor(product: LeafmartProduct): string {
  // Demo data doesn't carry a vendor URL; fall back to a search query so
  // the link goes somewhere sensible until the vendor table ships.
  const partner = encodeURIComponent(product.partner);
  return `https://duckduckgo.com/?q=${partner}+cannabis+vendor`;
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

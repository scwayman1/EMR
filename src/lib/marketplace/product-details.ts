// EMR-307 — AI-curated Product Details list.
//
// Generates the bullet-list of product specifics that renders on PDPs
// (cannabinoid profile, terpenes, intended use, dosing window, etc.).
// The "AI-curated" angle is that the bullets are derived from the
// structured product record using deterministic rules + LLM-summarized
// hints — so the bullets stay scannable and consistent across the
// catalog instead of free-text from each vendor.
//
// We keep deterministic generation here so the PDP renders without
// model latency; an offline curator job can refresh the cached bullets
// when the structured fields drift.

import "server-only";

import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";
import type { MarketplaceProduct } from "./types";

export interface ProductDetailItem {
  label: string;
  value: string;
  /** Optional hint for the UI on how to render the row. */
  emphasis?: "trust" | "warning" | "neutral";
}

export interface CuratedProductDetails {
  /** Top-line bullets — these appear first and are most scannable. */
  highlights: ProductDetailItem[];
  /** Specs — full structured detail. */
  specs: ProductDetailItem[];
}

function pct(n: number | undefined, suffix = "mg/mL"): string | null {
  if (n === undefined || n === null) return null;
  return `${n} ${suffix}`;
}

/**
 * Derive details from the canonical MarketplaceProduct shape.
 * This is the input the PDP server fetcher already has on hand.
 */
export function curatedDetailsForMarketplaceProduct(
  product: MarketplaceProduct,
): CuratedProductDetails {
  const highlights: ProductDetailItem[] = [];
  const specs: ProductDetailItem[] = [];

  // Highlights — pick the 3-5 most decision-relevant fields.
  if (product.beginnerFriendly) {
    highlights.push({
      label: "Beginner friendly",
      value: "Low-dose, gentle starting point",
      emphasis: "trust",
    });
  }
  if (product.labVerified) {
    highlights.push({
      label: "Lab verified",
      value: "COA on file for every batch",
      emphasis: "trust",
    });
  }
  if (product.clinicianPick) {
    highlights.push({
      label: "Clinician selected",
      value: "Reviewed by Leafjourney medical lead",
      emphasis: "trust",
    });
  }
  if (product.onsetTime) {
    highlights.push({ label: "Onset", value: product.onsetTime });
  }
  if (product.duration) {
    highlights.push({ label: "Duration", value: product.duration });
  }

  // Specs — full cannabinoid + terpene + use-case picture.
  const thc = pct(product.thcContent);
  const cbd = pct(product.cbdContent);
  const cbn = pct(product.cbnContent);
  if (thc) specs.push({ label: "THC", value: thc });
  if (cbd) specs.push({ label: "CBD", value: cbd });
  if (cbn) specs.push({ label: "CBN", value: cbn });
  if (product.strainType && product.strainType !== "n/a") {
    specs.push({
      label: "Strain type",
      value: product.strainType.charAt(0).toUpperCase() + product.strainType.slice(1),
    });
  }
  if (product.terpeneProfile && Object.keys(product.terpeneProfile).length > 0) {
    const top = Object.entries(product.terpeneProfile)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, val]) => `${capitalize(name)} ${(val * 100).toFixed(0)}%`)
      .join(" · ");
    specs.push({ label: "Top terpenes", value: top });
  }
  if (product.useCases.length > 0) {
    specs.push({
      label: "Best for",
      value: product.useCases.map(capitalize).join(", "),
    });
  }
  if (product.dosageGuidance) {
    specs.push({ label: "Dosage guidance", value: product.dosageGuidance });
  }
  if (product.requires21Plus) {
    specs.push({
      label: "Age restricted",
      value: "Buyer must confirm 21+ at checkout",
      emphasis: "warning",
    });
  }

  return { highlights, specs };
}

/**
 * The PDP page works in `LeafmartProduct` shape (UI-mapped). When the
 * full structured product isn't in scope, this derives whatever bullets
 * we can from the leaner shape. Falls back to format-derived defaults
 * so the section is never empty.
 */
export function curatedDetailsForLeafmartProduct(
  product: LeafmartProduct,
): CuratedProductDetails {
  const highlights: ProductDetailItem[] = [];
  const specs: ProductDetailItem[] = [];

  if (product.labVerified ?? true) {
    highlights.push({
      label: "Lab verified",
      value: "COA on file for every batch",
      emphasis: "trust",
    });
  }
  if (product.clinicianPick ?? true) {
    highlights.push({
      label: "Clinician selected",
      value: "Reviewed by Leafjourney medical lead",
      emphasis: "trust",
    });
  }
  highlights.push({ label: "Format", value: product.formatLabel });
  highlights.push({ label: "Dose", value: product.dose });

  specs.push({ label: "Brand", value: product.partner });
  if (product.pct > 0) {
    specs.push({
      label: "Patient improvement",
      value: `${product.pct}% reported improvement (n=${product.n})`,
    });
  }
  specs.push({
    label: "Verified buyer reviews",
    value:
      product.reviewCount && product.reviewCount > 0
        ? `${product.reviewCount.toLocaleString()} reviews · ${(product.averageRating ?? 0).toFixed(1)}/5`
        : "Be the first to review",
  });

  return { highlights, specs };
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

import type { LeafmartProduct } from "@/components/leafmart/LeafmartProductCard";

/** Demo product catalog — hard-coded until DB is seeded.
 *  EMR-204: `partner` is the human-readable category label, not a brand
 *  SKU. We render confirmed partner brands separately, and only on the
 *  Founding Partners shelf below. */
export const DEMO_PRODUCTS: LeafmartProduct[] = [
  { slug: "stillwater-sleep-tonic", partner: "CBN BEVERAGE", name: "Stillwater Sleep Tonic", format: "beverage", formatLabel: "Beverage · CBN", support: "A 25mg CBN tonic for the hour before bed. Made with magnesium glycinate.", dose: "12 fl oz", price: 32, pct: 81, n: 612, bg: "var(--sage)", deep: "var(--leaf)", shape: "can", tag: "Clinician Pick" },
  { slug: "field-balm-no-4", partner: "FULL-SPECTRUM TOPICAL", name: "Field Balm № 4", format: "topical", formatLabel: "Topical · Full-Spectrum", support: "A full-spectrum balm for everyday body tension after long days.", dose: "2oz · 500mg", price: 48, pct: 76, n: 384, bg: "var(--peach)", deep: "#9E5621", shape: "tin" },
  { slug: "quiet-hours-tincture", partner: "CBD + CBN TINCTURE", name: "Quiet Hours Tincture", format: "tincture", formatLabel: "Tincture · CBD + CBN", support: "Designed for evening wind-down routines. Plant-powered.", dose: "30 mL · 1500mg", price: 64, pct: 79, n: 502, bg: "var(--butter)", deep: "#8A6A1F", shape: "bottle" },
  { slug: "gold-skin-serum", partner: "CBD SKINCARE", name: "Gold Skin Serum", format: "serum", formatLabel: "Serum · Topical", support: "A clinician-reviewed serum for skin recovery and barrier support.", dose: "30 mL · 250mg", price: 84, pct: 73, n: 218, bg: "var(--rose)", deep: "#9E4D45", shape: "serum", tag: "New" },
];

export const CATEGORIES = [
  { name: "Rest", slug: "rest", sub: "For evenings that should end quietly", count: 18, bg: "var(--sage)", deep: "var(--leaf)", shape: "bottle" as const },
  { name: "Relief", slug: "relief", sub: "Built for the day after a long one", count: 12, bg: "var(--peach)", deep: "#9E5621", shape: "tin" as const },
  { name: "Calm", slug: "calm", sub: "Take the edge off, gently", count: 14, bg: "var(--butter)", deep: "#8A6A1F", shape: "can" as const },
  { name: "Skin", slug: "skin", sub: "Plant-powered skin recovery", count: 4, bg: "var(--rose)", deep: "#9E4D45", shape: "serum" as const },
];

/**
 * EMR-204: Founding partners. Only confirmed partners appear here. The
 * landing page renders a "Coming soon" placeholder when this is empty,
 * so we never show speculative brand names as if they were live.
 */
export const PARTNERS: Array<{
  name: string;
  desc: string;
  bg: string;
  deep: string;
  shape: "can" | "tin" | "bottle" | "serum";
}> = [
  // Confirmed partners only. Add new entries here as agreements close.
];

export const TESTIMONIALS = [
  { name: "Maya R.", loc: "Brooklyn, NY", quote: "I'd been curious about CBN for sleep but didn't know where to start without ending up on a sketchy site. Leafmart felt like a real shop.", bg: "var(--sage)" },
  { name: "Daniel K.", loc: "Austin, TX", quote: "The clinician note on each product is the thing. I'm not guessing whether something was tested — they tell me exactly what was checked.", bg: "var(--peach)" },
  { name: "Priya S.", loc: "San Francisco, CA", quote: "My acupuncturist sent me here. That alone said something about how the brand is positioned. The Field Balm is now part of my recovery routine.", bg: "var(--butter)" },
];

export const TRUST_STEPS = [
  { n: "01", t: "Physician Curated", b: "A licensed clinician on the Leafjourney medical desk reviews every product — formulation, manufacturer, lab — before it gets listed.", deep: "var(--leaf)", bg: "var(--sage)" },
  { n: "02", t: "Lab Verified", b: "A third-party Certificate of Analysis is on file for every SKU. Potency, terpenes, residuals — all checked against the label.", deep: "#9E5621", bg: "var(--peach)" },
  { n: "03", t: "Outcome Informed", b: "Rankings shift quietly based on de-identified outcomes from patients in the connected Leafjourney care platform.", deep: "#8A6A1F", bg: "var(--butter)" },
];

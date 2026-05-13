/**
 * EMR-056 — Comprehensive Product + Dosing Recommendation Engine.
 *
 * Pure scoring layer that turns a patient's symptom list + tolerance
 * profile into ranked product recommendations. Pulls together four
 * inputs:
 *
 *   1. Cannabinoid ratios (THC : CBD, plus minor cannabinoids when
 *      present in the corpus row).
 *   2. Dose ranges — start-low, titrate-up windows keyed by symptom
 *      and tolerance band.
 *   3. Terpene profile — dominant terpene contribution to the
 *      symptom match.
 *   4. Evidence tier — RCT > meta-analysis > observational > PRO >
 *      experiential. Higher tiers bubble up.
 *
 * The data table here is small and curated. The real engine will
 * stream from `prisma.cannabisStudy`, the strain repository, and the
 * patient outcome corpus; the *shape* of the recommendation contract
 * is what this file commits to.
 */

export type SymptomKey =
  | "chronic_pain"
  | "neuropathic_pain"
  | "anxiety"
  | "ptsd"
  | "insomnia"
  | "nausea"
  | "appetite_loss"
  | "spasticity"
  | "seizure"
  | "depression"
  | "inflammation";

export type ToleranceBand = "naive" | "low" | "moderate" | "high";

export type EvidenceTier = "rct" | "meta_analysis" | "observational" | "pro" | "experiential";

export interface CannabinoidProfile {
  thcPercent: number;
  cbdPercent: number;
  cbn?: number;
  cbg?: number;
  cbc?: number;
  thcv?: number;
}

export interface DoseWindow {
  startMg: number;
  ceilingMg: number;
  /** Frequency window in hours. Lower bound = min interval; upper = max. */
  intervalHours: [number, number];
}

export interface ProductCandidate {
  id: string;
  name: string;
  /** Form factor — drives interval defaults and onset estimates. */
  form: "tincture" | "softgel" | "inhaled" | "edible" | "topical" | "sublingual";
  cannabinoids: CannabinoidProfile;
  dominantTerpene: string | null;
  /** Symptoms this product has been studied or commonly reported for. */
  indications: SymptomKey[];
  evidenceTier: EvidenceTier;
  /** Citation slugs into our research corpus / book references. */
  citations: string[];
}

export interface RecommendationInput {
  symptoms: SymptomKey[];
  tolerance: ToleranceBand;
  /** Preferred form factor. Optional — soft preference, not a hard filter. */
  preferredForm?: ProductCandidate["form"];
  /** Cap on THC to surface for cautious patients (defaults to 22%). */
  thcCeiling?: number;
  /** Floor on CBD percent for patients who need CBD support. */
  cbdFloor?: number;
}

export interface ScoredRecommendation {
  product: ProductCandidate;
  /** 0–100. Includes symptom match, evidence, terpene, and ratio fit. */
  score: number;
  matchedSymptoms: SymptomKey[];
  cannabinoidRatio: string;
  dose: DoseWindow;
  reasons: string[];
  /** When the product is filtered out, why. */
  warnings: string[];
}

/* -------------------------------------------------------------------------- */
/* Dose windows                                                               */
/* -------------------------------------------------------------------------- */

const DOSE_WINDOWS: Record<SymptomKey, Record<ToleranceBand, DoseWindow>> = {
  chronic_pain: {
    naive: { startMg: 2.5, ceilingMg: 15, intervalHours: [4, 8] },
    low: { startMg: 5, ceilingMg: 25, intervalHours: [4, 8] },
    moderate: { startMg: 10, ceilingMg: 40, intervalHours: [4, 6] },
    high: { startMg: 20, ceilingMg: 80, intervalHours: [4, 6] },
  },
  neuropathic_pain: {
    naive: { startMg: 2.5, ceilingMg: 12.5, intervalHours: [6, 8] },
    low: { startMg: 5, ceilingMg: 25, intervalHours: [6, 8] },
    moderate: { startMg: 10, ceilingMg: 40, intervalHours: [6, 8] },
    high: { startMg: 15, ceilingMg: 60, intervalHours: [6, 8] },
  },
  anxiety: {
    naive: { startMg: 5, ceilingMg: 25, intervalHours: [6, 12] },
    low: { startMg: 10, ceilingMg: 50, intervalHours: [6, 12] },
    moderate: { startMg: 25, ceilingMg: 100, intervalHours: [8, 12] },
    high: { startMg: 50, ceilingMg: 200, intervalHours: [8, 12] },
  },
  ptsd: {
    naive: { startMg: 2.5, ceilingMg: 15, intervalHours: [8, 12] },
    low: { startMg: 5, ceilingMg: 25, intervalHours: [8, 12] },
    moderate: { startMg: 10, ceilingMg: 40, intervalHours: [8, 12] },
    high: { startMg: 20, ceilingMg: 60, intervalHours: [8, 12] },
  },
  insomnia: {
    naive: { startMg: 2.5, ceilingMg: 10, intervalHours: [24, 24] },
    low: { startMg: 5, ceilingMg: 15, intervalHours: [24, 24] },
    moderate: { startMg: 10, ceilingMg: 25, intervalHours: [24, 24] },
    high: { startMg: 15, ceilingMg: 40, intervalHours: [24, 24] },
  },
  nausea: {
    naive: { startMg: 2.5, ceilingMg: 10, intervalHours: [4, 6] },
    low: { startMg: 5, ceilingMg: 15, intervalHours: [4, 6] },
    moderate: { startMg: 7.5, ceilingMg: 25, intervalHours: [4, 6] },
    high: { startMg: 10, ceilingMg: 40, intervalHours: [4, 6] },
  },
  appetite_loss: {
    naive: { startMg: 2.5, ceilingMg: 10, intervalHours: [6, 8] },
    low: { startMg: 5, ceilingMg: 15, intervalHours: [6, 8] },
    moderate: { startMg: 7.5, ceilingMg: 25, intervalHours: [6, 8] },
    high: { startMg: 10, ceilingMg: 40, intervalHours: [6, 8] },
  },
  spasticity: {
    naive: { startMg: 2.7, ceilingMg: 27, intervalHours: [6, 8] },
    low: { startMg: 5.4, ceilingMg: 32.4, intervalHours: [6, 8] },
    moderate: { startMg: 10.8, ceilingMg: 48.6, intervalHours: [6, 8] },
    high: { startMg: 16.2, ceilingMg: 64.8, intervalHours: [6, 8] },
  },
  seizure: {
    naive: { startMg: 50, ceilingMg: 250, intervalHours: [12, 12] },
    low: { startMg: 100, ceilingMg: 400, intervalHours: [12, 12] },
    moderate: { startMg: 200, ceilingMg: 800, intervalHours: [12, 12] },
    high: { startMg: 400, ceilingMg: 1500, intervalHours: [12, 12] },
  },
  depression: {
    naive: { startMg: 5, ceilingMg: 25, intervalHours: [8, 24] },
    low: { startMg: 10, ceilingMg: 50, intervalHours: [8, 24] },
    moderate: { startMg: 25, ceilingMg: 100, intervalHours: [8, 24] },
    high: { startMg: 50, ceilingMg: 150, intervalHours: [8, 24] },
  },
  inflammation: {
    naive: { startMg: 10, ceilingMg: 40, intervalHours: [8, 12] },
    low: { startMg: 20, ceilingMg: 80, intervalHours: [8, 12] },
    moderate: { startMg: 40, ceilingMg: 160, intervalHours: [8, 12] },
    high: { startMg: 80, ceilingMg: 320, intervalHours: [8, 12] },
  },
};

const EVIDENCE_WEIGHTS: Record<EvidenceTier, number> = {
  rct: 20,
  meta_analysis: 18,
  observational: 12,
  pro: 8,
  experiential: 4,
};

/* -------------------------------------------------------------------------- */
/* Curated corpus                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A compact seed set spanning the dominant evidence-backed options.
 * Real deployments swap this for a Prisma-backed catalog query.
 */
export const SEED_PRODUCTS: ProductCandidate[] = [
  {
    id: "epidiolex",
    name: "Epidiolex (cannabidiol oral solution)",
    form: "tincture",
    cannabinoids: { thcPercent: 0, cbdPercent: 100 },
    dominantTerpene: null,
    indications: ["seizure", "anxiety", "inflammation"],
    evidenceTier: "rct",
    citations: ["devinsky-2017-nejm", "thiele-2018-lancet"],
  },
  {
    id: "sativex-thc-cbd-1-1",
    name: "Sativex (nabiximols) 1:1 oromucosal spray",
    form: "sublingual",
    cannabinoids: { thcPercent: 2.7, cbdPercent: 2.5 },
    dominantTerpene: null,
    indications: ["spasticity", "neuropathic_pain", "chronic_pain"],
    evidenceTier: "rct",
    citations: ["russo-2007-sativex", "wade-2010-ms"],
  },
  {
    id: "low-thc-high-cbd-20-1",
    name: "20:1 CBD-dominant tincture",
    form: "tincture",
    cannabinoids: { thcPercent: 1.5, cbdPercent: 30 },
    dominantTerpene: "myrcene",
    indications: ["anxiety", "inflammation", "ptsd"],
    evidenceTier: "observational",
    citations: ["bonn-miller-2017-anxiety", "russo-2011-entourage"],
  },
  {
    id: "balanced-1-1-softgel",
    name: "1:1 THC:CBD softgel",
    form: "softgel",
    cannabinoids: { thcPercent: 5, cbdPercent: 5 },
    dominantTerpene: "limonene",
    indications: ["chronic_pain", "neuropathic_pain", "anxiety"],
    evidenceTier: "rct",
    citations: ["mucke-2018-meta", "stockings-2018-cochrane"],
  },
  {
    id: "thc-dominant-edible",
    name: "THC-dominant 5mg edible",
    form: "edible",
    cannabinoids: { thcPercent: 18, cbdPercent: 1 },
    dominantTerpene: "linalool",
    indications: ["insomnia", "appetite_loss", "chronic_pain"],
    evidenceTier: "observational",
    citations: ["walsh-2021-sleep", "kander-cannabis-book-2024"],
  },
  {
    id: "cbn-sleep-tincture",
    name: "CBN sleep tincture (3:1 CBN:THC)",
    form: "tincture",
    cannabinoids: { thcPercent: 1, cbdPercent: 5, cbn: 15 },
    dominantTerpene: "myrcene",
    indications: ["insomnia"],
    evidenceTier: "pro",
    citations: ["leafjourney-pro-2025-cbn", "kander-cannabis-book-2024"],
  },
  {
    id: "high-cbg-inflammation",
    name: "High-CBG anti-inflammatory tincture",
    form: "tincture",
    cannabinoids: { thcPercent: 1, cbdPercent: 8, cbg: 12 },
    dominantTerpene: "pinene",
    indications: ["inflammation", "chronic_pain"],
    evidenceTier: "experiential",
    citations: ["russo-2011-entourage"],
  },
  {
    id: "thcv-appetite-control",
    name: "THCV appetite-regulating tincture",
    form: "tincture",
    cannabinoids: { thcPercent: 1, cbdPercent: 5, thcv: 8 },
    dominantTerpene: "pinene",
    indications: ["appetite_loss", "depression"],
    evidenceTier: "experiential",
    citations: ["bhattacharyya-2010-thcv"],
  },
  {
    id: "topical-pain-balm",
    name: "CBD/THC pain balm 250mg",
    form: "topical",
    cannabinoids: { thcPercent: 1, cbdPercent: 4 },
    dominantTerpene: "beta-caryophyllene",
    indications: ["inflammation", "chronic_pain"],
    evidenceTier: "pro",
    citations: ["hammell-2016-topical"],
  },
  {
    id: "inhaled-balanced-flower",
    name: "Balanced THC/CBD flower (vaporized)",
    form: "inhaled",
    cannabinoids: { thcPercent: 8, cbdPercent: 8 },
    dominantTerpene: "limonene",
    indications: ["nausea", "anxiety", "chronic_pain"],
    evidenceTier: "observational",
    citations: ["abrams-2007-neuropathy"],
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function formatRatio(profile: CannabinoidProfile): string {
  const { thcPercent, cbdPercent } = profile;
  if (thcPercent === 0 && cbdPercent === 0) return "0:0";
  if (thcPercent === 0) return `0:${Math.round(cbdPercent)}`;
  if (cbdPercent === 0) return `${Math.round(thcPercent)}:0`;
  // Normalize so the smaller side is 1 when possible.
  const min = Math.min(thcPercent, cbdPercent);
  if (min <= 0) return `${thcPercent}:${cbdPercent}`;
  const thc = thcPercent / min;
  const cbd = cbdPercent / min;
  return `${formatComponent(thc)}:${formatComponent(cbd)}`;
}

function formatComponent(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return n.toFixed(1);
}

function symptomOverlap(product: ProductCandidate, symptoms: SymptomKey[]): SymptomKey[] {
  return product.indications.filter((s) => symptoms.includes(s));
}

function terpeneContribution(terpene: string | null, symptoms: SymptomKey[]): number {
  if (!terpene) return 0;
  const map: Record<string, SymptomKey[]> = {
    myrcene: ["insomnia", "chronic_pain"],
    limonene: ["anxiety", "depression"],
    linalool: ["insomnia", "anxiety", "ptsd"],
    pinene: ["depression", "appetite_loss"],
    "beta-caryophyllene": ["inflammation", "chronic_pain", "neuropathic_pain"],
    humulene: ["inflammation", "appetite_loss"],
    terpinolene: ["anxiety"],
  };
  const matched = (map[terpene] ?? []).filter((s) => symptoms.includes(s));
  return matched.length * 3;
}

/**
 * Pick the dose window for the primary symptom. Falls back to the
 * widest match available when no symptom is given.
 */
export function pickDoseWindow(
  primarySymptom: SymptomKey,
  tolerance: ToleranceBand,
): DoseWindow {
  return DOSE_WINDOWS[primarySymptom][tolerance];
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

export function scoreProduct(
  product: ProductCandidate,
  input: RecommendationInput,
): ScoredRecommendation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const matched = symptomOverlap(product, input.symptoms);

  let score = 0;
  if (matched.length > 0) {
    score += matched.length * 10;
    reasons.push(`Indicated for ${matched.join(", ")}`);
  }

  score += EVIDENCE_WEIGHTS[product.evidenceTier];
  reasons.push(`Evidence tier: ${product.evidenceTier.replace("_", " ")}`);

  const terpeneScore = terpeneContribution(product.dominantTerpene, input.symptoms);
  if (terpeneScore > 0 && product.dominantTerpene) {
    score += terpeneScore;
    reasons.push(`Dominant terpene ${product.dominantTerpene} supports the symptom profile`);
  }

  if (input.preferredForm && product.form === input.preferredForm) {
    score += 5;
    reasons.push(`Matches preferred form (${input.preferredForm})`);
  }

  const thcCeiling = input.thcCeiling ?? 22;
  if (product.cannabinoids.thcPercent > thcCeiling) {
    score -= 15;
    warnings.push(
      `THC ${product.cannabinoids.thcPercent}% exceeds patient ceiling of ${thcCeiling}%`,
    );
  }

  if (input.cbdFloor !== undefined && product.cannabinoids.cbdPercent < input.cbdFloor) {
    score -= 8;
    warnings.push(
      `CBD ${product.cannabinoids.cbdPercent}% below requested floor ${input.cbdFloor}%`,
    );
  }

  // Naive tolerance + THC-heavy → caution.
  if (
    input.tolerance === "naive" &&
    product.cannabinoids.thcPercent > 10 &&
    product.cannabinoids.cbdPercent < 1
  ) {
    score -= 10;
    warnings.push("THC-dominant product not recommended for cannabis-naive patients");
  }

  const primarySymptom = matched[0] ?? input.symptoms[0] ?? "chronic_pain";
  const dose = DOSE_WINDOWS[primarySymptom][input.tolerance];

  return {
    product,
    score: Math.max(0, Math.min(100, score)),
    matchedSymptoms: matched,
    cannabinoidRatio: formatRatio(product.cannabinoids),
    dose,
    reasons,
    warnings,
  };
}

export function recommend(
  input: RecommendationInput,
  catalog: ProductCandidate[] = SEED_PRODUCTS,
): ScoredRecommendation[] {
  if (input.symptoms.length === 0) return [];
  return catalog
    .map((p) => scoreProduct(p, input))
    .filter((r) => r.matchedSymptoms.length > 0 || r.score >= 20)
    .sort((a, b) => b.score - a.score);
}

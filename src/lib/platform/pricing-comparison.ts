/**
 * EMR-156 — Subscription pricing vs EPIC / Cerner / Practice Fusion.
 *
 * Public-facing competitive comparison. The numbers below are list prices
 * and well-reported industry estimates; we never quote a competitor's
 * negotiated contract. This data drives:
 *
 *  - The /pricing comparator table
 *  - The licensing menu PDF (EMR-147)
 *  - The "why us" slide on the public landing page
 *
 * Sources are cited per row so we can update without guessing.
 */
import { MODULE_TIERS } from "./modules";

export type Vendor =
  | "leafjourney"
  | "epic"
  | "cerner"
  | "practice_fusion"
  | "athenaone"
  | "elation";

export interface VendorProfile {
  id: Vendor;
  displayName: string;
  tagline: string;
  /** Public list price per provider per month (USD), or `null` if quote-only. */
  monthlyPerProvider: number | null;
  /** Implementation/setup fee in USD, or `null` if waived. */
  implementationFee: number | null;
  /** Time to first live patient (weeks), best-case for an SMB cannabis clinic. */
  timeToLiveWeeks: number;
  /** Total cost of ownership over 3 years for a 3-provider clinic (USD). */
  threeYearTcoSmallClinic: number;
  /** Source citation — we always show this in the UI. */
  citation: string;
}

export const VENDORS: VendorProfile[] = [
  {
    id: "leafjourney",
    displayName: "Leafjourney",
    tagline: "Cannabis-first EMR that ships RWE, billing, and a marketplace.",
    monthlyPerProvider: MODULE_TIERS.professional.monthlyList ?? 199,
    implementationFee: 0,
    timeToLiveWeeks: 2,
    threeYearTcoSmallClinic: 199 * 3 * 36,
    citation: "Leafjourney public price list (LeafJourney.com/pricing).",
  },
  {
    id: "epic",
    displayName: "Epic",
    tagline: "Health-system gold standard. Six-figure entry point.",
    monthlyPerProvider: null,
    implementationFee: 250_000,
    timeToLiveWeeks: 52,
    threeYearTcoSmallClinic: 1_200_000,
    citation:
      "Becker's Hospital Review 2024 Epic ambulatory deployment estimates; Epic does not publish list pricing.",
  },
  {
    id: "cerner",
    displayName: "Oracle Cerner",
    tagline: "Enterprise EMR with broad integration but heavy ops.",
    monthlyPerProvider: null,
    implementationFee: 175_000,
    timeToLiveWeeks: 40,
    threeYearTcoSmallClinic: 950_000,
    citation:
      "Software Advice 2024 Cerner Millennium Ambulatory cost survey. List pricing not published.",
  },
  {
    id: "practice_fusion",
    displayName: "Practice Fusion",
    tagline: "SMB-friendly cloud EMR. No cannabis primitives.",
    monthlyPerProvider: 149,
    implementationFee: 0,
    timeToLiveWeeks: 4,
    threeYearTcoSmallClinic: 149 * 3 * 36,
    citation: "PracticeFusion.com/pricing (2026 list pricing).",
  },
  {
    id: "athenaone",
    displayName: "athenaOne",
    tagline: "Percent-of-collections model — gets expensive at scale.",
    monthlyPerProvider: null,
    implementationFee: 0,
    timeToLiveWeeks: 8,
    threeYearTcoSmallClinic: 720_000, // ~6.5% of $1.1M annual collections × 3y × 3 providers
    citation:
      "Athenahealth public statements: 4-7% of collections; SoftwarePundit 2024 industry survey.",
  },
  {
    id: "elation",
    displayName: "Elation",
    tagline: "Independent-practice favorite, flat per-provider pricing.",
    monthlyPerProvider: 349,
    implementationFee: 1_500,
    timeToLiveWeeks: 5,
    threeYearTcoSmallClinic: 349 * 3 * 36 + 1_500,
    citation: "Elation Health public pricing page (2026).",
  },
];

export type ComparatorAxis =
  | "cannabis_native"
  | "ai_scribe"
  | "modular_licensing"
  | "rwe_export"
  | "marketplace"
  | "fhir_bridge"
  | "mips_quality"
  | "patient_garden"
  | "white_label";

export const AXIS_LABELS: Record<ComparatorAxis, string> = {
  cannabis_native: "Cannabis-native primitives",
  ai_scribe: "AI scribe (APSO + sign-off)",
  modular_licensing: "Modular per-feature licensing",
  rwe_export: "Real-world evidence export",
  marketplace: "Integrated dispensary marketplace",
  fhir_bridge: "FHIR bridge for legacy EMRs",
  mips_quality: "MIPS / MACRA extrapolation",
  patient_garden: "Gamified patient portal (Garden)",
  white_label: "White-label / OEM",
};

export type Mark = "yes" | "partial" | "no" | "addon";

export interface ComparatorRow {
  axis: ComparatorAxis;
  /** Map vendor → mark + optional note. */
  marks: Record<Vendor, { mark: Mark; note?: string }>;
}

export const COMPARATOR_TABLE: ComparatorRow[] = [
  {
    axis: "cannabis_native",
    marks: {
      leafjourney: { mark: "yes", note: "Built around dosing primitives + Combo Wheel." },
      epic: { mark: "no", note: "No cannabis-specific dosing." },
      cerner: { mark: "no" },
      practice_fusion: { mark: "no" },
      athenaone: { mark: "no" },
      elation: { mark: "partial", note: "Generic medication module." },
    },
  },
  {
    axis: "ai_scribe",
    marks: {
      leafjourney: { mark: "yes", note: "Scribe + 60+ agents in fleet." },
      epic: { mark: "addon", note: "Available via Nuance DAX add-on (~$300/mo)." },
      cerner: { mark: "addon" },
      practice_fusion: { mark: "no" },
      athenaone: { mark: "addon" },
      elation: { mark: "partial" },
    },
  },
  {
    axis: "modular_licensing",
    marks: {
      leafjourney: { mark: "yes", note: "13 modules — pick what you need." },
      epic: { mark: "no", note: "All-or-nothing." },
      cerner: { mark: "no" },
      practice_fusion: { mark: "no" },
      athenaone: { mark: "partial" },
      elation: { mark: "no" },
    },
  },
  {
    axis: "rwe_export",
    marks: {
      leafjourney: { mark: "yes", note: "Cohort builder + de-identifier + RWE bundler." },
      epic: { mark: "addon", note: "Cosmos data, but only at multi-site contracts." },
      cerner: { mark: "addon" },
      practice_fusion: { mark: "no" },
      athenaone: { mark: "no" },
      elation: { mark: "no" },
    },
  },
  {
    axis: "marketplace",
    marks: {
      leafjourney: { mark: "yes", note: "Seed Trove vendor portal + 20-agent commerce fleet." },
      epic: { mark: "no" },
      cerner: { mark: "no" },
      practice_fusion: { mark: "no" },
      athenaone: { mark: "no" },
      elation: { mark: "no" },
    },
  },
  {
    axis: "fhir_bridge",
    marks: {
      leafjourney: { mark: "yes", note: "FHIR R4 read/write for Patient/Encounter/Observation/MedicationStatement." },
      epic: { mark: "yes" },
      cerner: { mark: "yes" },
      practice_fusion: { mark: "partial" },
      athenaone: { mark: "yes" },
      elation: { mark: "partial" },
    },
  },
  {
    axis: "mips_quality",
    marks: {
      leafjourney: { mark: "yes", note: "AI extrapolator pulls measures from notes/labs/dose logs." },
      epic: { mark: "yes" },
      cerner: { mark: "yes" },
      practice_fusion: { mark: "partial" },
      athenaone: { mark: "yes" },
      elation: { mark: "partial" },
    },
  },
  {
    axis: "patient_garden",
    marks: {
      leafjourney: { mark: "yes", note: "Garden gamification + storybook visit summary." },
      epic: { mark: "partial", note: "MyChart — functional, not delightful." },
      cerner: { mark: "partial" },
      practice_fusion: { mark: "partial" },
      athenaone: { mark: "partial" },
      elation: { mark: "partial" },
    },
  },
  {
    axis: "white_label",
    marks: {
      leafjourney: { mark: "yes", note: "OEM agreement + per-organization theming." },
      epic: { mark: "no" },
      cerner: { mark: "no" },
      practice_fusion: { mark: "no" },
      athenaone: { mark: "no" },
      elation: { mark: "no" },
    },
  },
];

/** Score a vendor across the comparator table — useful for ranking. */
export function vendorScore(vendor: Vendor): number {
  const weights: Record<Mark, number> = { yes: 2, partial: 1, addon: 0.5, no: 0 };
  return COMPARATOR_TABLE.reduce(
    (acc, row) => acc + weights[row.marks[vendor].mark],
    0,
  );
}

/** Convenience — vendors ranked by score, descending. Stable for UI tables. */
export function rankedVendors(): VendorProfile[] {
  return [...VENDORS].sort((a, b) => vendorScore(b.id) - vendorScore(a.id));
}

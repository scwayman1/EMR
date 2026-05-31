// EMR-156 — Subscription pricing vs EPIC / Cerner / Practice Fusion.
//
// Public-facing comparison data for the pricing page. Numbers are
// directional market positioning (publicly reported ballparks), not
// contractual quotes — the page renders a disclaimer to that effect. The
// point is to show the structural difference: flat transparent SaaS vs.
// six-figure implementations or ad-supported "free" tiers.

export interface EmrPricingColumn {
  id: string;
  vendor: string;
  /** Short positioning line under the vendor name. */
  positioning: string;
  /** Headline price string for the comparison header. */
  priceHeadline: string;
  /** True for the Leafjourney column so the UI can highlight it. */
  isUs?: boolean;
}

export const EMR_PRICING_COLUMNS: EmrPricingColumn[] = [
  {
    id: "leafjourney",
    vendor: "Leafjourney",
    positioning: "Cannabis-native EMR + marketplace",
    priceHeadline: "$199/mo flat",
    isUs: true,
  },
  {
    id: "epic",
    vendor: "Epic",
    positioning: "Enterprise hospital systems",
    priceHeadline: "$1,200+/mo*",
  },
  {
    id: "cerner",
    vendor: "Oracle Cerner",
    positioning: "Hospital & large ambulatory",
    priceHeadline: "$1,000+/mo*",
  },
  {
    id: "practice-fusion",
    vendor: "Practice Fusion",
    positioning: "Ad-supported ambulatory EMR",
    priceHeadline: "$149/mo + ads",
  },
];

export type CellValue = boolean | string;

export interface EmrComparisonRow {
  feature: string;
  /** Keyed by column id. */
  values: Record<string, CellValue>;
}

export interface EmrComparisonGroup {
  group: string;
  rows: EmrComparisonRow[];
}

export const EMR_PRICING_COMPARISON: EmrComparisonGroup[] = [
  {
    group: "Cost & contract",
    rows: [
      {
        feature: "Monthly price (single provider)",
        values: {
          leafjourney: "$199 flat",
          epic: "Quote only*",
          cerner: "Quote only*",
          "practice-fusion": "$149/mo",
        },
      },
      {
        feature: "Implementation fee",
        values: {
          leafjourney: "$0",
          epic: "$100K–$500K+*",
          cerner: "$50K–$300K+*",
          "practice-fusion": "$0",
        },
      },
      {
        feature: "Per-seat / per-encounter fees",
        values: { leafjourney: false, epic: true, cerner: true, "practice-fusion": false },
      },
      {
        feature: "Multi-year contract required",
        values: { leafjourney: false, epic: true, cerner: true, "practice-fusion": false },
      },
      {
        feature: "Ad-free patient experience",
        values: { leafjourney: true, epic: true, cerner: true, "practice-fusion": false },
      },
    ],
  },
  {
    group: "Cannabis medicine",
    rows: [
      {
        feature: "Native cannabis data model (strain, terpene, dose, batch)",
        values: { leafjourney: true, epic: false, cerner: false, "practice-fusion": false },
      },
      {
        feature: "Per-product outcome scales",
        values: { leafjourney: true, epic: false, cerner: false, "practice-fusion": false },
      },
      {
        feature: "Combo Wheel + dosing primitives",
        values: { leafjourney: true, epic: false, cerner: false, "practice-fusion": false },
      },
      {
        feature: "Integrated marketplace / storefront",
        values: { leafjourney: true, epic: false, cerner: false, "practice-fusion": false },
      },
    ],
  },
  {
    group: "AI & workflow",
    rows: [
      {
        feature: "Built-in scribe (audio → structured note)",
        values: { leafjourney: true, epic: "Add-on", cerner: "Add-on", "practice-fusion": false },
      },
      {
        feature: "AI message triage / smart inbox",
        values: { leafjourney: true, epic: "Add-on", cerner: "Add-on", "practice-fusion": false },
      },
      {
        feature: "Cross-class interaction checking (Rx + cannabis + supplements)",
        values: { leafjourney: true, epic: false, cerner: false, "practice-fusion": false },
      },
      {
        feature: "Time to first chart",
        values: {
          leafjourney: "Day 3",
          epic: "3–12 months*",
          cerner: "2–9 months*",
          "practice-fusion": "1–2 weeks",
        },
      },
    ],
  },
  {
    group: "Data & compliance",
    rows: [
      {
        feature: "FHIR / interoperability",
        values: { leafjourney: true, epic: true, cerner: true, "practice-fusion": true },
      },
      {
        feature: "Patient owns / exports their data",
        values: { leafjourney: true, epic: "Limited", cerner: "Limited", "practice-fusion": "Limited" },
      },
      {
        feature: "Research cohort tooling",
        values: { leafjourney: true, epic: "Enterprise", cerner: "Enterprise", "practice-fusion": false },
      },
    ],
  },
];

export const EMR_PRICING_DISCLAIMER =
  "*Competitor figures are directional, based on publicly reported ranges and analyst estimates; Epic and Cerner price by quote and vary widely by deployment. Leafjourney pricing is the published flat rate. This table is for comparison, not a contractual quote.";

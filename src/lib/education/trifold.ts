// EMR-203 — LeafJourney Trifold Reference Guide.
//
// Static content + helpers for the printable trifold patient handout.
// We render the trifold as a print-styled HTML page (Letter, landscape,
// 3 panels per side) and rely on the browser's "Print to PDF" flow
// rather than pulling in a PDF generation library — it keeps the
// dependency footprint small and lets dispensary staff brand their
// own copies via the print dialog.

export interface CannabinoidEntry {
  id: string;
  name: string;
  symbol: string;
  effect: string;
  notes: string;
  color: string;
}

export interface TerpeneEntry {
  id: string;
  name: string;
  aroma: string;
  effect: string;
  alsoFoundIn: string;
  color: string;
}

export interface BioavailabilityEntry {
  route: string;
  onset: string;
  duration: string;
  bioavailability: string;
  notes: string;
}

export interface DosingGuideline {
  population: string;
  startLow: string;
  goSlow: string;
  ceiling: string;
  notes: string;
}

export const TRIFOLD_CANNABINOIDS: CannabinoidEntry[] = [
  {
    id: "thc",
    name: "THC",
    symbol: "Δ9",
    effect: "Pain relief, appetite, sleep, euphoria",
    notes: "Psychoactive. Start at 2.5 mg.",
    color: "#1F8A4D",
  },
  {
    id: "cbd",
    name: "CBD",
    symbol: "C",
    effect: "Calming, anti-inflammatory, anxiolytic",
    notes: "Non-intoxicating. Modulates THC.",
    color: "#1F6FE0",
  },
  {
    id: "cbn",
    name: "CBN",
    symbol: "N",
    effect: "Sedating, mild pain relief",
    notes: "Best for sleep formulations.",
    color: "#7A1FB5",
  },
  {
    id: "cbg",
    name: "CBG",
    symbol: "G",
    effect: "Anxiolytic, anti-inflammatory",
    notes: "Parent cannabinoid, non-intoxicating.",
    color: "#E8852A",
  },
  {
    id: "thca",
    name: "THCA",
    symbol: "Δ9-A",
    effect: "Anti-nausea, anti-inflammatory",
    notes: "Raw form. Becomes THC with heat.",
    color: "#4FA628",
  },
  {
    id: "cbda",
    name: "CBDA",
    symbol: "C-A",
    effect: "Antiemetic, anti-anxiety",
    notes: "Raw form. Becomes CBD with heat.",
    color: "#1E55B0",
  },
];

export const TRIFOLD_TERPENES: TerpeneEntry[] = [
  {
    id: "myrcene",
    name: "Myrcene",
    aroma: "Earthy, musky",
    effect: "Sedating, muscle relaxant",
    alsoFoundIn: "Hops, mango",
    color: "#3FB04A",
  },
  {
    id: "limonene",
    name: "Limonene",
    aroma: "Citrus",
    effect: "Mood lift, anxiolytic",
    alsoFoundIn: "Lemon, orange peel",
    color: "#F4C20D",
  },
  {
    id: "linalool",
    name: "Linalool",
    aroma: "Floral",
    effect: "Calming, anticonvulsant",
    alsoFoundIn: "Lavender",
    color: "#A050D6",
  },
  {
    id: "pinene",
    name: "Pinene",
    aroma: "Pine",
    effect: "Alertness, bronchodilator",
    alsoFoundIn: "Pine, rosemary",
    color: "#117D3F",
  },
  {
    id: "caryophyllene",
    name: "Caryophyllene",
    aroma: "Pepper, spice",
    effect: "Anti-inflammatory (CB2)",
    alsoFoundIn: "Black pepper, cloves",
    color: "#A04A1F",
  },
  {
    id: "humulene",
    name: "Humulene",
    aroma: "Hoppy, woody",
    effect: "Anti-inflammatory, appetite ↓",
    alsoFoundIn: "Hops, ginger",
    color: "#D4661A",
  },
];

export const TRIFOLD_BIOAVAILABILITY: BioavailabilityEntry[] = [
  {
    route: "Inhaled (vape)",
    onset: "1–10 min",
    duration: "1–3 hr",
    bioavailability: "20–35%",
    notes: "Fastest onset. Good for breakthrough symptoms.",
  },
  {
    route: "Smoked (flower)",
    onset: "1–10 min",
    duration: "1–3 hr",
    bioavailability: "10–35%",
    notes: "Variable; combustion adds toxins.",
  },
  {
    route: "Sublingual tincture",
    onset: "15–45 min",
    duration: "4–6 hr",
    bioavailability: "20–30%",
    notes: "Hold under tongue 60–90 sec for full effect.",
  },
  {
    route: "Edible / capsule",
    onset: "30–120 min",
    duration: "4–8 hr",
    bioavailability: "4–20%",
    notes: "Slow onset; easy to over-shoot. Wait before redosing.",
  },
  {
    route: "Topical",
    onset: "5–60 min (local)",
    duration: "2–6 hr",
    bioavailability: "Negligible systemic",
    notes: "Localized relief. No psychoactivity.",
  },
  {
    route: "Suppository",
    onset: "10–20 min",
    duration: "4–8 hr",
    bioavailability: "50–70% (rectal)",
    notes: "Bypasses first-pass; useful for severe nausea.",
  },
];

export const TRIFOLD_DOSING: DosingGuideline[] = [
  {
    population: "Cannabis-naive adult",
    startLow: "2.5 mg THC",
    goSlow: "Increase by 2.5 mg every 2–3 days",
    ceiling: "10–15 mg per dose",
    notes: "Pair with 1:1 CBD to reduce side effects.",
  },
  {
    population: "Older adult (65+)",
    startLow: "1–2 mg THC or 5 mg CBD",
    goSlow: "Hold each step 4–7 days",
    ceiling: "5 mg THC per dose",
    notes: "Watch for orthostatic hypotension and falls.",
  },
  {
    population: "Cannabis-experienced",
    startLow: "5 mg THC",
    goSlow: "Adjust by 5 mg every 2 days",
    ceiling: "Tolerance-dependent",
    notes: "Tolerance breaks every 4–6 weeks help reset.",
  },
  {
    population: "CBD-only protocol",
    startLow: "10–25 mg CBD/day",
    goSlow: "Increase by 10 mg/week",
    ceiling: "100–600 mg/day (clinical)",
    notes: "Check liver enzymes if >40 mg/kg/day long-term.",
  },
];

/**
 * Print-ready CSS for the trifold layout. Letter landscape, three
 * equal panels per side, generous gutters. Uses no external fonts so
 * the printed output is identical across browsers.
 */
export const TRIFOLD_PRINT_CSS = `
@page { size: letter landscape; margin: 0.4in; }
.trifold-page {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4in;
  width: 100%;
  page-break-after: always;
}
.trifold-page:last-child { page-break-after: auto; }
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.18in;
}
.panel h2 {
  font-family: Georgia, serif;
  font-size: 14pt;
  margin: 0 0 4pt 0;
  letter-spacing: -0.01em;
}
.panel h3 {
  font-size: 9pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 8pt 0 4pt 0;
  color: #5a6f63;
}
.panel p, .panel li, .panel td, .panel th { font-size: 8.5pt; line-height: 1.35; }
.panel table { width: 100%; border-collapse: collapse; }
.panel th { text-align: left; font-weight: 600; padding: 2pt 4pt; border-bottom: 0.5pt solid #999; }
.panel td { padding: 2pt 4pt; border-bottom: 0.25pt solid #ddd; vertical-align: top; }
.panel .swatch { display: inline-block; width: 6pt; height: 6pt; border-radius: 50%; margin-right: 4pt; vertical-align: middle; }
@media screen {
  .trifold-page {
    background: white;
    padding: 0.4in;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    margin: 1rem auto;
    max-width: 11in;
    color: #1c2421;
  }
  .panel { background: #fcfaf6; padding: 0.2in; border-radius: 6pt; }
}
@media print {
  .no-print { display: none !important; }
  body { background: white; }
}
`;

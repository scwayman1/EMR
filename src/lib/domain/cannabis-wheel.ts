// Cannabis Wheel — static data for the public-facing Education > Cannabis Wheel
// interactive component. Plain-language descriptions only. Factual, educational
// tone. No claims of treatment or cure.
//
// Structure:
//   CANNABINOIDS — 6 major cannabinoids with plain-language effects and
//                  the terpene ids they commonly pair with in the entourage
//                  effect literature.
//   TERPENES    — 6 common cannabis terpenes with aroma and plain-language
//                  effects.
//
// Used by: src/components/education/cannabis-wheel.tsx (client component)
//          src/app/education/wheel/page.tsx (public route)

export type TerpeneId =
  | "myrcene"
  | "limonene"
  | "linalool"
  | "pinene"
  | "caryophyllene"
  | "humulene";

export type CannabinoidId = "thc" | "cbd" | "cbg" | "cbn" | "cbc" | "thcv";

export interface Cannabinoid {
  id: CannabinoidId;
  label: string;
  shortDesc: string;
  effects: string[];
  pairsWith: TerpeneId[];
}

export interface Terpene {
  id: TerpeneId;
  label: string;
  aroma: string;
  effects: string[];
}

// ── Cannabinoids ────────────────────────────────────────────
// Plain-language, factual. Covers the main compound most studied, plus a
// short list of effects drawn from clinical and preclinical literature.

export const CANNABINOIDS: Cannabinoid[] = [
  {
    id: "thc",
    label: "THC",
    shortDesc: "The main psychoactive cannabinoid. Produces the classic cannabis 'high'.",
    effects: [
      "Eases pain",
      "Stimulates appetite",
      "Can reduce nausea",
      "May help with sleep",
      "Can feel euphoric at moderate doses",
    ],
    pairsWith: ["myrcene", "caryophyllene", "limonene"],
  },
  {
    id: "cbd",
    label: "CBD",
    shortDesc: "Non-intoxicating. Studied for anxiety, inflammation, and seizures.",
    effects: [
      "Calming without a 'high'",
      "Reduces inflammation",
      "May lower anxiety",
      "FDA-approved for certain seizure disorders",
      "Can balance THC's intensity",
    ],
    pairsWith: ["linalool", "limonene", "pinene"],
  },
  {
    id: "cbg",
    label: "CBG",
    shortDesc: "The 'mother' cannabinoid — precursor to THC and CBD.",
    effects: [
      "Early research suggests anti-inflammatory action",
      "May support gut comfort",
      "Neuroprotective in preclinical studies",
      "Non-intoxicating",
    ],
    pairsWith: ["pinene", "myrcene", "humulene"],
  },
  {
    id: "cbn",
    label: "CBN",
    shortDesc: "Forms as THC ages. Often marketed for sleep.",
    effects: [
      "Mildly sedating for some people",
      "May support relaxation",
      "Non-intoxicating at typical doses",
      "Limited clinical evidence — still being studied",
    ],
    pairsWith: ["myrcene", "linalool", "humulene"],
  },
  {
    id: "cbc",
    label: "CBC",
    shortDesc: "A lesser-known cannabinoid under early research.",
    effects: [
      "Anti-inflammatory signals in preclinical studies",
      "May support mood (very early research)",
      "Non-intoxicating",
      "Works alongside other cannabinoids",
    ],
    pairsWith: ["caryophyllene", "humulene", "pinene"],
  },
  {
    id: "thcv",
    label: "THCV",
    shortDesc: "THC's lighter cousin. More energizing at low doses.",
    effects: [
      "May reduce appetite at low doses",
      "Reported to feel more energetic and clear",
      "Psychoactive only at higher doses",
      "Studied for metabolic conditions",
    ],
    pairsWith: ["limonene", "pinene", "caryophyllene"],
  },
];

// ── Terpenes ────────────────────────────────────────────────
// Aroma chemistry that shapes the experience. Plain-language effects.

export const TERPENES: Terpene[] = [
  {
    id: "myrcene",
    label: "Myrcene",
    aroma: "Earthy, musky, ripe mango",
    effects: [
      "Often described as relaxing",
      "May enhance THC's sedating side",
      "Found in hops and lemongrass",
    ],
  },
  {
    id: "limonene",
    label: "Limonene",
    aroma: "Bright citrus peel",
    effects: [
      "Commonly associated with uplifted mood",
      "May reduce stress",
      "Found in citrus rinds and juniper",
    ],
  },
  {
    id: "linalool",
    label: "Linalool",
    aroma: "Floral lavender, light spice",
    effects: [
      "Calming and soothing for many people",
      "May support restful sleep",
      "Found in lavender and basil",
    ],
  },
  {
    id: "pinene",
    label: "Pinene",
    aroma: "Fresh pine forest, rosemary",
    effects: [
      "Often described as alerting and clear-headed",
      "May support focus",
      "Found in pine, rosemary, and basil",
    ],
  },
  {
    id: "caryophyllene",
    label: "Caryophyllene",
    aroma: "Black pepper, clove, warm spice",
    effects: [
      "Unique among terpenes — interacts with CB2 receptors",
      "Studied for inflammation and discomfort",
      "Found in black pepper and cloves",
    ],
  },
  {
    id: "humulene",
    label: "Humulene",
    aroma: "Hoppy, woody, subtle earth",
    effects: [
      "Often described as grounding",
      "Anti-inflammatory signals in early research",
      "Found in hops, sage, and ginseng",
    ],
  },
];

// ── Lookups ─────────────────────────────────────────────────

export function getCannabinoid(id: CannabinoidId): Cannabinoid | undefined {
  return CANNABINOIDS.find((c) => c.id === id);
}

export function getTerpene(id: TerpeneId): Terpene | undefined {
  return TERPENES.find((t) => t.id === id);
}

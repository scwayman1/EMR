// EMR-151 — Symptom/Diagnosis Supplement Combo Wheel.
//
// Client-safe types and pure helpers for the supplement wheel. The
// prisma-backed fetcher lives in `./supplement-wheel-server.ts` so the
// client component can pull from this file without dragging the
// database client into the browser bundle.

export type SupplementEvidence = "strong" | "moderate" | "emerging";

export interface SupplementCompoundView {
  id: string;
  name: string;
  category: string;
  color: string;
  evidence: SupplementEvidence;
  description: string;
  symptoms: string[];
  benefits: string[];
  risks: string[];
  cannabisInteraction: string | null;
}

/**
 * Symptom-overlap intersection for any number of selected supplements.
 * Returns symptom name -> count of supplements that target it.
 */
export function symptomOverlap(
  selected: SupplementCompoundView[],
): Array<{ symptom: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const s of selected) {
    for (const symptom of s.symptoms) {
      counts[symptom] = (counts[symptom] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((a, b) => b.count - a.count || a.symptom.localeCompare(b.symptom));
}

/**
 * Built-in seed list that ships with the app. Used as the wheel's
 * fallback when the database is unavailable. Matches the seed in
 * prisma/seed.ts so dev and prod render the same content.
 */
export const BUILTIN_SUPPLEMENTS: SupplementCompoundView[] = [
  {
    id: "magnesium-glycinate",
    name: "Magnesium Glycinate",
    category: "Mineral",
    color: "#7C9F8C",
    evidence: "strong",
    description: "Highly bioavailable form of magnesium with calming effects.",
    symptoms: ["sleep", "muscle tension", "anxiety"],
    benefits: ["Improves sleep onset", "Reduces nighttime cramps", "Calms nervous system"],
    risks: ["Loose stools at high doses"],
    cannabisInteraction:
      "Generally synergistic with CBD for sleep and muscle relaxation.",
  },
  {
    id: "melatonin",
    name: "Melatonin",
    category: "Hormone",
    color: "#5B6F8E",
    evidence: "strong",
    description: "Endogenous sleep-onset hormone; useful for shifted circadian rhythms.",
    symptoms: ["sleep", "jet lag", "shift work"],
    benefits: ["Shortens sleep latency", "Stabilizes sleep timing"],
    risks: ["Morning grogginess at >1 mg", "Vivid dreams"],
    cannabisInteraction: "Stack low-dose melatonin (0.3–1 mg) with bedtime CBN for sleep.",
  },
  {
    id: "omega-3",
    name: "Omega-3 (EPA/DHA)",
    category: "Essential Fatty Acid",
    color: "#3F7D8A",
    evidence: "strong",
    description: "EPA + DHA fish oil; supports anti-inflammatory and cognitive pathways.",
    symptoms: ["inflammation", "joint pain", "mood", "cognition"],
    benefits: ["Reduces systemic inflammation", "Supports mood stability"],
    risks: ["Mild blood-thinning at high doses"],
    cannabisInteraction: "Complements CBD's anti-inflammatory action.",
  },
  {
    id: "ashwagandha",
    name: "Ashwagandha",
    category: "Adaptogen",
    color: "#9C7C5A",
    evidence: "moderate",
    description: "Ayurvedic adaptogen; shown to lower cortisol and support resilience.",
    symptoms: ["stress", "anxiety", "fatigue"],
    benefits: ["Lowers cortisol", "Improves stress resilience"],
    risks: ["Avoid with thyroid medications without supervision"],
    cannabisInteraction: "Pairs well with mid-day microdose CBD for stress without sedation.",
  },
  {
    id: "l-theanine",
    name: "L-Theanine",
    category: "Amino",
    color: "#6FA89A",
    evidence: "strong",
    description: "Amino acid from green tea; promotes alpha brainwaves and calm focus.",
    symptoms: ["anxiety", "focus", "stress"],
    benefits: ["Calm without sedation", "Smooths caffeine"],
    risks: ["Generally well-tolerated"],
    cannabisInteraction: "Can offset THC-induced anxiety; safe to combine.",
  },
  {
    id: "vitamin-d3",
    name: "Vitamin D3",
    category: "Vitamin",
    color: "#D4A04E",
    evidence: "strong",
    description: "Sun-derived vitamin; deficiency linked to mood and immune issues.",
    symptoms: ["fatigue", "mood", "immunity"],
    benefits: ["Mood support", "Immune function"],
    risks: ["Toxic at very high doses without K2 cofactor"],
    cannabisInteraction: "No notable interaction; foundational stack.",
  },
];

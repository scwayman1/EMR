// EMR-130 — My Garden cannabis grow guide V3
// Adds the V3 patient surfaces: strain database, photo journal entries,
// harvest log entries. Stage data and community threads still live in
// `@/lib/domain/grow-guide`; this module focuses on the new V3 content
// and the helpers that summarize a journal across stages.

import {
  GROW_GUIDE_STAGES,
  GROW_COMMUNITY_THREADS,
  type GrowGuideStage,
  type GrowStage,
  type GrowCommunityThread,
} from "@/lib/domain/grow-guide";

export {
  GROW_GUIDE_STAGES,
  GROW_COMMUNITY_THREADS,
  type GrowGuideStage,
  type GrowStage,
  type GrowCommunityThread,
};

export type StrainCategory = "indica" | "sativa" | "hybrid" | "cbd-dominant";

export interface Strain {
  id: string;
  name: string;
  category: StrainCategory;
  thcRange: string;
  cbdRange: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  floweringWeeks: string;
  yield: string;
  effects: string[];
  helpsWith: string[];
  notes: string;
}

export const STRAIN_DATABASE: Strain[] = [
  {
    id: "harlequin",
    name: "Harlequin",
    category: "cbd-dominant",
    thcRange: "4–7%",
    cbdRange: "8–16%",
    difficulty: "beginner",
    floweringWeeks: "8–9",
    yield: "Medium",
    effects: ["Clear-headed", "Calm", "Focused"],
    helpsWith: ["Anxiety", "Daytime pain", "Inflammation"],
    notes:
      "5:2 CBD:THC ratio. Forgiving for first-time growers, very low risk of mind-altering side effects at typical doses.",
  },
  {
    id: "acdc",
    name: "ACDC",
    category: "cbd-dominant",
    thcRange: "1–6%",
    cbdRange: "14–20%",
    difficulty: "intermediate",
    floweringWeeks: "9–10",
    yield: "Medium",
    effects: ["Soothing", "Lucid", "Relaxed"],
    helpsWith: ["Seizures", "Chemo nausea", "Daily pain"],
    notes:
      "Best for patients who want symptom relief without an intoxicating high. Sensitive to nutrient burn.",
  },
  {
    id: "northern-lights",
    name: "Northern Lights",
    category: "indica",
    thcRange: "16–21%",
    cbdRange: "<1%",
    difficulty: "beginner",
    floweringWeeks: "7–9",
    yield: "High",
    effects: ["Sleepy", "Body relaxation", "Euphoric"],
    helpsWith: ["Insomnia", "Muscle pain", "Stress"],
    notes:
      "Compact plant, mold resistant, classic beginner indica. Great for indoor closet grows.",
  },
  {
    id: "blue-dream",
    name: "Blue Dream",
    category: "hybrid",
    thcRange: "17–24%",
    cbdRange: "<1%",
    difficulty: "intermediate",
    floweringWeeks: "9–10",
    yield: "High",
    effects: ["Uplifted", "Creative", "Gentle body relax"],
    helpsWith: ["Mood", "Mid-day pain", "Mild depression"],
    notes:
      "Tall, vigorous plant. Top early for indoor grows. Daytime-friendly hybrid most patients tolerate.",
  },
  {
    id: "granddaddy-purple",
    name: "Granddaddy Purple",
    category: "indica",
    thcRange: "17–23%",
    cbdRange: "<1%",
    difficulty: "intermediate",
    floweringWeeks: "8–11",
    yield: "Medium-High",
    effects: ["Heavy body", "Warm", "Sleepy"],
    helpsWith: ["Severe pain", "Insomnia", "Appetite"],
    notes:
      "Dense buds — needs airflow to prevent rot. Cool nights bring out the purple coloration.",
  },
  {
    id: "jack-herer",
    name: "Jack Herer",
    category: "sativa",
    thcRange: "18–24%",
    cbdRange: "<1%",
    difficulty: "advanced",
    floweringWeeks: "8–10",
    yield: "Medium",
    effects: ["Energizing", "Clear", "Focused"],
    helpsWith: ["Fatigue", "Low motivation", "ADHD-like focus"],
    notes:
      "Long flowering, light-hungry. Reward is a clean daytime sativa rare in beginner libraries.",
  },
];

export function strainsForGoal(goal: string): Strain[] {
  const needle = goal.toLowerCase();
  return STRAIN_DATABASE.filter((s) =>
    s.helpsWith.some((h) => h.toLowerCase().includes(needle)),
  );
}

export interface PhotoJournalEntry {
  id: string;
  stage: GrowStage;
  takenAt: string;
  caption: string;
  photoUrl: string;
  measurements?: {
    heightInches?: number;
    phReading?: number;
    tempF?: number;
    humidityPct?: number;
  };
}

export const PHOTO_JOURNAL_DEMO: PhotoJournalEntry[] = [
  {
    id: "p1",
    stage: "seedling",
    takenAt: "2026-04-02",
    caption: "Day 5 — first true leaves. Slight stretch, dropped the light.",
    photoUrl: "/garden/journal/seedling.jpg",
    measurements: { heightInches: 2, phReading: 6.4, tempF: 76, humidityPct: 65 },
  },
  {
    id: "p2",
    stage: "vegetative",
    takenAt: "2026-04-18",
    caption: "Veg week 2. Topped above the 4th node.",
    photoUrl: "/garden/journal/veg.jpg",
    measurements: { heightInches: 9, phReading: 6.2, tempF: 78, humidityPct: 58 },
  },
  {
    id: "p3",
    stage: "flowering",
    takenAt: "2026-05-30",
    caption: "Flower week 4 — pistils browning, trichomes still cloudy.",
    photoUrl: "/garden/journal/flower.jpg",
    measurements: { heightInches: 26, phReading: 6.0, tempF: 75, humidityPct: 48 },
  },
];

export interface HarvestLogEntry {
  id: string;
  strainId: string;
  harvestedAt: string;
  wetGrams: number;
  dryGrams: number;
  cureWeeks: number;
  rating: number;
  notes: string;
}

export const HARVEST_LOG_DEMO: HarvestLogEntry[] = [
  {
    id: "h1",
    strainId: "northern-lights",
    harvestedAt: "2025-11-12",
    wetGrams: 320,
    dryGrams: 78,
    cureWeeks: 4,
    rating: 4,
    notes: "Smooth burn, hit the sleep window I was after. Yield slightly low — too small a pot.",
  },
  {
    id: "h2",
    strainId: "harlequin",
    harvestedAt: "2026-02-04",
    wetGrams: 415,
    dryGrams: 102,
    cureWeeks: 6,
    rating: 5,
    notes: "Daytime go-to. CBD-rich — replaced my afternoon ibuprofen for muscle pain.",
  },
];

export interface GrowJournalSummary {
  totalDryGrams: number;
  averageRating: number;
  bestStrainId: string | null;
  uniqueStrains: number;
}

export function summarizeHarvestLog(entries: HarvestLogEntry[]): GrowJournalSummary {
  if (entries.length === 0) {
    return {
      totalDryGrams: 0,
      averageRating: 0,
      bestStrainId: null,
      uniqueStrains: 0,
    };
  }
  const totalDryGrams = entries.reduce((s, e) => s + e.dryGrams, 0);
  const averageRating =
    entries.reduce((s, e) => s + e.rating, 0) / entries.length;
  const best = [...entries].sort((a, b) => b.rating - a.rating)[0];
  const uniqueStrains = new Set(entries.map((e) => e.strainId)).size;
  return {
    totalDryGrams,
    averageRating: Math.round(averageRating * 10) / 10,
    bestStrainId: best?.strainId ?? null,
    uniqueStrains,
  };
}

export function strainById(id: string): Strain | undefined {
  return STRAIN_DATABASE.find((s) => s.id === id);
}

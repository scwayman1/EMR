// Nutrition tracking — EMR-139
// Patient food log with macro estimation. Photo OCR and barcode scanning are
// stubbed out behind a deterministic lookup so the UI is fully functional in
// dev/demo without depending on a vision API.

export interface MacroProfile {
  calories: number;
  protein: number; // grams
  carbs: number;
  fat: number;
  fiber: number;
}

export interface FoodEntry {
  id: string;
  source: "manual" | "barcode" | "photo";
  loggedAt: string; // ISO
  meal: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  servings: number;
  perServing: MacroProfile;
  notes?: string;
}

export const MEAL_LABEL: Record<FoodEntry["meal"], string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MEAL_EMOJI: Record<FoodEntry["meal"], string> = {
  breakfast: "\u{1F373}",
  lunch: "\u{1F957}",
  dinner: "\u{1F35C}",
  snack: "\u{1F34E}",
};

export const DAILY_TARGET: MacroProfile = {
  calories: 2000,
  protein: 90,
  carbs: 220,
  fat: 70,
  fiber: 30,
};

// Deterministic mock database keyed off lowercased common ingredients,
// generic barcode prefixes, and a few "scanned" photo signatures. Used by
// the manual entry, barcode, and photo flows. In production these would be
// replaced with a real food API (USDA FoodData Central, Open Food Facts).
const NUTRITION_DB: { match: string; entry: Omit<FoodEntry, "id" | "source" | "loggedAt" | "meal" | "servings"> }[] = [
  {
    match: "oatmeal",
    entry: {
      name: "Steel-cut oatmeal (1 cup cooked)",
      perServing: { calories: 158, protein: 6, carbs: 27, fat: 3, fiber: 4 },
    },
  },
  {
    match: "chicken breast",
    entry: {
      name: "Grilled chicken breast (4 oz)",
      perServing: { calories: 187, protein: 35, carbs: 0, fat: 4, fiber: 0 },
    },
  },
  {
    match: "salmon",
    entry: {
      name: "Baked salmon (4 oz)",
      perServing: { calories: 233, protein: 25, carbs: 0, fat: 14, fiber: 0 },
    },
  },
  {
    match: "rice",
    entry: {
      name: "Brown rice (1 cup cooked)",
      perServing: { calories: 218, protein: 5, carbs: 46, fat: 2, fiber: 4 },
    },
  },
  {
    match: "salad",
    entry: {
      name: "Mixed greens salad (2 cups)",
      perServing: { calories: 35, protein: 2, carbs: 6, fat: 0, fiber: 3 },
    },
  },
  {
    match: "smoothie",
    entry: {
      name: "Berry protein smoothie",
      perServing: { calories: 280, protein: 25, carbs: 32, fat: 6, fiber: 7 },
    },
  },
  {
    match: "egg",
    entry: {
      name: "Scrambled eggs (2 large)",
      perServing: { calories: 182, protein: 12, carbs: 2, fat: 14, fiber: 0 },
    },
  },
  {
    match: "yogurt",
    entry: {
      name: "Greek yogurt (1 cup)",
      perServing: { calories: 130, protein: 20, carbs: 9, fat: 0, fiber: 0 },
    },
  },
  {
    match: "almond",
    entry: {
      name: "Almonds (1 oz / about 23)",
      perServing: { calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 4 },
    },
  },
  {
    match: "apple",
    entry: {
      name: "Apple (medium)",
      perServing: { calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4 },
    },
  },
  {
    match: "banana",
    entry: {
      name: "Banana (medium)",
      perServing: { calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3 },
    },
  },
];

export function searchNutrition(query: string): typeof NUTRITION_DB[number] | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return NUTRITION_DB.find((f) => f.match === q || q.includes(f.match)) ?? null;
}

// Mock barcode resolver — barcodes starting with the same digit map to the
// same item. Real implementations call Open Food Facts / USDA / UPC database.
export function resolveBarcode(barcode: string): typeof NUTRITION_DB[number] | null {
  if (!/^\d+$/.test(barcode)) return null;
  const idx = parseInt(barcode.slice(0, 2), 10) % NUTRITION_DB.length;
  return NUTRITION_DB[idx];
}

// Mock photo-OCR resolver — deterministic from the file's name / size hash so
// the UI feels real without a vision call. Returns null about a third of the
// time to surface the manual-entry fallback.
export function inferPhotoNutrition(seed: string): typeof NUTRITION_DB[number] | null {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  if (Math.abs(hash) % 3 === 0) return null;
  return NUTRITION_DB[Math.abs(hash) % NUTRITION_DB.length];
}

export function totalForEntry(entry: FoodEntry): MacroProfile {
  const s = entry.servings;
  const p = entry.perServing;
  return {
    calories: Math.round(p.calories * s),
    protein: Math.round(p.protein * s),
    carbs: Math.round(p.carbs * s),
    fat: Math.round(p.fat * s),
    fiber: Math.round(p.fiber * s),
  };
}

export function sumMacros(entries: FoodEntry[]): MacroProfile {
  return entries.reduce<MacroProfile>(
    (acc, e) => {
      const t = totalForEntry(e);
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
        fiber: acc.fiber + t.fiber,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

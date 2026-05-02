// EMR-139 — Food tracker
// Pure helpers for the patient food log: photo OCR meal recognition,
// barcode lookups, macro math, and the daily / weekly summary. The OCR
// and barcode functions are deliberately stub implementations that match
// the shape we expect from a future vision / nutrition API so the UI can
// be wired up end-to-end without an external dependency yet.

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export type EntrySource =
  | "manual"
  | "ocr-photo"
  | "barcode"
  | "recipe"
  | "import";

export interface MacroBreakdown {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
}

export interface FoodEntry {
  id: string;
  loggedAt: string;
  slot: MealSlot;
  label: string;
  servingDescription: string;
  servingsConsumed: number;
  source: EntrySource;
  macros: MacroBreakdown;
  photoDataUrl?: string;
  barcode?: string;
  cannabisInfusedMg?: number;
}

export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
}

export const DEFAULT_TARGETS: DailyTargets = {
  calories: 2000,
  proteinG: 90,
  carbsG: 220,
  fatG: 65,
  fiberG: 28,
};

export interface BarcodeProduct {
  barcode: string;
  brand: string;
  label: string;
  servingDescription: string;
  macros: MacroBreakdown;
}

const BARCODE_FIXTURES: BarcodeProduct[] = [
  {
    barcode: "0049000028904",
    brand: "Trail Co",
    label: "Roasted almonds",
    servingDescription: "1/4 cup (28 g)",
    macros: { calories: 165, proteinG: 6, carbsG: 6, fatG: 14, fiberG: 3 },
  },
  {
    barcode: "0762111800015",
    brand: "Leafjourney",
    label: "Cannabis-infused dark chocolate (5 mg)",
    servingDescription: "1 square",
    macros: { calories: 60, proteinG: 1, carbsG: 6, fatG: 4, fiberG: 1 },
  },
  {
    barcode: "0851610002088",
    brand: "Greek Choice",
    label: "Plain Greek yogurt 0%",
    servingDescription: "1 cup (245 g)",
    macros: { calories: 130, proteinG: 23, carbsG: 9, fatG: 0, sugarG: 9 },
  },
];

export function lookupBarcode(barcode: string): BarcodeProduct | null {
  return BARCODE_FIXTURES.find((p) => p.barcode === barcode) ?? null;
}

export interface OcrCandidate {
  label: string;
  servingDescription: string;
  confidence: number;
  macros: MacroBreakdown;
}

const OCR_PATTERNS: Array<{
  pattern: RegExp;
  candidate: Omit<OcrCandidate, "confidence">;
  confidence: number;
}> = [
  {
    pattern: /(salad|greens|spinach|kale)/i,
    candidate: {
      label: "Mixed green salad",
      servingDescription: "1 large bowl",
      macros: { calories: 220, proteinG: 6, carbsG: 18, fatG: 14, fiberG: 6 },
    },
    confidence: 0.78,
  },
  {
    pattern: /(rice|grain bowl|burrito bowl)/i,
    candidate: {
      label: "Grain bowl",
      servingDescription: "1 bowl",
      macros: { calories: 540, proteinG: 22, carbsG: 70, fatG: 18, fiberG: 8 },
    },
    confidence: 0.72,
  },
  {
    pattern: /(pizza|slice)/i,
    candidate: {
      label: "Pizza slice",
      servingDescription: "1 slice",
      macros: { calories: 285, proteinG: 12, carbsG: 36, fatG: 10, fiberG: 2 },
    },
    confidence: 0.7,
  },
  {
    pattern: /(eggs|omelet)/i,
    candidate: {
      label: "Two-egg omelet",
      servingDescription: "1 omelet",
      macros: { calories: 220, proteinG: 14, carbsG: 2, fatG: 17 },
    },
    confidence: 0.74,
  },
  {
    pattern: /(toast|bread|sandwich)/i,
    candidate: {
      label: "Sandwich",
      servingDescription: "1 sandwich",
      macros: { calories: 360, proteinG: 18, carbsG: 40, fatG: 14, fiberG: 4 },
    },
    confidence: 0.68,
  },
];

/**
 * Stand-in for a vision-model OCR pass. Accepts a hint string (e.g. the
 * filename, a free-text label the patient typed, or text the model
 * extracted) and returns a small ranked list of macro candidates the
 * patient can confirm.
 */
export function recognizeMealFromPhotoHint(hint: string): OcrCandidate[] {
  const hits: OcrCandidate[] = [];
  for (const { pattern, candidate, confidence } of OCR_PATTERNS) {
    if (pattern.test(hint)) hits.push({ ...candidate, confidence });
  }
  if (hits.length === 0) {
    hits.push({
      label: hint.trim() || "Logged meal",
      servingDescription: "1 serving",
      confidence: 0.4,
      macros: { calories: 400, proteinG: 18, carbsG: 45, fatG: 16, fiberG: 4 },
    });
  }
  return hits.sort((a, b) => b.confidence - a.confidence);
}

export function combineMacros(
  a: MacroBreakdown,
  b: MacroBreakdown,
): MacroBreakdown {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: (a.fiberG ?? 0) + (b.fiberG ?? 0),
    sugarG: (a.sugarG ?? 0) + (b.sugarG ?? 0),
  };
}

export function scaleMacros(
  m: MacroBreakdown,
  servings: number,
): MacroBreakdown {
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    calories: Math.round(m.calories * servings),
    proteinG: round(m.proteinG * servings),
    carbsG: round(m.carbsG * servings),
    fatG: round(m.fatG * servings),
    fiberG: m.fiberG != null ? round(m.fiberG * servings) : undefined,
    sugarG: m.sugarG != null ? round(m.sugarG * servings) : undefined,
  };
}

export interface DailyMacroSummary {
  date: string;
  totals: MacroBreakdown;
  bySlot: Record<MealSlot, MacroBreakdown>;
  remaining: MacroBreakdown;
  goalProgress: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  cannabisInfusedMg: number;
}

const EMPTY_MACROS: MacroBreakdown = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
};

export function summarizeDay(
  entries: FoodEntry[],
  date: string,
  targets: DailyTargets = DEFAULT_TARGETS,
): DailyMacroSummary {
  const dayEntries = entries.filter((e) => e.loggedAt.slice(0, 10) === date);

  const bySlot: Record<MealSlot, MacroBreakdown> = {
    breakfast: { ...EMPTY_MACROS },
    lunch: { ...EMPTY_MACROS },
    dinner: { ...EMPTY_MACROS },
    snack: { ...EMPTY_MACROS },
  };
  let totals: MacroBreakdown = { ...EMPTY_MACROS };
  let cannabisInfusedMg = 0;
  for (const e of dayEntries) {
    const scaled = scaleMacros(e.macros, e.servingsConsumed);
    bySlot[e.slot] = combineMacros(bySlot[e.slot], scaled);
    totals = combineMacros(totals, scaled);
    cannabisInfusedMg += (e.cannabisInfusedMg ?? 0) * e.servingsConsumed;
  }

  const remaining: MacroBreakdown = {
    calories: Math.max(0, targets.calories - totals.calories),
    proteinG: Math.max(0, targets.proteinG - totals.proteinG),
    carbsG: Math.max(0, targets.carbsG - totals.carbsG),
    fatG: Math.max(0, targets.fatG - totals.fatG),
    fiberG: targets.fiberG != null
      ? Math.max(0, targets.fiberG - (totals.fiberG ?? 0))
      : undefined,
  };

  return {
    date,
    totals,
    bySlot,
    remaining,
    goalProgress: {
      calories: targets.calories === 0 ? 0 : totals.calories / targets.calories,
      proteinG:
        targets.proteinG === 0 ? 0 : totals.proteinG / targets.proteinG,
      carbsG: targets.carbsG === 0 ? 0 : totals.carbsG / targets.carbsG,
      fatG: targets.fatG === 0 ? 0 : totals.fatG / targets.fatG,
    },
    cannabisInfusedMg,
  };
}

export function buildEntryFromOcr(input: {
  candidate: OcrCandidate;
  slot: MealSlot;
  servingsConsumed: number;
  photoDataUrl?: string;
}): FoodEntry {
  return {
    id: cryptoRandomId(),
    loggedAt: new Date().toISOString(),
    slot: input.slot,
    label: input.candidate.label,
    servingDescription: input.candidate.servingDescription,
    servingsConsumed: input.servingsConsumed,
    source: "ocr-photo",
    macros: input.candidate.macros,
    photoDataUrl: input.photoDataUrl,
  };
}

export function buildEntryFromBarcode(input: {
  product: BarcodeProduct;
  slot: MealSlot;
  servingsConsumed: number;
}): FoodEntry {
  return {
    id: cryptoRandomId(),
    loggedAt: new Date().toISOString(),
    slot: input.slot,
    label: `${input.product.brand} — ${input.product.label}`,
    servingDescription: input.product.servingDescription,
    servingsConsumed: input.servingsConsumed,
    source: "barcode",
    macros: input.product.macros,
    barcode: input.product.barcode,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

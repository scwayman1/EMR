// EMR-018 — Leafly Strain Database Integration.
//
// Maps the most common medical issues cannabis is used for (sleep,
// anxiety, insomnia, stress, pain, cancer, etc.) to flower strains,
// each with its terpene and cannabinoid profile, and exposes a
// symptom → strain matcher that powers the public Strain Finder on the
// Education tab.
//
// In production `fetchLeaflyStrains` hits the Leafly B2B API; without a
// key (or network) it falls back to the curated catalog below so the
// finder always renders real, clinically-coherent results.

export interface LeaflyStrainData {
  slug: string;
  name: string;
  category: "Indica" | "Sativa" | "Hybrid" | "CBD" | string;
  /** Approximate THC potency, percent of dry weight. */
  thcLevel: number;
  /** Approximate CBD potency, percent of dry weight. */
  cbdLevel: number;
  dominantTerpene: string;
  /** Secondary terpenes that round out the entourage effect. */
  terpenes?: string[];
  effects: string[];
  /** Plain-language conditions this strain is commonly used for. */
  helpsWith?: string[];
  /** One-line clinician-readable summary. */
  summary?: string;
}

/** Curated medical strain catalog. Kept clinically coherent rather than
 *  exhaustive — every entry carries a terpene + cannabinoid profile so the
 *  finder can explain *why* a strain matches a symptom. */
export const STRAIN_CATALOG: LeaflyStrainData[] = [
  {
    slug: "blue-dream",
    name: "Blue Dream",
    category: "Hybrid",
    thcLevel: 18,
    cbdLevel: 0.1,
    dominantTerpene: "Myrcene",
    terpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    effects: ["Happy", "Relaxed", "Uplifted"],
    helpsWith: ["stress", "pain", "depression", "anxiety"],
    summary:
      "Balanced daytime hybrid; gentle body relaxation without heavy sedation.",
  },
  {
    slug: "granddaddy-purple",
    name: "Granddaddy Purple",
    category: "Indica",
    thcLevel: 20,
    cbdLevel: 0.1,
    dominantTerpene: "Linalool",
    terpenes: ["Linalool", "Myrcene", "Caryophyllene"],
    effects: ["Sleepy", "Relaxed", "Calm"],
    helpsWith: ["insomnia", "sleep", "pain", "stress"],
    summary:
      "Heavy indica rich in linalool and myrcene; a classic before-bed choice.",
  },
  {
    slug: "sour-diesel",
    name: "Sour Diesel",
    category: "Sativa",
    thcLevel: 22,
    cbdLevel: 0.1,
    dominantTerpene: "Caryophyllene",
    terpenes: ["Caryophyllene", "Limonene", "Myrcene"],
    effects: ["Energetic", "Focused", "Uplifted"],
    helpsWith: ["depression", "stress", "fatigue", "anxiety"],
    summary:
      "Fast-acting sativa for daytime energy and mood; favour low doses for anxiety.",
  },
  {
    slug: "charlottes-web",
    name: "Charlotte's Web",
    category: "CBD",
    thcLevel: 0.3,
    cbdLevel: 17,
    dominantTerpene: "Pinene",
    terpenes: ["Pinene", "Myrcene", "Caryophyllene"],
    effects: ["Focused", "Relaxed", "Clear-headed"],
    helpsWith: ["epilepsy", "anxiety", "seizures", "inflammation"],
    summary:
      "High-CBD, minimal-THC cultivar; non-intoxicating, well known for seizure support.",
  },
  {
    slug: "acdc",
    name: "ACDC",
    category: "CBD",
    thcLevel: 1,
    cbdLevel: 20,
    dominantTerpene: "Myrcene",
    terpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    effects: ["Relaxed", "Clear-headed", "Focused"],
    helpsWith: ["pain", "anxiety", "inflammation", "cancer"],
    summary:
      "~20:1 CBD:THC; daytime relief with little to no intoxication. Common adjunct in oncology supportive care.",
  },
  {
    slug: "harlequin",
    name: "Harlequin",
    category: "Hybrid",
    thcLevel: 7,
    cbdLevel: 10,
    dominantTerpene: "Myrcene",
    terpenes: ["Myrcene", "Pinene", "Caryophyllene"],
    effects: ["Clear-headed", "Relaxed", "Alert"],
    helpsWith: ["pain", "anxiety", "stress", "inflammation"],
    summary:
      "Reliable ~5:2 CBD:THC hybrid; functional daytime relief that stays clear-headed.",
  },
  {
    slug: "northern-lights",
    name: "Northern Lights",
    category: "Indica",
    thcLevel: 18,
    cbdLevel: 0.1,
    dominantTerpene: "Myrcene",
    terpenes: ["Myrcene", "Caryophyllene", "Pinene"],
    effects: ["Sleepy", "Relaxed", "Euphoric"],
    helpsWith: ["insomnia", "sleep", "pain", "stress"],
    summary: "Deeply sedating indica; pain and sleep support in the evening.",
  },
  {
    slug: "girl-scout-cookies",
    name: "Girl Scout Cookies",
    category: "Hybrid",
    thcLevel: 25,
    cbdLevel: 0.2,
    dominantTerpene: "Caryophyllene",
    terpenes: ["Caryophyllene", "Limonene", "Humulene"],
    effects: ["Euphoric", "Relaxed", "Happy"],
    helpsWith: ["pain", "nausea", "appetite", "cancer", "stress"],
    summary:
      "Potent hybrid; strong euphoria with appetite and nausea support — useful in chemo-related symptoms.",
  },
  {
    slug: "jack-herer",
    name: "Jack Herer",
    category: "Sativa",
    thcLevel: 19,
    cbdLevel: 0.1,
    dominantTerpene: "Terpinolene",
    terpenes: ["Terpinolene", "Pinene", "Caryophyllene"],
    effects: ["Focused", "Energetic", "Creative"],
    helpsWith: ["depression", "fatigue", "stress", "focus"],
    summary:
      "Bright terpinolene-forward sativa; clear focus and mood lift for daytime use.",
  },
  {
    slug: "white-widow",
    name: "White Widow",
    category: "Hybrid",
    thcLevel: 19,
    cbdLevel: 0.2,
    dominantTerpene: "Myrcene",
    terpenes: ["Myrcene", "Caryophyllene", "Pinene"],
    effects: ["Euphoric", "Energetic", "Relaxed"],
    helpsWith: ["stress", "depression", "pain", "fatigue"],
    summary: "Even hybrid; balanced lift and relaxation, a versatile staple.",
  },
];

/**
 * Symptom synonyms → canonical condition keys used in `helpsWith`.
 * Lets the finder accept natural language ("can't sleep", "nervous")
 * and still match strain metadata.
 */
const SYMPTOM_SYNONYMS: Record<string, string> = {
  "cant sleep": "insomnia",
  "trouble sleeping": "insomnia",
  sleepless: "insomnia",
  insomnia: "insomnia",
  sleep: "sleep",
  nervous: "anxiety",
  anxious: "anxiety",
  anxiety: "anxiety",
  panic: "anxiety",
  stress: "stress",
  stressed: "stress",
  tension: "stress",
  pain: "pain",
  ache: "pain",
  sore: "pain",
  "chronic pain": "pain",
  inflammation: "inflammation",
  cancer: "cancer",
  chemo: "cancer",
  nausea: "nausea",
  appetite: "appetite",
  depression: "depression",
  depressed: "depression",
  "low mood": "depression",
  fatigue: "fatigue",
  tired: "fatigue",
  focus: "focus",
  seizure: "seizures",
  seizures: "seizures",
  epilepsy: "epilepsy",
};

export interface StrainMatch extends LeaflyStrainData {
  /** 0–100 relevance score for the queried symptom. */
  matchScore: number;
  /** The canonical condition the query resolved to. */
  matchedCondition: string;
}

/** Resolve a free-text symptom query to a canonical condition key. */
export function normalizeSymptom(query: string): string | null {
  // Lowercase, drop apostrophes ("can't" → "cant"), and collapse runs of
  // non-alphanumerics to single spaces so punctuation never blocks a match.
  const q = query
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!q) return null;
  if (SYMPTOM_SYNONYMS[q]) return SYMPTOM_SYNONYMS[q];
  // Substring fallback: longest matching synonym wins.
  const hit = Object.keys(SYMPTOM_SYNONYMS)
    .filter((syn) => q.includes(syn))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? SYMPTOM_SYNONYMS[hit] : q;
}

/**
 * Match strains to a free-text symptom query, ranked by relevance.
 * Pure function — safe to unit test and call from client or server.
 */
export function matchStrainsToSymptom(
  query: string,
  catalog: LeaflyStrainData[] = STRAIN_CATALOG,
): StrainMatch[] {
  const condition = normalizeSymptom(query);
  if (!condition) return [];

  return catalog
    .map((strain) => {
      const helps = (strain.helpsWith ?? []).map((h) => h.toLowerCase());
      let score = 0;
      if (helps.includes(condition)) score += 70;
      // Primary listed condition (first entry) gets a relevance bump.
      if (helps[0] === condition) score += 15;
      // Soft match on related effect terms.
      const effectText = strain.effects.join(" ").toLowerCase();
      if (
        (condition === "insomnia" || condition === "sleep") &&
        /sleep|relax|calm/.test(effectText)
      )
        score += 10;
      if (
        (condition === "anxiety" || condition === "stress") &&
        /relax|calm|clear/.test(effectText)
      )
        score += 10;
      if (
        (condition === "depression" || condition === "fatigue") &&
        /energ|uplift|happy|focus|creative/.test(effectText)
      )
        score += 10;
      return { ...strain, matchScore: Math.min(score, 100), matchedCondition: condition };
    })
    .filter((s) => s.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/** Distinct conditions covered by the catalog, for UI suggestion chips. */
export function listCoveredConditions(
  catalog: LeaflyStrainData[] = STRAIN_CATALOG,
): string[] {
  const set = new Set<string>();
  for (const s of catalog) for (const c of s.helpsWith ?? []) set.add(c);
  return Array.from(set).sort();
}

export async function fetchLeaflyStrains(): Promise<LeaflyStrainData[]> {
  // In a real app, this hits the Leafly B2B API.
  try {
    const res = await fetch("https://api.leafly.com/v1/strains");
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch {
    // Fallthrough to the curated catalog if fetch fails (no key, CORS, offline).
  }

  return STRAIN_CATALOG;
}

// EMR-018 — Strain finder.
//
// Maps a patient's symptoms to candidate strains, ranked by symptom
// overlap and (optionally) preferred classification (indica/sativa/
// hybrid). Pure scoring lives here so it's testable without Prisma.

export type StrainClassification = "indica" | "sativa" | "hybrid" | "cbd" | "na";

export interface StrainRow {
  id: string;
  slug: string;
  name: string;
  classification: StrainClassification;
  thcPercent: number | null;
  cbdPercent: number | null;
  dominantTerpene: string | null;
  symptoms: string[];
  effects: string[];
  flavors: string[];
  description: string | null;
}

export interface FinderQuery {
  symptoms: string[];
  preferredClassification?: StrainClassification;
  /** Cap THC %, e.g. 18 for THC-cautious patients. */
  maxThcPercent?: number;
  /** Floor CBD %, e.g. 5 for patients who want CBD support. */
  minCbdPercent?: number;
}

export interface ScoredStrain {
  strain: StrainRow;
  score: number;
  matchedSymptoms: string[];
  reasons: string[];
}

export function normalizeSymptom(s: string): string {
  return s.toLowerCase().trim();
}

const CANNABIS_INSOMNIA = new Set(["insomnia", "sleep", "trouble sleeping"]);
const CANNABIS_ANXIETY = new Set(["anxiety", "stress", "worry", "panic"]);
const CANNABIS_PAIN = new Set(["pain", "chronic pain", "muscle pain", "nerve pain"]);

/**
 * Treat near-synonyms as a soft match. We don't want to bury "sleep"
 * matches under a strict equality on "insomnia".
 */
function symptomMatches(strainSymptoms: string[], target: string): boolean {
  const t = normalizeSymptom(target);
  for (const s of strainSymptoms) {
    const norm = normalizeSymptom(s);
    if (norm === t) return true;
    if (CANNABIS_INSOMNIA.has(norm) && CANNABIS_INSOMNIA.has(t)) return true;
    if (CANNABIS_ANXIETY.has(norm) && CANNABIS_ANXIETY.has(t)) return true;
    if (CANNABIS_PAIN.has(norm) && CANNABIS_PAIN.has(t)) return true;
  }
  return false;
}

export function scoreStrain(strain: StrainRow, query: FinderQuery): ScoredStrain {
  const matchedSymptoms: string[] = [];
  const reasons: string[] = [];
  let score = 0;

  for (const target of query.symptoms) {
    if (symptomMatches(strain.symptoms, target)) {
      matchedSymptoms.push(target);
      score += 0.25;
    }
  }
  if (matchedSymptoms.length > 0) {
    reasons.push(`Symptom match: ${matchedSymptoms.join(", ")}`);
  }

  if (
    query.preferredClassification &&
    strain.classification === query.preferredClassification
  ) {
    score += 0.15;
    reasons.push(`Classification: ${strain.classification}`);
  }

  if (query.maxThcPercent !== undefined) {
    if (strain.thcPercent !== null && strain.thcPercent <= query.maxThcPercent) {
      score += 0.1;
      reasons.push(`THC ≤ ${query.maxThcPercent}%`);
    } else if (strain.thcPercent !== null && strain.thcPercent > query.maxThcPercent) {
      // Hard penalty: patient explicitly capped THC.
      score -= 0.5;
      reasons.push(`Above THC cap (${strain.thcPercent}%)`);
    }
  }

  if (query.minCbdPercent !== undefined) {
    if (strain.cbdPercent !== null && strain.cbdPercent >= query.minCbdPercent) {
      score += 0.1;
      reasons.push(`CBD ≥ ${query.minCbdPercent}%`);
    }
  }

  return {
    strain,
    score: Math.max(0, Math.min(1, score)),
    matchedSymptoms,
    reasons,
  };
}

export function rankStrains(rows: StrainRow[], query: FinderQuery): ScoredStrain[] {
  if (query.symptoms.length === 0 && !query.preferredClassification) {
    // No filter — return rows in their natural order, scored 0.
    return rows.map((s) => ({ strain: s, score: 0, matchedSymptoms: [], reasons: [] }));
  }
  return rows
    .map((s) => scoreStrain(s, query))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

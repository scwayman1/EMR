// EMR-007 — AI Supply Store recommender.
//
// Pure scoring layer that ranks SupplyProduct candidates against a
// patient's symptoms, conditions, and contraindications. The
// "AI-Powered" framing in the ticket is satisfied by the upstream
// agent that classifies the patient's chart into symptom tags; this
// module turns those tags into a deterministic ranked list.
//
// Splitting the scoring out of Prisma means we can unit-test it
// without a database and reuse the same logic in tools that mock the
// catalog (eg. /portal/wellness-toolkit suggestions).

export type SupplyCategory =
  | "cough_cold"
  | "sleep"
  | "pain"
  | "digestive"
  | "vitamins_supplements"
  | "dme"
  | "topical"
  | "oral_care"
  | "mental_health"
  | "womens_health"
  | "general_wellness";

export interface SupplyProductCandidate {
  id: string;
  slug: string;
  name: string;
  brand?: string | null;
  category: SupplyCategory;
  description: string;
  shortDescription?: string | null;
  imageUrl?: string | null;
  priceCents: number;
  symptoms: string[];
  conditions: string[];
  contraindications: string[];
  isOTC: boolean;
  requiresRx: boolean;
  fsaEligible: boolean;
  externalUrl?: string | null;
  externalPartner?: string | null;
}

export interface PatientContext {
  /** Lower-cased symptom strings, e.g. "cough", "insomnia". */
  symptoms: string[];
  /** Lower-cased active conditions / diagnoses. */
  conditions: string[];
  /** Active medications and known allergies — used for contraindication blocking. */
  contraindications: string[];
  /** When set, only categories explicitly requested are considered. */
  categoryFilter?: SupplyCategory[];
}

export interface RankedSupplyProduct {
  product: SupplyProductCandidate;
  score: number;
  matchedSymptoms: string[];
  matchedConditions: string[];
  blockedReason?: string;
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function intersect(a: string[], b: string[]): string[] {
  const set = new Set(a.map(normalize));
  const out: string[] = [];
  for (const x of b) if (set.has(normalize(x))) out.push(x);
  return out;
}

function blocksOnContraindication(
  product: SupplyProductCandidate,
  patient: PatientContext,
): string | null {
  const patientFlags = patient.contraindications.map(normalize);
  const productFlags = product.contraindications.map(normalize);
  for (const flag of productFlags) {
    if (patientFlags.includes(flag)) return flag;
  }
  return null;
}

export function scoreSupplyProduct(
  product: SupplyProductCandidate,
  patient: PatientContext,
): RankedSupplyProduct {
  const block = blocksOnContraindication(product, patient);
  if (block) {
    return {
      product,
      score: 0,
      matchedSymptoms: [],
      matchedConditions: [],
      blockedReason: `Contraindicated for ${block}`,
    };
  }

  const matchedSymptoms = intersect(product.symptoms, patient.symptoms);
  const matchedConditions = intersect(product.conditions, patient.conditions);

  let score = 0;
  // Symptom match is the strongest signal (the patient's lived
  // experience of the issue) — each match is worth more than a
  // condition tag.
  score += matchedSymptoms.length * 0.25;
  score += matchedConditions.length * 0.15;

  return {
    product,
    score: Math.min(1, score),
    matchedSymptoms,
    matchedConditions,
  };
}

export function recommend(
  catalog: SupplyProductCandidate[],
  patient: PatientContext,
  limit = 12,
): RankedSupplyProduct[] {
  const filtered = patient.categoryFilter && patient.categoryFilter.length > 0
    ? catalog.filter((p) => patient.categoryFilter!.includes(p.category))
    : catalog;
  return filtered
    .map((p) => scoreSupplyProduct(p, patient))
    .filter((r) => !r.blockedReason && r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

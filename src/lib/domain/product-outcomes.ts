// Per-product outcome analytics (Dr. Patel Directive).
//
// Pure, dependency-free helpers that compute efficacy signals from a
// patient's (or cohort's) ProductOutcome rows. These power:
//   - the My Health product ranking surfaces
//   - the research / reimbursement export pipeline
//   - the outcome-tracker agent's per-product summaries
//
// Everything here is deterministic and synchronous — no Prisma, no I/O.
// Keep it that way so it stays trivially testable from any edge.

/**
 * Shape of a single outcome log — matches the ProductOutcome Prisma row but
 * accepts any compatible subset, so callers don't have to pull the full
 * Prisma type in when they just need the analytics.
 */
export interface ProductOutcomeLike {
  productId: string;
  effectivenessScore: number; // 1-10
  sideEffects: string[];
  loggedAt: Date | string;
}

/** Feeling values — mirror the Prisma enum. */
export type ProductFeeling = "great" | "good" | "ok" | "bad" | "awful";

export const PRODUCT_FEELINGS: readonly ProductFeeling[] = [
  "great",
  "good",
  "ok",
  "bad",
  "awful",
] as const;

/**
 * Weighting assumptions:
 *
 *   efficacy = weightedMean(effectivenessScore)
 *            - sideEffectPenalty * avgSideEffectsPerLog
 *
 * - Recent logs are weighted slightly higher than old logs, because a
 *   patient's current response to a product matters more than ancient
 *   history when ranking products for continued use.
 * - Each additional side-effect per dose shaves a small amount off the
 *   score so that a 10/10 product that always causes headaches doesn't
 *   beat a 9/10 product that causes none.
 * - Output is clamped to [0, 10] so downstream UI always gets a sane
 *   value.
 */
const RECENCY_HALF_LIFE_DAYS = 30;
const SIDE_EFFECT_PENALTY = 0.6;

/**
 * Compute a single patient-facing efficacy score for one product, given
 * all of their outcome logs for that product. Returns null if there are
 * no usable logs (zero-weight, all out-of-range).
 */
export function computeProductEfficacyScore(
  outcomes: ProductOutcomeLike[],
  now: Date = new Date(),
): number | null {
  if (!outcomes || outcomes.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;
  let sideEffectTotal = 0;
  let countedLogs = 0;

  for (const o of outcomes) {
    const score = Number(o.effectivenessScore);
    if (!Number.isFinite(score) || score < 1 || score > 10) continue;

    const logged =
      o.loggedAt instanceof Date ? o.loggedAt : new Date(o.loggedAt);
    const ageMs = now.getTime() - logged.getTime();
    const ageDays = Math.max(0, ageMs / 86_400_000);
    // Exponential decay — weight halves every RECENCY_HALF_LIFE_DAYS.
    const weight = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);

    weightedSum += score * weight;
    weightTotal += weight;
    sideEffectTotal += Array.isArray(o.sideEffects) ? o.sideEffects.length : 0;
    countedLogs += 1;
  }

  if (countedLogs === 0 || weightTotal === 0) return null;

  const weightedMean = weightedSum / weightTotal;
  const avgSideEffects = sideEffectTotal / countedLogs;
  const penalty = SIDE_EFFECT_PENALTY * avgSideEffects;

  const raw = weightedMean - penalty;
  return clamp(raw, 0, 10);
}

export interface ProductRankingEntry {
  productId: string;
  avgScore: number; // efficacy score clamped 0-10
  sampleSize: number; // number of logs counted
  latestLoggedAt: Date | null;
}

/**
 * Group a flat list of outcomes by productId and return a ranking,
 * highest avgScore first. Ties break on larger sampleSize, then on more
 * recent latestLoggedAt. Products with no scoreable logs are omitted.
 */
export function productRanking(
  outcomes: ProductOutcomeLike[],
  now: Date = new Date(),
): ProductRankingEntry[] {
  if (!outcomes || outcomes.length === 0) return [];

  const buckets = new Map<string, ProductOutcomeLike[]>();
  for (const o of outcomes) {
    if (!o.productId) continue;
    const list = buckets.get(o.productId);
    if (list) list.push(o);
    else buckets.set(o.productId, [o]);
  }

  const rows: ProductRankingEntry[] = [];
  for (const [productId, logs] of buckets) {
    const score = computeProductEfficacyScore(logs, now);
    if (score === null) continue;
    let latest: Date | null = null;
    let counted = 0;
    for (const o of logs) {
      const s = Number(o.effectivenessScore);
      if (!Number.isFinite(s) || s < 1 || s > 10) continue;
      counted += 1;
      const ts = o.loggedAt instanceof Date ? o.loggedAt : new Date(o.loggedAt);
      if (!latest || ts.getTime() > latest.getTime()) latest = ts;
    }
    rows.push({
      productId,
      avgScore: score,
      sampleSize: counted,
      latestLoggedAt: latest,
    });
  }

  rows.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    if (b.sampleSize !== a.sampleSize) return b.sampleSize - a.sampleSize;
    const at = a.latestLoggedAt?.getTime() ?? 0;
    const bt = b.latestLoggedAt?.getTime() ?? 0;
    return bt - at;
  });

  return rows;
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

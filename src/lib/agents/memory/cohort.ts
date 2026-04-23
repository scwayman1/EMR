/**
 * Cohort Awareness helpers.
 *
 * This module lets an agent answer the question every physician asks after
 * reading a chart: "how have patients like this one responded to something
 * similar?" For V1 we intentionally keep this deterministic and SQL-based —
 * no embeddings, no similarity models, no vector index. Just a weighted
 * overlap across structured fields we already maintain (presenting concern,
 * qualification status, active dosing regimen product types, geography,
 * age, and memory tags).
 *
 * Design principles:
 *
 *   1. Organization boundaries are a hard filter, never a weight.
 *      We will never surface patient data across orgs, even if the match
 *      is perfect. Every query starts with the subject patient's
 *      organizationId and stays inside it.
 *
 *   2. Determinism. Same inputs → same outputs. Agents compare cohort
 *      insights across visits, so we can't have the ordering wobble on
 *      ties. We break ties by patient id ascending.
 *
 *   3. Cheap now, smarter later. The similarity function scans the
 *      candidate pool for the subject's org, which is fine for V1 since
 *      orgs are small (hundreds of patients, not millions). When an org
 *      grows, we can move the weighting into a materialized feature
 *      table or swap in vector search — the public function signatures
 *      here are the stable contract.
 *
 *   4. Summaries are compact. An LLM prompt block has to pay per token,
 *      so `formatCohortInsightForPrompt` produces 3-6 lines, not a table.
 */

import { prisma } from "@/lib/db/prisma";
import type { OutcomeMetric, QualificationStatus } from "@prisma/client";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

/** Options for `findSimilarPatients`. */
export interface FindSimilarPatientsOptions {
  /** Max results to return. Default 5. */
  limit?: number;
  /**
   * Minimum similarity score (0-1) a candidate must reach to be included.
   * Default 0.1 — i.e. at least one dimension has to actually overlap.
   */
  minScore?: number;
  /**
   * Max candidate pool to score. Cheap guardrail so we don't accidentally
   * score an entire org. Default 500.
   */
  candidateLimit?: number;
}

/** Result row from `findSimilarPatients`. */
export interface SimilarPatient {
  patientId: string;
  /** 0-1, higher is more similar. */
  score: number;
  /** Human-readable explanation of why this patient matched. */
  reason: string;
  /** The individual weighted contributions, for debugging / explainability. */
  breakdown: {
    presentingConcerns: number;
    qualificationStatus: number;
    regimenProductTypes: number;
    geography: number;
    age: number;
    memoryTags: number;
  };
}

/** Aggregated cohort outcome summary. */
export interface CohortOutcomeSummary {
  patientCount: number;
  metrics: Partial<
    Record<
      OutcomeMetric,
      {
        before: number;
        recent: number;
        trend: "improving" | "worsening" | "stable" | "unknown";
        sampleSize: number;
      }
    >
  >;
}

/** What `formatCohortInsightForPrompt` consumes. */
export interface CohortInsight {
  similar: SimilarPatient[];
  outcomes: CohortOutcomeSummary;
  /**
   * Optional top-level reason string — usually the strongest shared reason
   * across the cohort. Callers can pass their own or let the formatter
   * infer one from the similar patients.
   */
  headline?: string;
}

// ---------------------------------------------------------------
// Weights — tuneable constants, kept here so they're easy to adjust.
// ---------------------------------------------------------------

const WEIGHTS = {
  presentingConcerns: 0.3,
  qualificationStatus: 0.1,
  regimenProductTypes: 0.3,
  geography: 0.1,
  age: 0.1,
  memoryTags: 0.1,
} as const;

// ---------------------------------------------------------------
// findSimilarPatients
// ---------------------------------------------------------------

/**
 * Find up to `limit` structurally-similar patients in the same organization
 * as the subject. Returns scored matches sorted by descending score, then
 * ascending patient id (deterministic tiebreak). The subject patient is
 * always excluded.
 */
export async function findSimilarPatients(
  patientId: string,
  options: FindSimilarPatientsOptions = {},
): Promise<SimilarPatient[]> {
  const limit = options.limit ?? 5;
  const minScore = options.minScore ?? 0.1;
  const candidateLimit = options.candidateLimit ?? 500;

  // 1. Load the subject patient + the signals we need to score against.
  const subject = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      organizationId: true,
      city: true,
      state: true,
      dateOfBirth: true,
      presentingConcerns: true,
      qualificationStatus: true,
      dosingRegimens: {
        where: { active: true },
        select: {
          product: { select: { productType: true } },
        },
      },
      memories: {
        where: { validUntil: null },
        select: { tags: true },
      },
    },
  });

  if (!subject) return [];

  const subjectConcernTokens = tokenizeConcerns(subject.presentingConcerns);
  const subjectProductTypes = new Set(
    subject.dosingRegimens
      .map((r) => r.product?.productType)
      .filter((p): p is NonNullable<typeof p> => Boolean(p)),
  );
  const subjectTags = new Set(subject.memories.flatMap((m) => m.tags));
  const subjectAge = ageFromDob(subject.dateOfBirth);

  // 2. Pull the candidate pool: everyone else in the same org, not
  //    soft-deleted. We cap at candidateLimit so this stays cheap.
  const candidates = await prisma.patient.findMany({
    where: {
      organizationId: subject.organizationId,
      deletedAt: null,
      id: { not: patientId },
    },
    select: {
      id: true,
      city: true,
      state: true,
      dateOfBirth: true,
      presentingConcerns: true,
      qualificationStatus: true,
      dosingRegimens: {
        where: { active: true },
        select: {
          product: { select: { productType: true } },
        },
      },
      memories: {
        where: { validUntil: null },
        select: { tags: true },
      },
    },
    orderBy: { id: "asc" },
    take: candidateLimit,
  });

  // 3. Score each candidate.
  const scored: SimilarPatient[] = [];
  for (const c of candidates) {
    const concernScore = jaccardOverlap(
      subjectConcernTokens,
      tokenizeConcerns(c.presentingConcerns),
    );
    const qualScore = overlapQualification(
      subject.qualificationStatus,
      c.qualificationStatus,
    );
    const productScore = jaccardOverlap(
      subjectProductTypes,
      new Set(
        c.dosingRegimens
          .map((r) => r.product?.productType)
          .filter((p): p is NonNullable<typeof p> => Boolean(p)),
      ),
    );
    const geoScore = geographyScore(subject, c);
    const ageScore = ageBracketScore(subjectAge, ageFromDob(c.dateOfBirth));
    const tagScore = jaccardOverlap(
      subjectTags,
      new Set(c.memories.flatMap((m) => m.tags)),
    );

    const breakdown = {
      presentingConcerns: concernScore * WEIGHTS.presentingConcerns,
      qualificationStatus: qualScore * WEIGHTS.qualificationStatus,
      regimenProductTypes: productScore * WEIGHTS.regimenProductTypes,
      geography: geoScore * WEIGHTS.geography,
      age: ageScore * WEIGHTS.age,
      memoryTags: tagScore * WEIGHTS.memoryTags,
    };

    const score =
      breakdown.presentingConcerns +
      breakdown.qualificationStatus +
      breakdown.regimenProductTypes +
      breakdown.geography +
      breakdown.age +
      breakdown.memoryTags;

    if (score < minScore) continue;

    scored.push({
      patientId: c.id,
      score: round3(score),
      reason: buildReason(breakdown),
      breakdown: {
        presentingConcerns: round3(breakdown.presentingConcerns),
        qualificationStatus: round3(breakdown.qualificationStatus),
        regimenProductTypes: round3(breakdown.regimenProductTypes),
        geography: round3(breakdown.geography),
        age: round3(breakdown.age),
        memoryTags: round3(breakdown.memoryTags),
      },
    });
  }

  // 4. Sort descending by score, then ascending by id for a deterministic
  //    tiebreak, and trim to limit.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.patientId < b.patientId ? -1 : a.patientId > b.patientId ? 1 : 0;
  });
  return scored.slice(0, limit);
}

// ---------------------------------------------------------------
// summarizeCohortOutcomes
// ---------------------------------------------------------------

/**
 * Aggregate recent outcome logs across a set of patients. For each metric
 * we compute two averages: the patient's *baseline* (the mean of their
 * first 30 days of logs for that metric) and their *recent* reading (the
 * mean of their most recent 14 days of logs). A metric's cohort summary
 * averages those per-patient before/after values, so a patient with only
 * baseline or only recent data contributes to whichever side they have.
 *
 * If `metric` is provided we restrict the query to just that metric;
 * otherwise we return a row per metric that has at least one logged value
 * in the cohort.
 */
export async function summarizeCohortOutcomes(
  patientIds: string[],
  metric?: OutcomeMetric,
): Promise<CohortOutcomeSummary> {
  if (patientIds.length === 0) {
    return { patientCount: 0, metrics: {} };
  }

  // Pull all outcome logs for the cohort in one query. For V1 this is
  // fine — cohorts cap out at a handful of patients and each patient
  // typically has tens of logs, not thousands.
  const logs = await prisma.outcomeLog.findMany({
    where: {
      patientId: { in: patientIds },
      ...(metric ? { metric } : {}),
    },
    orderBy: [{ patientId: "asc" }, { loggedAt: "asc" }],
    select: {
      patientId: true,
      metric: true,
      value: true,
      loggedAt: true,
    },
  });

  // Bucket by patient + metric.
  type Bucket = { patientId: string; metric: OutcomeMetric; values: { value: number; loggedAt: Date }[] };
  const buckets = new Map<string, Bucket>();
  for (const log of logs) {
    const key = `${log.patientId}::${log.metric}`;
    const bucket = buckets.get(key) ?? {
      patientId: log.patientId,
      metric: log.metric,
      values: [],
    };
    bucket.values.push({ value: log.value, loggedAt: log.loggedAt });
    buckets.set(key, bucket);
  }

  // For each (patient, metric), compute before (first 30 days from the
  // patient's earliest log for that metric) and recent (last 14 days
  // ending at the patient's latest log).
  const perMetric = new Map<
    OutcomeMetric,
    { beforeVals: number[]; recentVals: number[]; patients: Set<string> }
  >();

  for (const bucket of buckets.values()) {
    if (bucket.values.length === 0) continue;
    bucket.values.sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
    const first = bucket.values[0].loggedAt.getTime();
    const last = bucket.values[bucket.values.length - 1].loggedAt.getTime();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

    const beforeWindow: number[] = [];
    const recentWindow: number[] = [];
    for (const { value, loggedAt } of bucket.values) {
      const ts = loggedAt.getTime();
      if (ts - first <= THIRTY_DAYS) beforeWindow.push(value);
      if (last - ts <= FOURTEEN_DAYS) recentWindow.push(value);
    }

    const entry = perMetric.get(bucket.metric) ?? {
      beforeVals: [],
      recentVals: [],
      patients: new Set<string>(),
    };
    if (beforeWindow.length > 0) {
      entry.beforeVals.push(mean(beforeWindow));
    }
    if (recentWindow.length > 0) {
      entry.recentVals.push(mean(recentWindow));
    }
    entry.patients.add(bucket.patientId);
    perMetric.set(bucket.metric, entry);
  }

  const metrics: CohortOutcomeSummary["metrics"] = {};
  for (const [m, entry] of perMetric.entries()) {
    const before = entry.beforeVals.length > 0 ? round1(mean(entry.beforeVals)) : NaN;
    const recent = entry.recentVals.length > 0 ? round1(mean(entry.recentVals)) : NaN;
    metrics[m] = {
      before: Number.isNaN(before) ? 0 : before,
      recent: Number.isNaN(recent) ? 0 : recent,
      trend: computeTrend(m, before, recent),
      sampleSize: entry.patients.size,
    };
  }

  // Deterministic key order: alphabetized by metric name.
  const orderedMetrics: CohortOutcomeSummary["metrics"] = {};
  for (const key of Object.keys(metrics).sort() as OutcomeMetric[]) {
    orderedMetrics[key] = metrics[key];
  }

  return {
    patientCount: patientIds.length,
    metrics: orderedMetrics,
  };
}

// ---------------------------------------------------------------
// formatCohortInsightForPrompt
// ---------------------------------------------------------------

/**
 * Render a cohort insight as a compact, prompt-ready string. The output
 * is intentionally small (headline line + one bullet per metric) so it
 * can be pasted into a system prompt without blowing the token budget.
 */
export function formatCohortInsightForPrompt(insight: CohortInsight): string {
  const { similar, outcomes } = insight;
  const count = similar.length;

  if (count === 0) {
    return "Cohort context: no structurally similar patients found in this organization yet.";
  }

  const headline =
    insight.headline ??
    summarizeHeadlineReason(similar) ??
    "shared presenting concern and regimen profile";

  const lines: string[] = [
    `Cohort context: ${count} similar patient${count === 1 ? "" : "s"} (${headline}).`,
  ];

  // Metrics in deterministic order (alphabetical).
  const metricKeys = Object.keys(outcomes.metrics).sort() as OutcomeMetric[];
  for (const key of metricKeys) {
    const row = outcomes.metrics[key];
    if (!row) continue;
    if (row.sampleSize === 0) continue;
    lines.push(
      `  · ${capitalize(key)}: avg ${formatNum(row.before)} -> ${formatNum(
        row.recent,
      )} (${row.trend}) across ${row.sampleSize} patient${
        row.sampleSize === 1 ? "" : "s"
      }`,
    );
  }

  if (lines.length === 1) {
    lines.push("  · (no recent outcome logs aggregated yet)");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------

/**
 * Split a presenting-concerns free-text string into a set of normalized
 * tokens. We lowercase, strip non-word characters, drop short stop words,
 * and dedupe. This is a good-enough keyword overlap for V1.
 */
function tokenizeConcerns(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set();
  const tokens = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "that",
  "this",
  "has",
  "have",
  "had",
  "was",
  "but",
  "not",
  "into",
  "over",
  "about",
  "they",
  "their",
  "been",
  "some",
  "when",
  "what",
  "like",
  "also",
]);

/** Jaccard similarity between two sets. Empty sets collapse to 0. */
function jaccardOverlap<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * Qualification status "overlap": we treat it as binary — same status is
 * 1, different is 0. There is only one status per patient so Jaccard
 * collapses to an equality check.
 */
function overlapQualification(
  a: QualificationStatus,
  b: QualificationStatus,
): number {
  return a === b ? 1 : 0;
}

/**
 * Geography score: exact state+city match = 1, same state only = 0.5,
 * anything else = 0. Callers control the weight.
 */
function geographyScore(
  a: { city: string | null; state: string | null },
  b: { city: string | null; state: string | null },
): number {
  if (a.state && b.state && a.state === b.state) {
    if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) {
      return 1;
    }
    return 0.5;
  }
  return 0;
}

/**
 * Age bracket score: within 10 years = 1, within 20 = 0.5, else 0. If
 * either DOB is unknown we conservatively return 0 so we don't reward
 * missing data.
 */
function ageBracketScore(a: number | null, b: number | null): number {
  if (a === null || b === null) return 0;
  const diff = Math.abs(a - b);
  if (diff <= 10) return 1;
  if (diff <= 20) return 0.5;
  return 0;
}

function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const now = Date.now();
  const ageMs = now - dob.getTime();
  if (ageMs < 0) return null;
  return Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Construct a short human-readable reason string from the weighted
 * breakdown. We pick the top 2 non-zero dimensions so the reason stays
 * meaningful without being a laundry list.
 */
function buildReason(breakdown: {
  presentingConcerns: number;
  qualificationStatus: number;
  regimenProductTypes: number;
  geography: number;
  age: number;
  memoryTags: number;
}): string {
  const dims: { key: keyof typeof breakdown; value: number; label: string }[] = [
    { key: "presentingConcerns", value: breakdown.presentingConcerns, label: "same presenting concern" },
    { key: "regimenProductTypes", value: breakdown.regimenProductTypes, label: "overlapping cannabis regimen" },
    { key: "memoryTags", value: breakdown.memoryTags, label: "shared memory tags" },
    { key: "qualificationStatus", value: breakdown.qualificationStatus, label: "same qualification status" },
    { key: "geography", value: breakdown.geography, label: "same geography" },
    { key: "age", value: breakdown.age, label: "similar age" },
  ];
  const nonZero = dims.filter((d) => d.value > 0);
  if (nonZero.length === 0) return "weak match across all dimensions";
  nonZero.sort((a, b) => b.value - a.value);
  const top = nonZero.slice(0, 2).map((d) => d.label);
  return top.join(" + ");
}

/**
 * Pick the most common top reason across the cohort for the headline
 * line in the prompt formatter. We count the leading reason of each
 * similar patient and return the most frequent one.
 */
function summarizeHeadlineReason(similar: SimilarPatient[]): string | null {
  if (similar.length === 0) return null;
  const counts = new Map<string, number>();
  for (const s of similar) {
    counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
  }
  let best: { reason: string; count: number } | null = null;
  // Deterministic: alphabetize ties by reason string.
  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });
  if (sorted.length > 0) best = { reason: sorted[0][0], count: sorted[0][1] };
  return best?.reason ?? null;
}

/**
 * Decide whether a metric is improving, worsening, or stable. For most
 * metrics, lower numbers are better (pain, anxiety, nausea, side_effects);
 * for a few, higher is better (sleep, mood, appetite, energy, adherence).
 * "Stable" is +/- 0.5 points; anything less confident returns "unknown".
 */
function computeTrend(
  metric: OutcomeMetric,
  before: number,
  recent: number,
): "improving" | "worsening" | "stable" | "unknown" {
  if (!Number.isFinite(before) || !Number.isFinite(recent)) return "unknown";
  if (before === 0 && recent === 0) return "unknown";
  const delta = recent - before;
  if (Math.abs(delta) < 0.5) return "stable";
  const higherIsBetter = HIGHER_IS_BETTER.has(metric);
  if (higherIsBetter) {
    return delta > 0 ? "improving" : "worsening";
  }
  return delta < 0 ? "improving" : "worsening";
}

const HIGHER_IS_BETTER = new Set<OutcomeMetric>([
  "sleep",
  "mood",
  "appetite",
  "energy",
  "adherence",
]);

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function formatNum(n: number): string {
  return n.toFixed(1);
}

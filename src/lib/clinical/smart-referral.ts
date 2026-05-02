/**
 * EMR-078 — Smart referral packet builder with AI data curation
 *
 * Given a patient's chart and a target specialty, decide what
 * information is *relevant* to send (and what to leave out).
 * The output is a structured packet the clinician reviews before
 * the cover letter is generated and the fax/portal handoff fires.
 *
 * The "AI" piece here is rule-based curation — we score each
 * chart fact against the target specialty's interest profile.
 * A real LLM pass would re-rank the borderline items, but the
 * deterministic baseline is what gates the redaction so a
 * model error never ships PHI we shouldn't have included.
 */

export type Specialty =
  | "cardiology"
  | "neurology"
  | "psychiatry"
  | "oncology"
  | "pain_management"
  | "endocrinology"
  | "rheumatology"
  | "gastroenterology"
  | "pulmonology"
  | "orthopedics"
  | "primary_care"
  | "palliative";

export type ChartFactKind =
  | "problem"
  | "medication"
  | "allergy"
  | "lab"
  | "imaging"
  | "vital"
  | "social"
  | "family_history"
  | "cannabis_use"
  | "note";

export interface ChartFact {
  id: string;
  kind: ChartFactKind;
  /** Short canonical text — "Atorvastatin 40mg daily" */
  label: string;
  /** ISO date the fact was recorded or last updated */
  recordedAt: string;
  /** Optional ICD-10 / RxNorm / LOINC for matching */
  code?: string;
  /** Free-text body — full note, full lab interpretation, etc. */
  body?: string;
  /** Sensitive content (substance use, mental health, HIV, etc.) */
  sensitive?: boolean;
}

export interface ReferralPacket {
  specialty: Specialty;
  reasonForReferral: string;
  curated: CuratedFact[];
  excluded: ExcludedFact[];
  redactionNotes: string[];
  /** Patient must sign separate authorization for any item in this list */
  needsConsentRelease: ChartFact[];
  /** Length of packet in approximate fax pages */
  estimatedPages: number;
}

export interface CuratedFact {
  fact: ChartFact;
  /** 0..1 — how relevant we judged it to the target specialty */
  relevance: number;
  /** Why we chose to include it */
  reason: string;
}

export interface ExcludedFact {
  fact: ChartFact;
  reason: string;
}

const SPECIALTY_INTEREST: Record<Specialty, Partial<Record<ChartFactKind, number>>> = {
  cardiology: {
    vital: 1.0,
    lab: 0.9,
    medication: 0.9,
    problem: 0.95,
    imaging: 0.8,
    family_history: 0.7,
    social: 0.6,
    cannabis_use: 0.5,
    note: 0.4,
    allergy: 0.7,
  },
  neurology: {
    problem: 0.95,
    medication: 0.85,
    imaging: 0.95,
    note: 0.7,
    family_history: 0.7,
    cannabis_use: 0.6,
    lab: 0.6,
    allergy: 0.6,
    vital: 0.4,
    social: 0.5,
  },
  psychiatry: {
    problem: 0.95,
    medication: 0.95,
    note: 0.85,
    social: 0.85,
    cannabis_use: 0.85,
    family_history: 0.75,
    allergy: 0.6,
    lab: 0.4,
    vital: 0.3,
    imaging: 0.3,
  },
  oncology: {
    problem: 1.0,
    imaging: 0.95,
    lab: 0.95,
    medication: 0.85,
    family_history: 0.85,
    note: 0.75,
    allergy: 0.8,
    vital: 0.6,
    social: 0.5,
    cannabis_use: 0.65,
  },
  pain_management: {
    problem: 0.95,
    medication: 0.95,
    note: 0.85,
    cannabis_use: 0.9,
    imaging: 0.85,
    social: 0.65,
    allergy: 0.7,
    lab: 0.55,
    vital: 0.5,
    family_history: 0.4,
  },
  endocrinology: {
    lab: 1.0,
    problem: 0.9,
    medication: 0.85,
    family_history: 0.7,
    vital: 0.7,
    allergy: 0.6,
    note: 0.5,
    imaging: 0.5,
    social: 0.4,
    cannabis_use: 0.4,
  },
  rheumatology: {
    problem: 0.95,
    lab: 0.9,
    medication: 0.85,
    imaging: 0.85,
    note: 0.7,
    allergy: 0.7,
    family_history: 0.7,
    vital: 0.4,
    social: 0.4,
    cannabis_use: 0.5,
  },
  gastroenterology: {
    problem: 0.95,
    lab: 0.85,
    medication: 0.85,
    imaging: 0.85,
    social: 0.7,
    cannabis_use: 0.65,
    note: 0.6,
    allergy: 0.7,
    family_history: 0.6,
    vital: 0.5,
  },
  pulmonology: {
    problem: 0.95,
    imaging: 0.95,
    lab: 0.7,
    medication: 0.85,
    vital: 0.75,
    allergy: 0.7,
    cannabis_use: 0.85,
    social: 0.7,
    note: 0.6,
    family_history: 0.55,
  },
  orthopedics: {
    problem: 0.95,
    imaging: 0.95,
    medication: 0.7,
    note: 0.7,
    allergy: 0.7,
    social: 0.5,
    vital: 0.4,
    lab: 0.4,
    family_history: 0.4,
    cannabis_use: 0.5,
  },
  primary_care: {
    problem: 0.9,
    medication: 0.9,
    allergy: 0.85,
    lab: 0.8,
    vital: 0.8,
    note: 0.75,
    imaging: 0.75,
    family_history: 0.7,
    social: 0.7,
    cannabis_use: 0.7,
  },
  palliative: {
    problem: 0.95,
    medication: 0.9,
    note: 0.85,
    social: 0.85,
    family_history: 0.7,
    cannabis_use: 0.85,
    allergy: 0.7,
    vital: 0.6,
    lab: 0.5,
    imaging: 0.6,
  },
};

const RECENCY_WINDOW_DAYS = 540;
const RELEVANCE_THRESHOLD = 0.55;

export interface BuildReferralInput {
  facts: ChartFact[];
  specialty: Specialty;
  reasonForReferral: string;
  /** If true, omit substance use / mental health unless directly indicated. */
  defaultRedactSensitive?: boolean;
  /** Hard-include fact ids that the clinician picked manually. */
  forceInclude?: string[];
  now?: Date;
}

export function buildReferralPacket(input: BuildReferralInput): ReferralPacket {
  const interest = SPECIALTY_INTEREST[input.specialty];
  const now = input.now ?? new Date();
  const force = new Set(input.forceInclude ?? []);
  const redactSensitive = input.defaultRedactSensitive !== false;

  const curated: CuratedFact[] = [];
  const excluded: ExcludedFact[] = [];
  const redactionNotes: string[] = [];
  const needsConsentRelease: ChartFact[] = [];

  for (const fact of input.facts) {
    const baseInterest = interest[fact.kind] ?? 0.3;
    const recencyBoost = recencyWeight(fact.recordedAt, now);
    const reasonBoost = reasonMatchBoost(fact, input.reasonForReferral);
    const relevance = clamp01(
      baseInterest * 0.6 + recencyBoost * 0.25 + reasonBoost * 0.15
    );

    const sensitiveRequiresConsent =
      fact.sensitive &&
      (fact.kind === "cannabis_use" ||
        /substance|alcohol|hiv|hepatitis|psych|mental/i.test(
          `${fact.label} ${fact.body ?? ""}`
        ));
    if (sensitiveRequiresConsent) {
      needsConsentRelease.push(fact);
    }

    const forced = force.has(fact.id);

    if (
      fact.sensitive &&
      redactSensitive &&
      !forced &&
      !reasonBoost
    ) {
      excluded.push({
        fact,
        reason:
          "Sensitive content redacted by default — patient must authorize 42 CFR Part 2 / state-specific release.",
      });
      redactionNotes.push(
        `Redacted ${fact.kind} "${truncate(fact.label, 40)}" — sensitive without explicit reason match.`
      );
      continue;
    }

    if (relevance < RELEVANCE_THRESHOLD && !forced) {
      excluded.push({
        fact,
        reason: `Relevance ${relevance.toFixed(2)} below threshold ${RELEVANCE_THRESHOLD} for ${input.specialty}.`,
      });
      continue;
    }

    curated.push({
      fact,
      relevance,
      reason: forced
        ? "Manually included by clinician."
        : explainRelevance(fact.kind, input.specialty, recencyBoost, reasonBoost),
    });
  }

  curated.sort((a, b) => b.relevance - a.relevance);

  return {
    specialty: input.specialty,
    reasonForReferral: input.reasonForReferral,
    curated,
    excluded,
    redactionNotes,
    needsConsentRelease,
    estimatedPages: Math.max(1, Math.ceil(curated.length / 12)),
  };
}

function recencyWeight(iso: string, now: Date): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0.5;
  const days = (now.getTime() - t) / (1000 * 60 * 60 * 24);
  if (days < 0) return 1;
  if (days > RECENCY_WINDOW_DAYS) return 0.1;
  return clamp01(1 - days / RECENCY_WINDOW_DAYS);
}

function reasonMatchBoost(fact: ChartFact, reason: string): number {
  const reasonTokens = reason
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 3);
  if (reasonTokens.length === 0) return 0;
  const haystack = `${fact.label} ${fact.body ?? ""} ${fact.code ?? ""}`.toLowerCase();
  const hits = reasonTokens.filter((t) => haystack.includes(t)).length;
  return clamp01(hits / Math.max(2, reasonTokens.length));
}

function explainRelevance(
  kind: ChartFactKind,
  specialty: Specialty,
  recency: number,
  reason: number
): string {
  const parts = [`${kind} is relevant to ${specialty.replace("_", " ")}`];
  if (recency > 0.7) parts.push("recent");
  if (reason > 0.3) parts.push("matches reason for referral");
  return parts.join(" · ");
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

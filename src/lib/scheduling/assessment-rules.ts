/**
 * EMR-917 — Clinical Assessment Rules Engine (Tier 1 + Tier 3).
 *
 * Principle: **agentic assistance, not agentic medicine.** This engine NEVER
 * decides clinical policy and NEVER guesses what a patient needs from free text.
 * It is a pure evaluator over:
 *
 *   - Tier 1: a clinician-owned policy table (concern → assessment → freshness
 *     window → required/recommended). Ships EMPTY by default, so nothing becomes
 *     mandatory until a clinician populates it.
 *   - Tier 3: per-patient clinician overrides (require / skip / not_applicable).
 *
 * The patient's *indicated concerns* are passed in by the caller and must come
 * from explicit, structured clinician/intake signals — NOT keyword-matching of
 * free text (that would accidentally build a clinical triage engine). Tier 2
 * (an AI layer that *suggests* concerns/assessments) lives elsewhere and only
 * ever feeds suggestions a human confirms; it does not call into policy here.
 *
 * Output is advisory data. Whether a finding blocks anything is the consumer's
 * call (the pre-visit gate defaults missing/stale assessments to advisory —
 * we don't bounce patients off booking over a questionnaire).
 */
import { z } from "zod";

/** A single clinician-defined rule. */
export interface AssessmentRule {
  /** Structured presenting-concern key this rule applies to (clinician-owned). */
  concern: string;
  /** Assessment identifier (e.g. "phq-9", "gad-7", "c-ssrs"). */
  assessmentSlug: string;
  /** Human label for the assessment ("PHQ-9"). */
  assessmentLabel: string;
  /** How recent a submission must be to count as fresh, in days. */
  freshnessDays: number;
  /**
   * Clinician's declared strength. Even "required" is surfaced as advisory by
   * the pre-visit gate today — this records clinical intent, not enforcement.
   */
  requirement: "required" | "recommended";
}

export type AssessmentPolicy = AssessmentRule[];

/** Tier-3 per-patient clinician override, keyed by assessment slug. */
export type AssessmentOverride = "require" | "skip" | "not_applicable";

export interface AssessmentContext {
  /**
   * Concerns explicitly indicated for this patient via structured clinician /
   * intake signals. NOT derived by parsing free text here.
   */
  indicatedConcerns: string[];
  /** Latest submission timestamp per assessment slug (null/absent = never taken). */
  latestByAssessment: Record<string, Date | null>;
  /** Optional Tier-3 clinician overrides per assessment slug. */
  overrides?: Record<string, AssessmentOverride>;
}

export type AssessmentStatus = "missing" | "stale" | "fresh" | "not_applicable";

export interface AssessmentFinding {
  assessmentSlug: string;
  assessmentLabel: string;
  concern: string;
  status: AssessmentStatus;
  /** Effective strength after applying any Tier-3 override. */
  requirement: "required" | "recommended";
  /** Age of the latest submission in whole days, or null if never taken. */
  ageDays: number | null;
  freshnessDays: number;
}

export const AssessmentRuleSchema = z.object({
  concern: z.string().min(1),
  assessmentSlug: z.string().min(1),
  assessmentLabel: z.string().min(1),
  freshnessDays: z.number().int().positive(),
  requirement: z.enum(["required", "recommended"]),
});

export const AssessmentPolicySchema = z.array(AssessmentRuleSchema);

/**
 * The default policy is EMPTY — the engine is inert until a clinician defines
 * rules (Tier 1). Dr. Patel's illustrative table, kept here as documentation
 * only (NOT active policy):
 *
 *   Depression       → PHQ-9   30d   required
 *   Anxiety          → GAD-7   30d   required
 *   Suicidal ideation→ C-SSRS   7d   required
 *   Chronic pain     → Pain    30d   recommended
 *   ADHD             → ASRS    90d   recommended
 */
export const DEFAULT_ASSESSMENT_POLICY: AssessmentPolicy = [];

const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(at: Date | null | undefined, now: Date): number | null {
  if (!(at instanceof Date)) return null;
  // Clamp future-dated submissions (clock skew) to 0 rather than negative.
  return Math.max(0, Math.floor((now.getTime() - at.getTime()) / DAY_MS));
}

/**
 * Evaluate the clinician policy against a patient context. Returns one finding
 * per rule whose concern is indicated for the patient. Pure + deterministic.
 *
 * Tier-3 overrides:
 *   - "not_applicable" / "skip" → status `not_applicable` (clinician has said
 *     this assessment doesn't apply to this patient).
 *   - "require" → bumps the finding's `requirement` to "required".
 */
export function evaluateAssessmentPolicy(
  policy: AssessmentPolicy,
  context: AssessmentContext,
  now: Date = new Date(),
): AssessmentFinding[] {
  const indicated = new Set(context.indicatedConcerns);
  const findings: AssessmentFinding[] = [];

  for (const rule of policy) {
    if (!indicated.has(rule.concern)) continue;

    const override = context.overrides?.[rule.assessmentSlug];
    const latest = context.latestByAssessment[rule.assessmentSlug] ?? null;
    const age = ageInDays(latest, now);

    let status: AssessmentStatus;
    if (override === "skip" || override === "not_applicable") {
      status = "not_applicable";
    } else if (age === null) {
      status = "missing";
    } else if (age > rule.freshnessDays) {
      status = "stale";
    } else {
      status = "fresh";
    }

    findings.push({
      assessmentSlug: rule.assessmentSlug,
      assessmentLabel: rule.assessmentLabel,
      concern: rule.concern,
      status,
      requirement: override === "require" ? "required" : rule.requirement,
      ageDays: age,
      freshnessDays: rule.freshnessDays,
    });
  }

  return findings;
}

/**
 * Convenience: the assessments a patient should be nudged about — anything
 * indicated that is missing or stale and not overridden away. Advisory by
 * design; the caller decides how (or whether) to surface it.
 */
export function outstandingAssessments(
  findings: AssessmentFinding[],
): AssessmentFinding[] {
  return findings.filter((f) => f.status === "missing" || f.status === "stale");
}

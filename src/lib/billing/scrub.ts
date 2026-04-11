/**
 * Claim Scrub Engine — validates claims against payer + coding rules
 * BEFORE submission. Per the PRD section 12.3:
 *
 *   "A biller must be able to see exactly why a claim is being held.
 *    No cryptic nonsense. Plain language plus structured error detail."
 *
 * Each rule produces a ScrubIssue with severity, plain-language message,
 * and a suggested fix. This runs server-side and is deterministic — no
 * LLM, no network. The Claim Scrub Agent (future) wraps this engine and
 * adds confidence scoring + auto-fix for low-risk issues.
 */

export type ScrubSeverity = "error" | "warning" | "info";

export interface ScrubIssue {
  /** Stable rule code for filtering / metrics */
  ruleCode: string;
  severity: ScrubSeverity;
  /** Plain language — readable by a biller, not a computer */
  message: string;
  /** What to do about it */
  suggestion: string;
  /** Optional CPT or ICD-10 the issue relates to */
  relatedCode?: string;
  /** Whether the issue blocks submission */
  blocksSubmission: boolean;
}

export interface ScrubInput {
  cptCodes: Array<{ code: string; label: string; units?: number; chargeAmount?: number }>;
  icd10Codes: Array<{ code: string; label?: string }>;
  payerName: string | null;
  serviceDate: Date;
  providerId: string | null;
  modifierCodes?: string[];
  patientCoverage?: {
    eligibilityStatus: string;
    payerName: string;
  } | null;
  authRequired?: boolean;
  authNumber?: string | null;
}

// ---------------------------------------------------------------------------
// Cannabis-friendly E&M codes for sanity checks
// ---------------------------------------------------------------------------

const VALID_EM_CODES = new Set([
  "99202", "99203", "99204", "99205", // new patient
  "99211", "99212", "99213", "99214", "99215", // established patient
  "99421", "99422", "99423", // online digital E&M
  "99441", "99442", "99443", // telephone visits
]);

const HIGH_LEVEL_EM = new Set(["99205", "99215"]);

const COUNSELING_CODES = new Set(["99401", "99402", "99403", "99404", "99406", "99407", "99411", "99412"]);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function scrubClaim(input: ScrubInput): ScrubIssue[] {
  const issues: ScrubIssue[] = [];

  // ── Rule: must have at least one CPT ──────────────────────────
  if (!input.cptCodes || input.cptCodes.length === 0) {
    issues.push({
      ruleCode: "MISSING_CPT",
      severity: "error",
      message: "This claim has no CPT or service code attached.",
      suggestion:
        "Add at least one billable service code from the encounter. Most cannabis follow-ups use 99213 or 99214.",
      blocksSubmission: true,
    });
  }

  // ── Rule: must have at least one ICD-10 ───────────────────────
  if (!input.icd10Codes || input.icd10Codes.length === 0) {
    issues.push({
      ruleCode: "MISSING_DIAGNOSIS",
      severity: "error",
      message:
        "No diagnosis code is linked to this visit. Payers require at least one ICD-10 to justify medical necessity.",
      suggestion:
        "Link a diagnosis from the visit note. Common cannabis-care codes: G89.29 (chronic pain), F41.1 (anxiety), G47.00 (insomnia), F32.9 (depression).",
      blocksSubmission: true,
    });
  }

  // ── Rule: payer required ──────────────────────────────────────
  if (!input.payerName) {
    issues.push({
      ruleCode: "MISSING_PAYER",
      severity: "error",
      message: "No payer assigned to this claim.",
      suggestion:
        "Either assign the patient's primary insurance or convert this to a self-pay claim.",
      blocksSubmission: true,
    });
  }

  // ── Rule: provider required ───────────────────────────────────
  if (!input.providerId) {
    issues.push({
      ruleCode: "MISSING_PROVIDER",
      severity: "error",
      message: "No rendering provider on this claim.",
      suggestion:
        "Set the rendering provider — usually the clinician who signed the encounter note.",
      blocksSubmission: true,
    });
  }

  // ── Rule: eligibility recently checked ────────────────────────
  if (
    input.patientCoverage &&
    input.patientCoverage.eligibilityStatus !== "active"
  ) {
    issues.push({
      ruleCode: "ELIGIBILITY_NOT_ACTIVE",
      severity: "error",
      message: `Patient's primary insurance (${input.patientCoverage.payerName}) is not currently active.`,
      suggestion:
        "Re-verify eligibility before submitting. If coverage termed, transfer balance to patient responsibility.",
      blocksSubmission: true,
    });
  }

  // ── Rule: auth required but missing ──────────────────────────
  if (input.authRequired && !input.authNumber) {
    issues.push({
      ruleCode: "MISSING_PRIOR_AUTH",
      severity: "error",
      message:
        "This service requires prior authorization and no auth number is on file.",
      suggestion:
        "Contact the payer to obtain prior auth before submitting, or attach an existing auth number to this claim.",
      blocksSubmission: true,
    });
  }

  // ── Rule: high-level E&M needs documentation ─────────────────
  for (const cpt of input.cptCodes ?? []) {
    if (HIGH_LEVEL_EM.has(cpt.code)) {
      issues.push({
        ruleCode: "HIGH_LEVEL_EM_REVIEW",
        severity: "warning",
        message: `${cpt.code} is a high-level E&M code that requires substantial documentation.`,
        suggestion:
          "Confirm the visit note supports this level — typically 40-60 min total time or comprehensive history + exam + high-complexity decision making.",
        relatedCode: cpt.code,
        blocksSubmission: false,
      });
    }
  }

  // ── Rule: invalid E&M code ───────────────────────────────────
  for (const cpt of input.cptCodes ?? []) {
    // Only flag E&M-shaped codes (99xxx) that aren't on our valid list
    if (
      /^99\d{3}$/.test(cpt.code) &&
      !VALID_EM_CODES.has(cpt.code) &&
      !COUNSELING_CODES.has(cpt.code)
    ) {
      issues.push({
        ruleCode: "UNRECOGNIZED_EM_CODE",
        severity: "warning",
        message: `${cpt.code} doesn't match a standard outpatient E&M code.`,
        suggestion:
          "Double-check the code. If this is a valid less-common code, ignore this warning.",
        relatedCode: cpt.code,
        blocksSubmission: false,
      });
    }
  }

  // ── Rule: charge amount missing ──────────────────────────────
  for (const cpt of input.cptCodes ?? []) {
    if (cpt.chargeAmount == null || cpt.chargeAmount === 0) {
      issues.push({
        ruleCode: "MISSING_CHARGE_AMOUNT",
        severity: "warning",
        message: `${cpt.code} has no charge amount set.`,
        suggestion:
          "The fee schedule should populate this automatically. Check that the CPT exists in the practice fee schedule.",
        relatedCode: cpt.code,
        blocksSubmission: false,
      });
    }
  }

  // ── Rule: timely filing window ───────────────────────────────
  const ageDays = Math.floor(
    (Date.now() - input.serviceDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (ageDays > 90) {
    issues.push({
      ruleCode: "STALE_SERVICE_DATE",
      severity: ageDays > 180 ? "error" : "warning",
      message: `Service date is ${ageDays} days old. Many payers have 90-day timely filing windows.`,
      suggestion:
        ageDays > 180
          ? "This claim is likely past timely filing for most payers. Consider write-off or appeal with documentation."
          : "Submit ASAP. If this is approaching the payer's timely filing limit, attach proof of timely intent.",
      blocksSubmission: false,
    });
  }

  // ── Rule: cannabis-counseling-only without primary dx ────────
  const hasCounselingOnly = input.cptCodes?.every((c) =>
    c.code === "Z71.89" || COUNSELING_CODES.has(c.code),
  );
  const hasMedicalDx = input.icd10Codes?.some(
    (c) => !c.code.startsWith("Z71") && !c.code.startsWith("F12"),
  );
  if (hasCounselingOnly && !hasMedicalDx && (input.icd10Codes?.length ?? 0) > 0) {
    issues.push({
      ruleCode: "COUNSELING_NO_MEDICAL_DX",
      severity: "info",
      message:
        "Cannabis counseling claims typically need a medical diagnosis (e.g. chronic pain, anxiety) in addition to Z71.89.",
      suggestion:
        "Add the underlying condition being treated to support medical necessity.",
      blocksSubmission: false,
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isClaimSubmittable(issues: ScrubIssue[]): boolean {
  return !issues.some((i) => i.blocksSubmission);
}

export function countBySeverity(issues: ScrubIssue[]): Record<ScrubSeverity, number> {
  return issues.reduce(
    (acc, i) => {
      acc[i.severity]++;
      return acc;
    },
    { error: 0, warning: 0, info: 0 } as Record<ScrubSeverity, number>,
  );
}

/**
 * EMR-088 — Cannabis contraindication override workflow.
 *
 * Wraps the static `CANNABIS_CONTRAINDICATIONS` table from
 * `domain/contraindications` with the prescribing-time logic the
 * `<ContraindicationWarning />` modal uses:
 *
 *   1. Build a single check from a partial patient record (the chart
 *      edge passes whatever it has — DOB, ICD-10s, free-text history).
 *   2. Tier the result into "block / warn / inform" so the UI can pick
 *      the right modal treatment.
 *   3. Validate the override the clinician submits before it's persisted
 *      onto the regimen.
 *   4. Produce a structured `audit` payload the caller writes to
 *      `AuditLog.action = "rx.contraindication.override"`.
 *
 * The intent is that ANY prescribing surface (e-Rx, dosing regimen
 * builder, dispensary order entry, refill copilot) imports
 * `runContraindicationCheck()` and gets the same answer — there is no
 * second opinion on what counts as an absolute contraindication.
 */

import {
  CANNABIS_CONTRAINDICATIONS,
  checkContraindications,
  highestSeverity,
  requiresOverride,
  type CannabisContraindication,
  type ContraindicationMatch,
  type ContraindicationSeverity,
  type PatientForContraindicationCheck,
} from "@/lib/domain/contraindications";

export type ContraindicationGate = "block" | "warn" | "inform" | "clear";

export interface ContraindicationCheckResult {
  /** UI tier — drives modal styling + whether submit is gated. */
  gate: ContraindicationGate;
  /** All matched contraindications, severity-ordered. */
  matches: ContraindicationMatch[];
  /** True iff at least one match has `requiresOverride`. */
  overrideRequired: boolean;
  /** Highest severity present in the matches (null when clear). */
  topSeverity: ContraindicationSeverity | null;
  /** Short, clinician-facing one-liner — used as the modal headline. */
  headline: string;
  /** Plain-language summary the clinician can read aloud to the patient. */
  patientFacingSummary: string;
}

const GATE_BY_SEVERITY: Record<ContraindicationSeverity, ContraindicationGate> = {
  absolute: "block",
  relative: "warn",
  caution: "inform",
};

const SEVERITY_RANK: Record<ContraindicationSeverity, number> = {
  absolute: 3,
  relative: 2,
  caution: 1,
};

function sortBySeverity(
  matches: ContraindicationMatch[],
): ContraindicationMatch[] {
  return [...matches].sort(
    (a, b) =>
      SEVERITY_RANK[b.contraindication.severity] -
      SEVERITY_RANK[a.contraindication.severity],
  );
}

function buildHeadline(
  top: CannabisContraindication | null,
  count: number,
): string {
  if (!top) return "No contraindications found";
  const suffix = count > 1 ? ` (+${count - 1} more)` : "";
  if (top.severity === "absolute") {
    return `Absolute contraindication: ${top.label}${suffix}`;
  }
  if (top.severity === "relative") {
    return `Relative contraindication: ${top.label}${suffix}`;
  }
  return `Use with caution: ${top.label}${suffix}`;
}

function buildPatientSummary(matches: ContraindicationMatch[]): string {
  if (matches.length === 0) {
    return "No contraindications surfaced for this patient.";
  }
  const lead = matches[0].contraindication.patientWarning;
  if (matches.length === 1) return lead;
  return `${lead} (${matches.length - 1} additional concern${matches.length - 1 === 1 ? "" : "s"} also flagged.)`;
}

export function runContraindicationCheck(
  patient: PatientForContraindicationCheck,
): ContraindicationCheckResult {
  const raw = checkContraindications(patient);
  const matches = sortBySeverity(raw);
  const top = matches[0]?.contraindication ?? null;
  const sev = highestSeverity(matches);
  const gate: ContraindicationGate = sev ? GATE_BY_SEVERITY[sev] : "clear";

  return {
    gate,
    matches,
    overrideRequired: requiresOverride(matches),
    topSeverity: sev,
    headline: buildHeadline(top, matches.length),
    patientFacingSummary: buildPatientSummary(matches),
  };
}

// ---------------------------------------------------------------------------
// Override validation
// ---------------------------------------------------------------------------

export interface OverrideAttempt {
  /** Free-text reasoning the clinician typed into the modal. */
  reason: string;
  /** Clinician's typed full name — confirms identity at the modal. */
  clinicianAttestation: string;
  /** True iff the "I have discussed risks with the patient" box is checked. */
  patientCounseledAcknowledged: boolean;
  /** True iff the "I have considered alternatives" box is checked. */
  alternativesConsideredAcknowledged: boolean;
}

export interface OverrideValidationResult {
  ok: boolean;
  errors: string[];
}

const MIN_REASON_LENGTH = 30;

export function validateOverride(
  attempt: OverrideAttempt,
  check: ContraindicationCheckResult,
): OverrideValidationResult {
  const errors: string[] = [];

  if (check.gate === "clear") {
    return { ok: true, errors: [] };
  }

  if (!attempt.reason || attempt.reason.trim().length < MIN_REASON_LENGTH) {
    errors.push(
      `Override reasoning must be at least ${MIN_REASON_LENGTH} characters. ` +
        `Document the specific clinical rationale.`,
    );
  }

  if (!attempt.clinicianAttestation?.trim()) {
    errors.push("Clinician attestation (typed full name) is required.");
  }

  if (!attempt.patientCounseledAcknowledged) {
    errors.push("Confirm risks were discussed with the patient.");
  }

  if (!attempt.alternativesConsideredAcknowledged) {
    errors.push("Confirm alternative therapies were considered.");
  }

  // Absolute contraindications also require an explicit reference to the
  // matched flag in the reasoning text — prevents copy-paste overrides.
  if (check.topSeverity === "absolute") {
    const reasonLower = attempt.reason.toLowerCase();
    const referencesFlag = check.matches.some((m) =>
      m.contraindication.matchKeywords.some((kw) =>
        reasonLower.includes(kw.toLowerCase()),
      ),
    );
    if (!referencesFlag) {
      errors.push(
        "For an absolute contraindication, the override reasoning must " +
          "reference the specific flagged condition by name.",
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Audit payload
// ---------------------------------------------------------------------------

export interface ContraindicationOverrideAudit {
  action: "rx.contraindication.override";
  /** ISO timestamp the override was committed. */
  at: string;
  /** Severity tier of the gate that was overridden. */
  severity: ContraindicationSeverity;
  /** IDs of every contraindication the clinician overrode in one shot. */
  contraindicationIds: string[];
  /** Why each one matched (e.g., "ICD-10 F20.9"). */
  matchedOn: string[];
  /** Clinician-typed reasoning. */
  reason: string;
  /** Typed clinician full name (e-signature). */
  clinicianAttestation: string;
  /** Acknowledgement checkboxes the clinician checked. */
  acknowledgements: {
    patientCounseled: boolean;
    alternativesConsidered: boolean;
  };
}

export function buildOverrideAudit(
  attempt: OverrideAttempt,
  check: ContraindicationCheckResult,
): ContraindicationOverrideAudit {
  if (!check.topSeverity) {
    throw new Error("buildOverrideAudit called on a clear check");
  }
  return {
    action: "rx.contraindication.override",
    at: new Date().toISOString(),
    severity: check.topSeverity,
    contraindicationIds: check.matches.map((m) => m.contraindication.id),
    matchedOn: check.matches.map((m) => m.matchedOn),
    reason: attempt.reason.trim(),
    clinicianAttestation: attempt.clinicianAttestation.trim(),
    acknowledgements: {
      patientCounseled: attempt.patientCounseledAcknowledged,
      alternativesConsidered: attempt.alternativesConsideredAcknowledged,
    },
  };
}

// ---------------------------------------------------------------------------
// Re-exports for surfaces that only want this one entry point.
// ---------------------------------------------------------------------------

export {
  CANNABIS_CONTRAINDICATIONS,
  type CannabisContraindication,
  type ContraindicationMatch,
  type ContraindicationSeverity,
  type PatientForContraindicationCheck,
};

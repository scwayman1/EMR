/**
 * Medical vs. recreational cannabis classification — EMR-346 (Dr. Patel).
 *
 * Definition (per Dr. Patel):
 *   Medical cannabis use is when a clinician determines that cannabis is
 *   being used for a medical symptom, ailment, or disease. Anything else
 *   counts as recreational. The distinction shapes downstream behavior:
 *   billing eligibility, research cohort tagging, Leafmart product context,
 *   and the language we use in patient-facing surfaces.
 *
 * The data model isn't migrating in this PR; this domain helper lets the
 * rest of the app reason about the classification today, and a future
 * Prisma migration can persist the same values.
 */

export type CannabisUseType = "medical" | "recreational" | "unspecified";

export interface CannabisUseClassificationInput {
  /** True iff a clinician has authorized cannabis use for this patient. */
  clinicianAuthorized: boolean;
  /** ICD-10 codes / presenting concerns that justify medical use. */
  medicalConditions?: string[];
  /** Patient-reported reason for use (e.g., "anxiety", "fun"). */
  patientReportedReason?: string | null;
}

const RECREATIONAL_REASON_SIGNALS = [
  "fun",
  "social",
  "party",
  "celebration",
  "leisure",
  "recreation",
  "recreational",
];

const MEDICAL_REASON_SIGNALS = [
  "pain",
  "sleep",
  "anxiety",
  "nausea",
  "appetite",
  "spasm",
  "seizure",
  "ptsd",
  "cancer",
  "chemo",
  "depression",
  "migraine",
];

/**
 * Classify a single patient's cannabis use as medical, recreational, or
 * unspecified. The rules:
 *
 *   1. If a clinician has authorized cannabis for any documented medical
 *      condition → medical.
 *   2. If the patient reports a clearly medical symptom but no clinician
 *      authorization → medical (clinician-determined-needed flag should
 *      fire elsewhere; we still classify for cohort tagging).
 *   3. If the patient reports a recreational reason → recreational.
 *   4. Otherwise → unspecified.
 */
export function classifyCannabisUse(
  input: CannabisUseClassificationInput,
): CannabisUseType {
  const conditions = input.medicalConditions ?? [];
  if (input.clinicianAuthorized && conditions.length > 0) return "medical";

  const reason = (input.patientReportedReason ?? "").toLowerCase();
  if (reason && MEDICAL_REASON_SIGNALS.some((s) => reason.includes(s))) {
    return "medical";
  }
  if (reason && RECREATIONAL_REASON_SIGNALS.some((s) => reason.includes(s))) {
    return "recreational";
  }
  if (input.clinicianAuthorized) return "medical";
  return "unspecified";
}

export const USE_TYPE_LABEL: Record<CannabisUseType, string> = {
  medical: "Medical",
  recreational: "Recreational",
  unspecified: "Unspecified",
};

export const USE_TYPE_DESCRIPTION: Record<CannabisUseType, string> = {
  medical:
    "Clinician has determined cannabis is being used to address a medical symptom, ailment, or disease.",
  recreational:
    "Patient-reported use for non-medical reasons. Eligibility for medical-only programs may be limited.",
  unspecified:
    "Use type not yet classified. Ask the patient or have a clinician document the indication.",
};

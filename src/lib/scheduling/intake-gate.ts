/**
 * EMR-212 — Intake-to-visit gate.
 *
 * Pure logic that decides whether an appointment is allowed to move from
 * `requested` to `confirmed`. We refuse to confirm a visit until the
 * patient has completed the intake artifacts the clinician needs to run
 * a productive encounter:
 *
 *   - Demographics + DOB
 *   - Allergies + contraindications screen
 *   - Cannabis history + presenting concerns
 *   - Signed consent for the visit type
 *   - Insurance pre-screen (or self-pay attestation)
 *   - For follow-ups in titration phase: at least one outcome log since
 *     the prior visit
 *
 * The gate is deliberately liberal about *what* it accepts (free text,
 * partial answers, "prefer not to say") and strict only about presence —
 * we want patients to get to a visit, not to bounce off a form.
 */
import { z } from "zod";

export type GateRequirementId =
  | "demographics"
  | "consent"
  | "allergy_screen"
  | "cannabis_history"
  | "presenting_concerns"
  | "insurance_or_attestation"
  | "outcome_log_since_last_visit"
  | "id_age_verification";

export interface GateRequirement {
  id: GateRequirementId;
  label: string;
  /** True if the patient/clinician has satisfied this. */
  satisfied: boolean;
  /** Optional URL the patient is bounced to to satisfy this. */
  resolveHref?: string;
  /** Whether this blocks confirmation, or is just an advisory checklist item. */
  blocking: boolean;
}

export interface IntakeGateInput {
  visitType: "new_patient" | "follow_up" | "renewal" | "group" | "urgent";
  treatmentPhase: "intake" | "titration" | "stabilization" | "maintenance" | "tapering" | "relapse_watch" | null;
  patient: {
    dateOfBirth: Date | null;
    addressLine1: string | null;
    state: string | null;
    allergiesScreenedAt: Date | null;
    cannabisHistory: unknown;
    presentingConcerns: string | null;
    intakeAnswers: unknown;
    ageVerifiedAt: Date | null;
  };
  consent: {
    visitConsentSignedAt: Date | null;
    telehealthConsentSignedAt: Date | null;
  };
  insurance: {
    coverageVerified: boolean;
    selfPayAttested: boolean;
  };
  /** For follow-ups in titration: did the patient log outcomes since the last visit? */
  outcomeLogsSinceLastVisit: number;
  isVirtual: boolean;
}

export interface IntakeGateResult {
  allowConfirm: boolean;
  /** Display this to the patient as a "what's next" checklist. */
  requirements: GateRequirement[];
  /** Short, single-line reason. Surfaced when confirm is refused. */
  blockReason: string | null;
  /**
   * Completion (0..1) — drives the progress bar in the booking UI so the
   * patient can see how close they are to confirming.
   */
  completionPct: number;
}

export const IntakeGateInputSchema = z.object({
  visitType: z.enum(["new_patient", "follow_up", "renewal", "group", "urgent"]),
  treatmentPhase: z
    .enum(["intake", "titration", "stabilization", "maintenance", "tapering", "relapse_watch"])
    .nullable(),
  patient: z.object({
    dateOfBirth: z.date().nullable(),
    addressLine1: z.string().nullable(),
    state: z.string().nullable(),
    allergiesScreenedAt: z.date().nullable(),
    cannabisHistory: z.unknown(),
    presentingConcerns: z.string().nullable(),
    intakeAnswers: z.unknown(),
    ageVerifiedAt: z.date().nullable(),
  }),
  consent: z.object({
    visitConsentSignedAt: z.date().nullable(),
    telehealthConsentSignedAt: z.date().nullable(),
  }),
  insurance: z.object({
    coverageVerified: z.boolean(),
    selfPayAttested: z.boolean(),
  }),
  outcomeLogsSinceLastVisit: z.number().int().min(0),
  isVirtual: z.boolean(),
});

/**
 * Compute the gate. Reuse this anywhere a confirmation is about to be
 * issued — booking page (EMR-206), waitlist fill (EMR-210), and the slot
 * recommender's confirm path.
 */
export function evaluateIntakeGate(input: IntakeGateInput): IntakeGateResult {
  const reqs: GateRequirement[] = [];

  reqs.push({
    id: "demographics",
    label: "Date of birth, address, and state on file",
    satisfied:
      input.patient.dateOfBirth instanceof Date &&
      !!input.patient.addressLine1 &&
      !!input.patient.state,
    blocking: true,
    resolveHref: "/patient/profile",
  });

  reqs.push({
    id: "id_age_verification",
    label: "Photo ID + age verified (21+)",
    satisfied: input.patient.ageVerifiedAt instanceof Date,
    blocking: input.visitType === "new_patient" || input.visitType === "renewal",
    resolveHref: "/patient/verify",
  });

  reqs.push({
    id: "allergy_screen",
    label: "Allergies + contraindications reviewed",
    satisfied: input.patient.allergiesScreenedAt instanceof Date,
    blocking: input.visitType !== "urgent",
    resolveHref: "/patient/intake/allergies",
  });

  reqs.push({
    id: "cannabis_history",
    label: "Cannabis history",
    satisfied: hasMeaningfulRecord(input.patient.cannabisHistory),
    blocking: input.visitType === "new_patient" || input.visitType === "renewal",
    resolveHref: "/patient/intake/history",
  });

  reqs.push({
    id: "presenting_concerns",
    label: "Reason for this visit",
    satisfied:
      typeof input.patient.presentingConcerns === "string" &&
      input.patient.presentingConcerns.trim().length >= 10,
    blocking: true,
    resolveHref: "/patient/intake/concerns",
  });

  // Visit consent always required; telehealth consent only for virtual visits.
  const consentOk =
    input.consent.visitConsentSignedAt instanceof Date &&
    (!input.isVirtual || input.consent.telehealthConsentSignedAt instanceof Date);
  reqs.push({
    id: "consent",
    label: input.isVirtual ? "Visit + telehealth consent" : "Visit consent",
    satisfied: consentOk,
    blocking: true,
    resolveHref: "/patient/consents",
  });

  reqs.push({
    id: "insurance_or_attestation",
    label: "Insurance verified or self-pay confirmed",
    satisfied: input.insurance.coverageVerified || input.insurance.selfPayAttested,
    blocking: true,
    resolveHref: "/patient/insurance",
  });

  // Follow-ups in active titration need data — without an outcome log we
  // can't titrate, and the visit is just a check-in we could do async.
  if (
    (input.visitType === "follow_up" || input.visitType === "renewal") &&
    (input.treatmentPhase === "titration" || input.treatmentPhase === "tapering")
  ) {
    reqs.push({
      id: "outcome_log_since_last_visit",
      label: "At least one outcome log since your last visit",
      satisfied: input.outcomeLogsSinceLastVisit >= 1,
      blocking: false, // soft block — recommend, don't refuse
      resolveHref: "/patient/track",
    });
  }

  const blocking = reqs.filter((r) => r.blocking);
  const blockingUnsatisfied = blocking.filter((r) => !r.satisfied);
  const allowConfirm = blockingUnsatisfied.length === 0;

  const completionPct =
    reqs.length === 0 ? 1 : reqs.filter((r) => r.satisfied).length / reqs.length;

  const blockReason = allowConfirm
    ? null
    : `Complete ${blockingUnsatisfied.length} step${blockingUnsatisfied.length === 1 ? "" : "s"} before confirming: ${blockingUnsatisfied.map((r) => r.label).join(", ")}.`;

  return { allowConfirm, requirements: reqs, blockReason, completionPct };
}

function hasMeaningfulRecord(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return false;
}

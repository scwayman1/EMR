/**
 * Prior-auth workflow — EMR-229
 * -----------------------------
 * Cannabis services require PA on most commercial payers. The
 * `requiresPriorAuthForCannabis` flag exists in the payer-rules
 * registry but no PA workflow yet.
 *
 * This module is the pure layer:
 *   - `assemblePriorAuthPacket` — gathers the patient + clinical data
 *     into the structured packet payers consume (DSM-5 severity,
 *     treatment plan, prior failures, supporting docs)
 *   - `validateForSubmission` — prevents draft PAs missing required
 *     fields from being marked submitted
 *   - `expirationStatus` — drives the 14d / 7d / 1d alerts
 *   - `requiresPriorAuth` — single source of truth across claim
 *     construction, scheduling, and the PA queue
 *
 *  The portal adapters (Availity-PA, CareCentrix, etc.) live in the
 *  agent / integration layer; this file describes the contract.
 */

import type { PriorAuthStatus } from "@prisma/client";
import { resolvePayerRule } from "@/lib/billing/payer-rules";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PriorAuthPacketInput {
  patient: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    presentingConcerns: string | null;
    treatmentGoals: string | null;
    contraindications: string[];
  };
  payerName: string;
  payerId: string | null;
  cptCodes: string[];
  icd10Codes: string[];
  unitsRequested: number;
  /** Severity scores from validated screeners (PHQ-9, GAD-7, ESAS, etc.). */
  severityScores: Array<{ instrument: string; score: number; cutoff: string | null }>;
  /** Prior treatments tried — required by most payers for medical-necessity attestation. */
  priorTreatments: Array<{ name: string; durationMonths: number; outcome: string }>;
  /** Provider attestation block. */
  providerAttestation: { providerName: string; npi: string | null; signedAt: Date };
  /** Document refs (lab results, prior notes) to attach. */
  supportingDocIds: string[];
  /** Notes for the reviewer — free text, last resort. */
  notes?: string;
}

export interface PriorAuthPacket {
  schemaVersion: "2026-04";
  patient: {
    name: string;
    dateOfBirth: string; // YYYY-MM-DD
  };
  payer: { name: string; id: string | null };
  request: {
    cptCodes: string[];
    icd10Codes: string[];
    unitsRequested: number;
  };
  clinical: {
    presentingConcerns: string;
    treatmentGoals: string;
    contraindications: string[];
    severityScores: PriorAuthPacketInput["severityScores"];
    priorTreatments: PriorAuthPacketInput["priorTreatments"];
  };
  attestation: {
    providerName: string;
    providerNpi: string | null;
    signedAt: string; // ISO
  };
  supportingDocIds: string[];
  notes: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// PA requirement
// ---------------------------------------------------------------------------

/** Single source of truth for "does this claim need a PA?". Reads
 *  payer-rules first; falls back to false when payer is unknown
 *  (we can't block billing on absent data). */
export function requiresPriorAuth(args: {
  payerId: string | null;
  payerName: string | null;
  cptCodes: string[];
}): boolean {
  if (!args.payerName && !args.payerId) return false;
  // Cannabis-billed CPT range — claim construction is the canonical
  // place this list lives; we mirror the trigger here so the PA queue
  // can pre-empt by patient + payer + likely CPT.
  const cannabisCpts = new Set(["99214", "99215", "99204", "99205", "Z71.41", "F12.10", "F12.11", "F12.20"]);
  const involvesCannabis = args.cptCodes.some((c) => cannabisCpts.has(c) || c.startsWith("F12") || c.startsWith("Z71"));
  if (!involvesCannabis) return false;
  const rule = resolvePayerRule({ payerId: args.payerId ?? undefined, payerName: args.payerName ?? undefined });
  return rule.requiresPriorAuthForCannabis === true;
}

// ---------------------------------------------------------------------------
// Packet assembly
// ---------------------------------------------------------------------------

export function assemblePriorAuthPacket(input: PriorAuthPacketInput): PriorAuthPacket {
  return {
    schemaVersion: "2026-04",
    patient: {
      name: `${input.patient.firstName} ${input.patient.lastName}`,
      dateOfBirth: toIsoDate(input.patient.dateOfBirth),
    },
    payer: {
      name: input.payerName,
      id: input.payerId,
    },
    request: {
      cptCodes: dedupe(input.cptCodes),
      icd10Codes: dedupe(input.icd10Codes),
      unitsRequested: input.unitsRequested,
    },
    clinical: {
      presentingConcerns: input.patient.presentingConcerns ?? "",
      treatmentGoals: input.patient.treatmentGoals ?? "",
      contraindications: dedupe(input.patient.contraindications),
      severityScores: input.severityScores,
      priorTreatments: input.priorTreatments,
    },
    attestation: {
      providerName: input.providerAttestation.providerName,
      providerNpi: input.providerAttestation.npi,
      signedAt: input.providerAttestation.signedAt.toISOString(),
    },
    supportingDocIds: input.supportingDocIds,
    notes: input.notes ?? "",
  };
}

/** Block submitting a PA that's missing parts payers will reject for. */
export function validateForSubmission(packet: PriorAuthPacket): ValidationResult {
  const errors: string[] = [];
  if (!packet.patient.name.trim()) errors.push("patient.name is required");
  if (!packet.patient.dateOfBirth) errors.push("patient.dateOfBirth is required");
  if (!packet.payer.name.trim()) errors.push("payer.name is required");
  if (packet.request.cptCodes.length === 0) errors.push("at least one CPT code required");
  if (packet.request.icd10Codes.length === 0) errors.push("at least one ICD-10 code required");
  if (!packet.clinical.presentingConcerns.trim()) errors.push("clinical.presentingConcerns is required");
  if (packet.clinical.severityScores.length === 0) {
    errors.push("at least one severity score required (PHQ-9 / GAD-7 / ESAS)");
  }
  if (packet.clinical.priorTreatments.length === 0) {
    errors.push("at least one prior treatment required for medical-necessity attestation");
  }
  if (!packet.attestation.providerName.trim()) errors.push("attestation.providerName is required");
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Expiration alerts
// ---------------------------------------------------------------------------

export type ExpirationAlert = "ok" | "expires_in_14d" | "expires_in_7d" | "expires_in_1d" | "expired";

export function expirationStatus(expiresAt: Date | null, now: Date = new Date()): ExpirationAlert {
  if (!expiresAt) return "ok";
  const days = Math.floor((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "expired";
  if (days <= 1) return "expires_in_1d";
  if (days <= 7) return "expires_in_7d";
  if (days <= 14) return "expires_in_14d";
  return "ok";
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<PriorAuthStatus, PriorAuthStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["approved", "denied", "withdrawn"],
  approved: ["expired", "withdrawn"],
  denied: ["submitted"], // resubmit after correction
  expired: [],
  withdrawn: [],
};

export function canTransition(from: PriorAuthStatus, to: PriorAuthStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

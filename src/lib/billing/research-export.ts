/**
 * Researcher Portal — De-identified Billing Export (EMR-123)
 * ----------------------------------------------------------
 * The researcher role gets de-identified access to clinical + billing
 * data per the EMR-123 spec. This module covers the billing slice:
 * de-identifying claim + payment records so the population analytics
 * dashboard can show cohort-level reimbursement patterns without
 * exposing PHI.
 *
 * De-identification rules follow HIPAA Safe Harbor:
 *   - Drop direct identifiers (name, address, phone, email, MRN,
 *     account/medical record numbers, full DOB).
 *   - Keep age in years (cap at 89; rollup to "90+").
 *   - Keep race / sex / smoking history (per spec — researcher needs
 *     these for cohort definitions).
 *   - Replace patient/encounter/claim ids with stable per-cohort
 *     pseudonyms via HMAC-SHA256.
 *   - Generalize geographic data to the first 3 ZIP digits, dropping
 *     ZIPs in regions with fewer than 20,000 residents.
 *
 * The pseudonym salt MUST be cohort-scoped: two researchers running
 * the same query on the same source data get DIFFERENT id mappings.
 * That prevents cross-researcher collusion to re-identify a subject.
 */

import { createHmac } from "node:crypto";

export type ResearchScope = "billing-only" | "billing-and-outcomes" | "full-clinical";

export interface RawPatientFacts {
  patientId: string;
  /** Date of birth — used to derive age, then dropped. */
  dateOfBirth: Date;
  sex: "male" | "female" | "other" | "unknown";
  race: string | null;
  ethnicity: string | null;
  smokingStatus: string | null;
  substanceHistory: string | null;
  zipCode: string;
  socioeconomicTier: string | null;
}

export interface RawClaimFacts {
  claimId: string;
  patientId: string;
  encounterId: string;
  serviceDate: Date;
  payerName: string | null;
  cptCodes: string[];
  icd10Codes: string[];
  billedCents: number;
  paidCents: number;
  patientRespCents: number;
  status: string;
  denialCategory: string | null;
}

export interface DeIdentifiedPatient {
  pseudonym: string;
  ageYears: number | "90+";
  sex: RawPatientFacts["sex"];
  race: string | null;
  ethnicity: string | null;
  smokingStatus: string | null;
  substanceHistory: string | null;
  zipPrefix: string | null;
  socioeconomicTier: string | null;
}

export interface DeIdentifiedClaim {
  claimPseudonym: string;
  patientPseudonym: string;
  encounterPseudonym: string;
  serviceMonth: string;
  payerCategory: PayerCategory;
  cptCodes: string[];
  icd10Codes: string[];
  billedCents: number;
  paidCents: number;
  patientRespCents: number;
  status: string;
  denialCategory: string | null;
}

export type PayerCategory =
  | "medicare"
  | "medicaid"
  | "commercial"
  | "self_pay"
  | "workers_comp"
  | "other";

// HIPAA Safe Harbor restricted ZIP3 prefixes (population < 20,000).
const SAFE_HARBOR_RESTRICTED_ZIP3 = new Set([
  "036", "059", "063", "102", "203", "556", "692", "790",
  "821", "823", "830", "831", "878", "879", "884", "890", "893",
]);

function generalizeZip(zip: string): string | null {
  if (!zip) return null;
  const prefix = zip.slice(0, 3);
  if (!/^\d{3}$/.test(prefix)) return null;
  return SAFE_HARBOR_RESTRICTED_ZIP3.has(prefix) ? "000" : prefix;
}

function ageFromDob(dob: Date, asOf: Date): number | "90+" {
  const years = Math.floor((asOf.getTime() - dob.getTime()) / (365.25 * 86_400_000));
  if (years >= 90) return "90+";
  return Math.max(0, years);
}

/**
 * Cohort-scoped pseudonymizer. Constructed with a secret salt that
 * must be unique per (cohort, exporter) pair. The salt is generated
 * by the caller and stored alongside the cohort manifest — never
 * logged.
 */
export class CohortPseudonymizer {
  constructor(private readonly salt: string) {
    if (!salt || salt.length < 16) {
      throw new Error("cohort_salt_too_short");
    }
  }
  pseudonymize(prefix: string, value: string): string {
    const hmac = createHmac("sha256", this.salt);
    hmac.update(`${prefix}:${value}`);
    return `${prefix}_${hmac.digest("hex").slice(0, 16)}`;
  }
}

/** Bucket a free-form payer name into a HIPAA-safe category. */
export function categorizePayer(payerName: string | null): PayerCategory {
  if (!payerName) return "self_pay";
  const lower = payerName.toLowerCase();
  if (lower.includes("medicare")) return "medicare";
  if (lower.includes("medicaid")) return "medicaid";
  if (lower.includes("workers") || lower.includes("workers'") || lower.includes("comp"))
    return "workers_comp";
  if (lower.includes("self") || lower.includes("cash") || lower.includes("private pay"))
    return "self_pay";
  return "commercial";
}

export function deIdentifyPatient(
  raw: RawPatientFacts,
  pseudonymizer: CohortPseudonymizer,
  asOf: Date = new Date(),
): DeIdentifiedPatient {
  return {
    pseudonym: pseudonymizer.pseudonymize("pt", raw.patientId),
    ageYears: ageFromDob(raw.dateOfBirth, asOf),
    sex: raw.sex,
    race: raw.race,
    ethnicity: raw.ethnicity,
    smokingStatus: raw.smokingStatus,
    substanceHistory: raw.substanceHistory,
    zipPrefix: generalizeZip(raw.zipCode),
    socioeconomicTier: raw.socioeconomicTier,
  };
}

export function deIdentifyClaim(
  raw: RawClaimFacts,
  pseudonymizer: CohortPseudonymizer,
): DeIdentifiedClaim {
  return {
    claimPseudonym: pseudonymizer.pseudonymize("cl", raw.claimId),
    patientPseudonym: pseudonymizer.pseudonymize("pt", raw.patientId),
    encounterPseudonym: pseudonymizer.pseudonymize("en", raw.encounterId),
    serviceMonth: raw.serviceDate.toISOString().slice(0, 7),
    payerCategory: categorizePayer(raw.payerName),
    cptCodes: raw.cptCodes,
    icd10Codes: raw.icd10Codes,
    billedCents: raw.billedCents,
    paidCents: raw.paidCents,
    patientRespCents: raw.patientRespCents,
    status: raw.status,
    denialCategory: raw.denialCategory,
  };
}

export interface CohortManifest {
  cohortId: string;
  scope: ResearchScope;
  generatedAt: string;
  patientCount: number;
  claimCount: number;
  /** Suppression triggered when a sub-cohort < this threshold. */
  minCellSize: number;
}

/**
 * Suppress sub-cohorts that fall under the minimum cell size — a
 * standard re-identification safeguard.
 */
export function suppressSmallCells<T extends { sex: string; ageYears: number | "90+" }>(
  patients: T[],
  minCellSize: number,
): { kept: T[]; suppressedBuckets: string[] } {
  const buckets = new Map<string, T[]>();
  for (const p of patients) {
    const ageBand =
      p.ageYears === "90+"
        ? "90+"
        : `${Math.floor(p.ageYears / 10) * 10}-${Math.floor(p.ageYears / 10) * 10 + 9}`;
    const key = `${p.sex}/${ageBand}`;
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }
  const kept: T[] = [];
  const suppressedBuckets: string[] = [];
  for (const [key, list] of buckets) {
    if (list.length >= minCellSize) kept.push(...list);
    else suppressedBuckets.push(key);
  }
  return { kept, suppressedBuckets };
}

export function buildCohortManifest(input: {
  cohortId: string;
  scope: ResearchScope;
  patientCount: number;
  claimCount: number;
  minCellSize: number;
}): CohortManifest {
  return {
    cohortId: input.cohortId,
    scope: input.scope,
    generatedAt: new Date().toISOString(),
    patientCount: input.patientCount,
    claimCount: input.claimCount,
    minCellSize: input.minCellSize,
  };
}

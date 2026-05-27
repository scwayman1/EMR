// ---------------------------------------------------------------------------
// EMR-311 — Clinician application, directory, and compliance matching: types
// ---------------------------------------------------------------------------
// The compliance matcher answers a single question: "given a patient
// physically located in state X, which clinicians on our directory can
// legally see them?" The state cannabis-and-telehealth landscape is
// patchwork, so this is *not* derivable from license-state alone — we
// also need to know the patient's program enrollment and whether the
// clinician participates in it.
// ---------------------------------------------------------------------------

/** US states + DC, two-letter ISO. */
export type UsState =
  | "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "FL" | "GA"
  | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD"
  | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ"
  | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC"
  | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY"
  | "DC";

export type ClinicianCredential = "MD" | "DO" | "NP" | "PA" | "DC";

/** What the clinician is set up to do with a patient. */
export type ClinicianService =
  | "medical-cannabis-cert" // state cannabis program certification
  | "primary-care"
  | "psychiatry"
  | "pain-management"
  | "oncology-supportive"
  | "geriatrics"
  | "pediatrics-severe-epilepsy";

/** Submitted clinician application — what the apply form posts. */
export interface ClinicianApplication {
  id: string;
  firstName: string;
  lastName: string;
  credentials: ClinicianCredential;
  email: string;
  phone: string;
  /** ISO timestamps */
  submittedAt: string;
  reviewedAt: string | null;
  /** States where the clinician holds an active medical license. */
  licensedStates: UsState[];
  /** State cannabis programs the clinician is enrolled in to certify patients. */
  cannabisProgramStates: UsState[];
  services: ClinicianService[];
  npi: string;
  deaSchedule3Plus: boolean;
  bio: string;
  /** Whether the clinician accepts insurance and which kinds. */
  insurance: { acceptsInsurance: boolean; planNames: string[] };
  /** Cash-pay rate in cents for the most common visit. */
  cashRateCents: number;
  status: "submitted" | "under-review" | "approved" | "rejected";
  rejectionReason?: string;
}

/** Public directory listing — derived from an approved application. */
export interface ClinicianListing {
  slug: string;
  displayName: string;
  credentials: ClinicianCredential;
  bio: string;
  services: ClinicianService[];
  licensedStates: UsState[];
  cannabisProgramStates: UsState[];
  acceptsInsurance: boolean;
  cashRateCents: number;
}

export interface ComplianceMatchInput {
  /** State the patient is physically located in at visit time. */
  patientState: UsState;
  /** Patient is enrolled (or eligible) in their state's medical cannabis program. */
  patientHasCannabisCard: boolean;
  /** Service the patient needs. */
  service: ClinicianService;
}

export interface ComplianceMatchResult {
  listing: ClinicianListing;
  /** Whether this clinician can legally see this patient for this service. */
  isMatch: boolean;
  /** Why or why not — surfaced in the directory UI. */
  reasons: string[];
}

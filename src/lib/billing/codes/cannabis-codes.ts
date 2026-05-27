/**
 * EMR-102 — Cannabis-specific ICD-10 + CPT/HCPCS coding catalogue.
 *
 * The standard AMA / WHO codebook predates medical cannabis as a
 * documentable therapy. To get cannabis encounters into the chart and
 * (eventually) onto a clean claim, we maintain a parallel "novel" code
 * catalogue:
 *
 *   1. **Therapeutic ICD-10 indications** — real ICD-10 codes that describe
 *      conditions a clinician is *treating* with cannabis (chronic pain,
 *      MS spasticity, CINV). These are the diagnoses on the claim.
 *
 *   2. **Cannabis-encounter ICD-10 codes** — real ICD-10 codes that describe
 *      the *encounter itself* (Z79 long-term drug therapy, F12 use disorder
 *      codes, T40.7 cannabis adverse effect, etc.). These are how the
 *      certifying clinic captures the visit type.
 *
 *   3. **Proposed Z-code extensions** — placeholder structured codes the
 *      industry is lobbying to get added to ICD-10-CM. These are NOT billable
 *      today but are surfaced in the chart so practices can begin tracking
 *      data in a forward-compatible shape and produce structured research
 *      datasets (Dr. Patel directive).
 *
 *   4. **HCPCS / CPT-equivalents** — the real S-codes, G-codes, and 99XXX
 *      E&M codes that pair with cannabis certification work, plus several
 *      proposed practice-internal codes used for tracking in non-billable
 *      surfaces (titration follow-ups, dose-log review, remote outcome
 *      monitoring).
 *
 * The companion "real" codebook lives in `cpt-codebook.ts`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CodeStatus = "billable" | "informational" | "proposed";

export interface CannabisIcd10 {
  code: string;
  description: string;
  status: CodeStatus;
  /** "encounter" = describes the visit type. "indication" = the condition. */
  bucket: "encounter" | "indication";
  patientPlainLanguage: string;
  evidenceLevel?: "I" | "II" | "III" | "IV";
  /** Companion cannabinoids documented for this indication. */
  cannabinoids?: string[];
  notes?: string;
}

export interface CannabisCpt {
  code: string;
  description: string;
  status: CodeStatus;
  /** What surface in the EMR generates this code. */
  surface:
    | "certification_visit"
    | "follow_up"
    | "telehealth"
    | "outcome_review"
    | "dose_titration"
    | "education"
    | "research_consent";
  /** Approximate national reimbursement. 0 for proposed/internal codes. */
  approxAllowableUsd: number;
  /** Standard E&M / HCPCS code we substitute for billing if `status==="proposed"`. */
  fallbackBillableCode?: string;
  patientPlainLanguage: string;
  documentationHint?: string;
}

// ---------------------------------------------------------------------------
// ICD-10 — real billable codes for cannabis encounters
// ---------------------------------------------------------------------------

export const CANNABIS_ICD10_CODES: CannabisIcd10[] = [
  // ── Encounter type ──
  {
    code: "Z79.891",
    description: "Long-term (current) use of opiate analgesic",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage:
      "Documents that you are on long-term opioids — used when cannabis is being added/substituted to reduce opioid burden.",
    notes:
      "Pair with a cannabis indication ICD-10 to document the opioid-sparing strategy.",
  },
  {
    code: "Z79.899",
    description: "Other long-term (current) drug therapy",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage:
      "Documents that you are on a long-term medication — used to capture ongoing cannabis therapy.",
    notes: "Standard placeholder while a Z-code dedicated to cannabis is pending.",
  },
  {
    code: "Z51.81",
    description: "Encounter for therapeutic drug level monitoring",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "A check-in to track how a medicine is working.",
    notes: "Used for cannabinoid-level review encounters.",
  },
  {
    code: "Z02.83",
    description: "Encounter for blood-alcohol and blood-drug test",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "A visit for drug testing.",
    notes: "Used for THC drug-testing certification visits.",
  },
  {
    code: "F12.10",
    description: "Cannabis abuse, uncomplicated",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "Cannabis use causing problems but not dependence.",
    notes: "Use only when documented criteria are met. Do not use as a default.",
  },
  {
    code: "F12.20",
    description: "Cannabis dependence, uncomplicated",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "Cannabis use disorder — meets dependence criteria.",
  },
  {
    code: "F12.21",
    description: "Cannabis dependence, in remission",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "Cannabis use disorder, currently in remission.",
  },
  {
    code: "F12.90",
    description: "Cannabis use, unspecified, uncomplicated",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "Cannabis use without dependence or abuse.",
  },
  {
    code: "T40.7X1A",
    description: "Poisoning by cannabis (derivatives), accidental, initial encounter",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "Accidental cannabis exposure — typically pediatric edible ingestion.",
  },
  {
    code: "R11.14",
    description: "Cyclical vomiting syndrome, intractable",
    status: "billable",
    bucket: "encounter",
    patientPlainLanguage: "Repeated vomiting — used for cannabinoid hyperemesis syndrome.",
  },

  // ── Indications (real ICD-10s commonly treated with cannabis) ──
  {
    code: "G89.29",
    description: "Other chronic pain",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "I",
    cannabinoids: ["THC", "CBD"],
    patientPlainLanguage: "Long-lasting pain.",
  },
  {
    code: "G89.0",
    description: "Central pain syndrome",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "I",
    cannabinoids: ["THC", "CBD"],
    patientPlainLanguage: "Pain caused by nerve damage.",
  },
  {
    code: "M79.7",
    description: "Fibromyalgia",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "III",
    cannabinoids: ["THC", "CBD", "CBG"],
    patientPlainLanguage: "Widespread muscle pain.",
  },
  {
    code: "G35",
    description: "Multiple sclerosis",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "I",
    cannabinoids: ["THC", "CBD"],
    patientPlainLanguage: "Multiple sclerosis with spasticity.",
  },
  {
    code: "G40.812",
    description: "Lennox-Gastaut syndrome, intractable, with status epilepticus",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "I",
    cannabinoids: ["CBD"],
    patientPlainLanguage: "A type of severe epilepsy.",
  },
  {
    code: "G40.834",
    description: "Dravet syndrome, intractable, with status epilepticus",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "I",
    cannabinoids: ["CBD"],
    patientPlainLanguage: "A genetic form of childhood epilepsy.",
  },
  {
    code: "F43.10",
    description: "Post-traumatic stress disorder, unspecified",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "II",
    cannabinoids: ["THC", "CBD"],
    patientPlainLanguage: "Post-traumatic stress disorder.",
  },
  {
    code: "G47.00",
    description: "Insomnia, unspecified",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "II",
    cannabinoids: ["THC", "CBN", "CBD"],
    patientPlainLanguage: "Trouble sleeping.",
  },
  {
    code: "Z51.5",
    description: "Encounter for palliative care",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "II",
    cannabinoids: ["THC", "CBD"],
    patientPlainLanguage: "Palliative-care visit.",
  },
  {
    code: "T45.1X5A",
    description:
      "Adverse effect of antineoplastic and immunosuppressive drugs, initial encounter",
    status: "billable",
    bucket: "indication",
    evidenceLevel: "I",
    cannabinoids: ["THC", "CBD"],
    patientPlainLanguage: "Side effects from chemotherapy — like nausea and vomiting.",
  },

  // ── Proposed extensions (forward-compatible) ──
  {
    code: "ZX1.00",
    description: "Medical cannabis therapy, initiation visit (proposed)",
    status: "proposed",
    bucket: "encounter",
    patientPlainLanguage:
      "First-time medical-cannabis evaluation — captures the certification visit.",
    notes:
      "Bill `Z79.899` until adopted. Local code surfaced in chart for structured tracking.",
  },
  {
    code: "ZX1.10",
    description: "Medical cannabis therapy, ongoing management (proposed)",
    status: "proposed",
    bucket: "encounter",
    patientPlainLanguage: "A follow-up visit during medical cannabis treatment.",
    notes: "Bill standard E&M; chart-side tracker only.",
  },
  {
    code: "ZX1.20",
    description: "Cannabinoid hyperemesis syndrome (proposed)",
    status: "proposed",
    bucket: "encounter",
    patientPlainLanguage:
      "A severe vomiting reaction to chronic cannabis use; placeholder while ICD-11 codifies.",
    notes: "Bill `R11.14` today.",
  },
  {
    code: "ZX1.30",
    description: "Annual medical cannabis recertification (proposed)",
    status: "proposed",
    bucket: "encounter",
    patientPlainLanguage: "Yearly visit to renew your medical cannabis certification.",
    notes: "Bill standard E&M; chart-side tracker only.",
  },
];

// ---------------------------------------------------------------------------
// CPT / HCPCS — cannabis-specific (real + proposed)
// ---------------------------------------------------------------------------

export const CANNABIS_CPT_CODES: CannabisCpt[] = [
  // ── Real billable substitutes ──
  {
    code: "S0610",
    description:
      "Annual gynecological exam (state Medicaid-recognized for cannabis cert in some states)",
    status: "billable",
    surface: "certification_visit",
    approxAllowableUsd: 95,
    patientPlainLanguage: "Cannabis certification annual visit (state-dependent).",
    documentationHint: "Confirm state Medicaid policy permits this code.",
  },
  {
    code: "99204",
    description: "New patient E&M, level 4 — cannabis certification visit",
    status: "billable",
    surface: "certification_visit",
    approxAllowableUsd: 169,
    patientPlainLanguage: "First-time cannabis evaluation visit.",
  },
  {
    code: "99214",
    description: "Established patient E&M, level 4 — cannabis follow-up",
    status: "billable",
    surface: "follow_up",
    approxAllowableUsd: 132,
    patientPlainLanguage: "Cannabis follow-up visit.",
  },
  {
    code: "99441",
    description: "Telephone E&M, 5–10 min — telehealth cannabis follow-up",
    status: "billable",
    surface: "telehealth",
    approxAllowableUsd: 23,
    patientPlainLanguage: "Quick phone check-in for cannabis treatment.",
  },
  {
    code: "G2086",
    description:
      "Office-based treatment for opioid use disorder; first 70 minutes (cannabis-assisted detox)",
    status: "billable",
    surface: "follow_up",
    approxAllowableUsd: 244,
    patientPlainLanguage:
      "First-month bundled visit for opioid-use treatment that may include cannabinoid adjuncts.",
  },
  {
    code: "G2087",
    description:
      "Office-based treatment for opioid use disorder; subsequent calendar month",
    status: "billable",
    surface: "follow_up",
    approxAllowableUsd: 138,
    patientPlainLanguage:
      "Monthly bundled visit for opioid-use treatment with cannabinoid adjunct.",
  },
  {
    code: "99490",
    description: "Chronic care management — cannabis dosing oversight",
    status: "billable",
    surface: "outcome_review",
    approxAllowableUsd: 64,
    patientPlainLanguage:
      "Between-visit support for ongoing cannabis treatment.",
  },

  // ── Proposed practice-internal codes ──
  {
    code: "LJ-CB-001",
    description: "Cannabis dose titration check (proposed, non-billable)",
    status: "proposed",
    surface: "dose_titration",
    approxAllowableUsd: 0,
    fallbackBillableCode: "99213",
    patientPlainLanguage: "A focused visit to adjust your cannabis dose.",
  },
  {
    code: "LJ-CB-002",
    description: "Cannabis outcome log review (proposed, non-billable)",
    status: "proposed",
    surface: "outcome_review",
    approxAllowableUsd: 0,
    fallbackBillableCode: "99490",
    patientPlainLanguage:
      "Reviewing your outcome scales and emoji check-ins from the patient app.",
  },
  {
    code: "LJ-CB-003",
    description: "Cannabis pharmacology counseling (proposed)",
    status: "proposed",
    surface: "education",
    approxAllowableUsd: 0,
    fallbackBillableCode: "99401",
    patientPlainLanguage: "Education about cannabis, terpenes, and how they work.",
  },
  {
    code: "LJ-CB-004",
    description: "Cannabis research-cohort consent + intake (proposed)",
    status: "proposed",
    surface: "research_consent",
    approxAllowableUsd: 0,
    patientPlainLanguage:
      "Joining a de-identified research cohort — your data helps cannabis science.",
    documentationHint:
      "Generates a structured Outcome export under `lib/billing/research-export.ts`.",
  },
  {
    code: "LJ-CB-005",
    description: "Cannabinoid hyperemesis recovery follow-up (proposed)",
    status: "proposed",
    surface: "follow_up",
    approxAllowableUsd: 0,
    fallbackBillableCode: "99213",
    patientPlainLanguage:
      "Check-in after a severe-vomiting episode related to cannabis use.",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const ICD_BY_CODE = new Map(
  CANNABIS_ICD10_CODES.map((c) => [c.code, c]),
);
const CPT_BY_CODE = new Map(CANNABIS_CPT_CODES.map((c) => [c.code, c]));

export function findCannabisIcd(code: string): CannabisIcd10 | undefined {
  return ICD_BY_CODE.get(code.toUpperCase());
}

export function findCannabisCpt(code: string): CannabisCpt | undefined {
  return CPT_BY_CODE.get(code.toUpperCase());
}

export function billableEquivalent(code: string): string | null {
  const cpt = findCannabisCpt(code);
  if (!cpt) return null;
  if (cpt.status === "billable") return cpt.code;
  return cpt.fallbackBillableCode ?? null;
}

export function indicationsForCannabinoid(cannabinoid: string): CannabisIcd10[] {
  const c = cannabinoid.toUpperCase();
  return CANNABIS_ICD10_CODES.filter(
    (i) =>
      i.bucket === "indication" &&
      i.cannabinoids?.some((cb) => cb.toUpperCase() === c),
  );
}

/** Suggest the right pair of (encounter ICD-10, indication ICD-10, CPT) for
 *  a cannabis certification visit. Used by the scribe agent. */
export function suggestCertificationCoding(opts: {
  isNewPatient: boolean;
  isTelehealth?: boolean;
  primaryIndicationIcd?: string;
}): { encounter: CannabisIcd10; indication?: CannabisIcd10; cpt: CannabisCpt } {
  const encounter = ICD_BY_CODE.get("Z79.899")!;
  const indication = opts.primaryIndicationIcd
    ? findCannabisIcd(opts.primaryIndicationIcd)
    : undefined;
  let cptCode: string;
  if (opts.isTelehealth) cptCode = "99441";
  else if (opts.isNewPatient) cptCode = "99204";
  else cptCode = "99214";
  const cpt = CPT_BY_CODE.get(cptCode)!;
  return { encounter, indication, cpt };
}

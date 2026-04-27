// EMR-077 — Electronic Medication Administration Record (EMAR) types.
//
// Modular API surface for tracking ALL prescription medications — not
// just cannabis. Designed so each layer (drug catalog, pharmacy network,
// administration record) can be replaced independently as we light up
// real partner integrations (RxNorm, NDC directory, NCPDP, Surescripts).
//
// Layering:
//   1. PharmaceuticalDrug — canonical drug entity (RxNorm-backed when
//      possible; falls back to free text + class)
//   2. PharmaceuticalFormulation — strength + form for a drug (e.g.
//      "Atorvastatin 40mg tablet")
//   3. PharmacyNetwork — chain or independent that can dispense a
//      formulation; carries availability + price hints
//   4. EmarAdministration — actual administered dose recorded against
//      a patient (clinic-administered or self-administered)

export type DosageForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "injection"
  | "topical"
  | "patch"
  | "inhaler"
  | "suppository"
  | "drops"
  | "spray"
  | "gummy"
  | "tincture"
  | "vape"
  | "flower"
  | "other";

export type Route =
  | "oral"
  | "sublingual"
  | "buccal"
  | "topical"
  | "intramuscular"
  | "subcutaneous"
  | "intravenous"
  | "intranasal"
  | "rectal"
  | "ophthalmic"
  | "otic"
  | "inhalation";

export type DrugSchedule = "I" | "II" | "III" | "IV" | "V" | "OTC";

export interface PharmaceuticalDrug {
  id: string;
  name: string;
  genericName?: string;
  brandNames: string[];
  rxnorm?: string;
  ndc?: string;
  drugClass: string;
  schedule?: DrugSchedule;
  manufacturers: string[];
  /** Common indications — surfaces during prescribing search. */
  indications: string[];
  /** Common side effects, contraindications. */
  warnings: string[];
  /** Hard contraindications that should block prescribing. */
  hardContraindications?: string[];
}

export interface PharmaceuticalFormulation {
  id: string;
  drugId: string;
  strength: string;
  strengthValue: number;
  strengthUnit: string;
  form: DosageForm;
  packSize?: string;
  /** True for medications requiring scheduled monitoring (e.g. INR). */
  requiresMonitoring?: boolean;
}

export interface DefaultDosing {
  formulationId: string;
  amount: number;
  unit: string;
  route: Route;
  frequency: string;
  durationDays?: number;
  prn?: boolean;
  notes?: string;
}

export interface PharmacyNetwork {
  id: string;
  name: string;
  /** Chain code: CVS, WALG, RITE, KROG, COST, INDEP. */
  code: string;
  ncpdpId?: string;
}

export interface FormulationAvailability {
  formulationId: string;
  pharmacyNetworkId: string;
  inStock: boolean;
  estimatedFillTimeHours?: number;
  cashPriceCents?: number;
  insuranceTier?: 1 | 2 | 3 | 4;
  lastCheckedAt: string;
}

export type EmarAdministrationSite =
  | "clinic"
  | "home_self"
  | "home_caregiver"
  | "pharmacy"
  | "facility";

export type EmarAdministrationStatus =
  | "given"
  | "refused"
  | "held"
  | "missed"
  | "wasted";

/**
 * Single dose actually administered. The EMAR is append-only — corrections
 * are new rows with `correctsAdministrationId` set, never edits.
 */
export interface EmarAdministration {
  id: string;
  patientId: string;
  formulationId: string;
  doseAmount: number;
  doseUnit: string;
  route: Route;
  site: EmarAdministrationSite;
  administeredAt: string;
  administeredBy?: string;
  status: EmarAdministrationStatus;
  reasonCode?: string;
  notes?: string;
  /** The DosingRegimen this administration tracks against. */
  regimenId?: string;
  /** When this row corrects a prior entry, points at the bad row. */
  correctsAdministrationId?: string;
}

export interface EmarSearchHit {
  drug: PharmaceuticalDrug;
  formulations: PharmaceuticalFormulation[];
}

export interface EmarSearchResult {
  query: string;
  hits: EmarSearchHit[];
  /** True when the result was capped — caller should refine the query. */
  truncated: boolean;
}

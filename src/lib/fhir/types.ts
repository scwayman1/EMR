// EMR-013 — Minimal HL7 FHIR R4 type subset.
//
// We only model the resources we actually exchange today (Patient,
// Encounter, MedicationStatement, Condition, Observation, DocumentReference).
// Spec: https://hl7.org/fhir/R4/. Everything else stays as `unknown` rather
// than pulling in a full FHIR types package — keeps the bundle lean and
// makes intent explicit at every boundary.

export type FhirResourceType =
  | "Patient"
  | "Encounter"
  | "Condition"
  | "MedicationStatement"
  | "Observation"
  | "DocumentReference"
  | "Bundle";

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  use?: "usual" | "official" | "temp" | "secondary";
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirHumanName {
  use?: "official" | "usual" | "nickname";
  family?: string;
  given?: string[];
}

export interface FhirAddress {
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface FhirContactPoint {
  system?: "phone" | "email" | "fax";
  value?: string;
  use?: "home" | "work" | "mobile";
}

export interface FhirPatient {
  resourceType: "Patient";
  id?: string;
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  address?: FhirAddress[];
  telecom?: FhirContactPoint[];
}

export interface FhirEncounter {
  resourceType: "Encounter";
  id?: string;
  status: "planned" | "arrived" | "in-progress" | "finished" | "cancelled";
  class?: FhirCoding;
  type?: FhirCodeableConcept[];
  subject: { reference: string };
  period?: FhirPeriod;
  reasonCode?: FhirCodeableConcept[];
}

export interface FhirCondition {
  resourceType: "Condition";
  id?: string;
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  subject: { reference: string };
  onsetDateTime?: string;
  recordedDate?: string;
}

export interface FhirMedicationStatement {
  resourceType: "MedicationStatement";
  id?: string;
  status: "active" | "completed" | "stopped" | "on-hold" | "entered-in-error";
  medicationCodeableConcept?: FhirCodeableConcept;
  subject: { reference: string };
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  dosage?: { text?: string }[];
}

export interface FhirObservation {
  resourceType: "Observation";
  id?: string;
  status: "registered" | "preliminary" | "final" | "amended" | "cancelled";
  code: FhirCodeableConcept;
  subject: { reference: string };
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit?: string };
  valueString?: string;
}

export interface FhirDocumentReference {
  resourceType: "DocumentReference";
  id?: string;
  status: "current" | "superseded" | "entered-in-error";
  type?: FhirCodeableConcept;
  subject: { reference: string };
  date?: string;
  content: { attachment: { contentType?: string; data?: string; url?: string } }[];
}

export type FhirResource =
  | FhirPatient
  | FhirEncounter
  | FhirCondition
  | FhirMedicationStatement
  | FhirObservation
  | FhirDocumentReference;

export interface FhirBundleEntry {
  fullUrl?: string;
  resource: FhirResource;
}

export interface FhirBundle {
  resourceType: "Bundle";
  id?: string;
  type: "document" | "transaction" | "collection" | "searchset";
  entry?: FhirBundleEntry[];
}

export interface FhirOperationOutcome {
  resourceType: "OperationOutcome";
  issue: {
    severity: "fatal" | "error" | "warning" | "information";
    code: string;
    diagnostics?: string;
  }[];
}

// CCD/CDA documents arrive as XML. We don't parse them in this scaffold —
// the importer routes accept the bytes, persist them, and stub the
// translation step. Real parsing will plug into `translateCcdToFhirBundle`.
export interface CcdImportRequest {
  filename: string;
  contentType: "application/xml" | "text/xml" | "application/cda+xml";
  base64: string;
}

// FHIR R4 MedicationRequest translator.
//
// HL7 FHIR is the modern standard for clinical-data exchange. Many
// modern payers, downstream EMRs, and patient-facing apps consume
// FHIR R4 resources over a /Patient/{id}/MedicationRequest endpoint.
//
// This module translates our internal `Prescription` shape into a
// FHIR R4 `MedicationRequest` resource. It is intentionally a pure
// function with no I/O so it can be unit-tested in isolation.
//
// References:
//   • http://hl7.org/fhir/R4/medicationrequest.html
//   • http://hl7.org/fhir/R4/dosage.html

import type { Prescription } from "@/lib/domain/e-prescribe";
import { formatSig } from "@/lib/domain/e-prescribe";

export interface FhirCodeableConcept {
  coding: { system: string; code: string; display?: string }[];
  text?: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

export interface FhirDosage {
  text: string;
  patientInstruction?: string;
  route?: FhirCodeableConcept;
  timing?: {
    repeat?: {
      frequency: number;
      period: number;
      periodUnit: "s" | "min" | "h" | "d" | "wk" | "mo" | "a";
    };
    code?: FhirCodeableConcept;
  };
  doseAndRate?: {
    doseQuantity?: {
      value: number;
      unit: string;
      system?: string;
      code?: string;
    };
  }[];
}

export interface FhirMedicationRequest {
  resourceType: "MedicationRequest";
  id: string;
  status:
    | "active"
    | "on-hold"
    | "cancelled"
    | "completed"
    | "entered-in-error"
    | "stopped"
    | "draft"
    | "unknown";
  intent: "proposal" | "plan" | "order" | "original-order";
  /** Either medicationCodeableConcept or medicationReference is set. */
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  encounter?: FhirReference;
  authoredOn: string;
  requester: FhirReference;
  reasonCode?: FhirCodeableConcept[];
  dosageInstruction: FhirDosage[];
  dispenseRequest?: {
    quantity?: { value: number; unit: string };
    expectedSupplyDuration?: { value: number; unit: string; system: string; code: string };
    numberOfRepeatsAllowed?: number;
    performer?: FhirReference;
  };
  substitution?: { allowedBoolean: boolean };
  note?: { text: string }[];
}

export interface FhirContext {
  /** FHIR Patient resource id. */
  patientId: string;
  /** FHIR Practitioner resource id. */
  practitionerId: string;
  /** FHIR Encounter resource id, if any. */
  encounterId?: string;
  /** FHIR Organization resource id for the pharmacy, when known. */
  pharmacyOrganizationId?: string;
}

const ROUTE_FHIR_CODE: Record<string, { code: string; display: string }> = {
  oral: { code: "26643006", display: "Oral route" },
  sublingual: { code: "37161004", display: "Sublingual route" },
  inhalation: { code: "447694001", display: "Respiratory tract route" },
  topical: { code: "6064005", display: "Topical route" },
  transdermal: { code: "45890007", display: "Transdermal route" },
  rectal: { code: "37161004", display: "Rectal route" },
};

const STATUS_MAP: Record<Prescription["status"], FhirMedicationRequest["status"]> = {
  draft: "draft",
  pending_review: "draft",
  signed: "active",
  sent: "active",
  dispensed: "completed",
  cancelled: "cancelled",
  expired: "stopped",
};

function frequencyToTiming(
  perDay: number,
): NonNullable<FhirDosage["timing"]>["repeat"] | undefined {
  if (perDay <= 0) return undefined;
  return { frequency: perDay, period: 1, periodUnit: "d" };
}

export interface TranslateOptions {
  prescription: Prescription;
  ctx: FhirContext;
  /** Optional RXCUI (from RxNorm lookup) if known. */
  rxcui?: string;
  /** Optional NDC if known. */
  ndc?: string;
}

export function translateToFhir({
  prescription,
  ctx,
  rxcui,
  ndc,
}: TranslateOptions): FhirMedicationRequest {
  const sig = formatSig({
    doseAmount: prescription.doseAmount,
    doseUnit: prescription.doseUnit,
    frequency: prescription.frequency,
    route: prescription.route,
    timingInstructions: prescription.timingInstructions,
  });

  const coding: FhirCodeableConcept["coding"] = [];
  if (rxcui) {
    coding.push({
      system: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: rxcui,
      display: prescription.productName,
    });
  }
  if (ndc) {
    coding.push({
      system: "http://hl7.org/fhir/sid/ndc",
      code: ndc,
      display: prescription.productName,
    });
  }
  if (coding.length === 0) {
    coding.push({
      system: "https://leafjourney.com/codesystem/cannabis-product",
      code: prescription.productType,
      display: prescription.productName,
    });
  }

  const route = ROUTE_FHIR_CODE[prescription.route];

  const dosage: FhirDosage = {
    text: sig,
    patientInstruction: prescription.noteToPatient,
    route: route
      ? {
          coding: [{ system: "http://snomed.info/sct", code: route.code, display: route.display }],
          text: prescription.route,
        }
      : undefined,
    timing: {
      repeat: frequencyToTiming(prescription.frequencyPerDay),
      code: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v3-GTSAbbreviation",
            code: prescription.frequency,
          },
        ],
      },
    },
    doseAndRate: [
      {
        doseQuantity: {
          value: prescription.doseAmount,
          unit: prescription.doseUnit,
          system: "http://unitsofmeasure.org",
          code: prescription.doseUnit,
        },
      },
    ],
  };

  return {
    resourceType: "MedicationRequest",
    id: prescription.id,
    status: STATUS_MAP[prescription.status],
    intent: "order",
    medicationCodeableConcept: {
      coding,
      text: prescription.productName,
    },
    subject: { reference: `Patient/${ctx.patientId}` },
    encounter: ctx.encounterId
      ? { reference: `Encounter/${ctx.encounterId}` }
      : undefined,
    authoredOn: prescription.signedAt ?? prescription.createdAt,
    requester: { reference: `Practitioner/${ctx.practitionerId}` },
    reasonCode: prescription.diagnosisCodes.length
      ? [
          {
            coding: prescription.diagnosisCodes.map((d) => ({
              system: "http://hl7.org/fhir/sid/icd-10-cm",
              code: d.code,
              display: d.label,
            })),
          },
        ]
      : undefined,
    dosageInstruction: [dosage],
    dispenseRequest: {
      quantity: {
        value: prescription.quantity,
        unit: prescription.quantityUnit,
      },
      expectedSupplyDuration: {
        value: prescription.daysSupply,
        unit: "days",
        system: "http://unitsofmeasure.org",
        code: "d",
      },
      numberOfRepeatsAllowed: prescription.refills,
      performer: ctx.pharmacyOrganizationId
        ? {
            reference: `Organization/${ctx.pharmacyOrganizationId}`,
            display: prescription.pharmacyName,
          }
        : undefined,
    },
    substitution: { allowedBoolean: true },
    note: prescription.noteToPharmacy
      ? [{ text: prescription.noteToPharmacy }]
      : undefined,
  };
}

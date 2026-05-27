/**
 * EMR-013 — Conventional EMR Integration via HL7 FHIR R4.
 *
 * Read/write adapter that maps Leafjourney internals to FHIR resources
 * the conventional ecosystem (Epic, Cerner, athena) recognizes. The
 * goal is parity for the day-1 surfaces that matter for cannabis
 * coordination:
 *
 *   - Patient (demographics)
 *   - Encounter (visit / type / period)
 *   - Observation (vitals, dose log, outcome scale)
 *   - MedicationStatement (cannabis regimen + conventional Rx)
 *   - DocumentReference (chart summary, APSO note)
 *
 * The adapter is pure and stateless. Persistence + transport (Direct,
 * Bulk Data, OAuth2 SMART app launch) live in the API route + adapter
 * implementations. Keeping the mappers here makes them unit-testable
 * without spinning up Prisma.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Internal types — narrow shapes the mappers accept. Real callers pass
// Prisma rows, but we deliberately don't import Prisma types here so this
// module is testable without a DB.
// ---------------------------------------------------------------------------

export interface FhirPatientInput {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string | null;
  sex?: "male" | "female" | "other" | "unknown" | null;
  email?: string | null;
  phone?: string | null;
  /** Free-form race/ethnicity captured in our demographics tab. */
  raceEthnicity?: string | null;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } | null;
}

export interface FhirEncounterInput {
  id: string;
  patientId: string;
  status: "planned" | "arrived" | "in-progress" | "finished" | "cancelled";
  type?: string;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  providerId?: string | null;
  reasonText?: string | null;
}

export type FhirObservationKind =
  | "vital-blood-pressure"
  | "vital-heart-rate"
  | "vital-weight"
  | "outcome-scale"
  | "dose-log";

export interface FhirObservationInput {
  id: string;
  patientId: string;
  encounterId?: string | null;
  kind: FhirObservationKind;
  /** Numeric value or string code, depending on kind. */
  value: number | string;
  unit?: string;
  observedAt: Date | string;
  /** Optional secondary value (e.g. diastolic for BP). */
  value2?: number | null;
}

export interface FhirMedicationStatementInput {
  id: string;
  patientId: string;
  medicationName: string;
  /** RxNorm code if known. */
  rxnormCode?: string | null;
  /** Cannabis = true means we also emit a Z71.51 reason snomed code. */
  isCannabis: boolean;
  status: "active" | "stopped" | "completed" | "intended";
  dosageText?: string | null;
  startedOn?: Date | string | null;
  stoppedOn?: Date | string | null;
}

export interface FhirDocumentReferenceInput {
  id: string;
  patientId: string;
  encounterId?: string | null;
  /** Note title or document kind, e.g. "APSO note", "Chart summary". */
  title: string;
  /** UTF-8 content; the mapper base64-encodes it for FHIR. */
  content: string;
  mimeType?: string;
  authoredAt?: Date | string;
}

// ---------------------------------------------------------------------------
// Zod input validators (used by the API routes)
// ---------------------------------------------------------------------------

export const fhirPatientInputSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.union([z.date(), z.string(), z.null()]).optional(),
  sex: z.enum(["male", "female", "other", "unknown"]).nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  raceEthnicity: z.string().nullable().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .nullable()
    .optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  if (typeof d === "string") return d;
  return d.toISOString();
}

function dateOnly(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined;
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 10);
}

function toBase64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

// ---------------------------------------------------------------------------
// Mappers — internal → FHIR R4
// ---------------------------------------------------------------------------

export function toFhirPatient(input: FhirPatientInput): Record<string, unknown> {
  const telecom: Array<Record<string, unknown>> = [];
  if (input.phone) telecom.push({ system: "phone", value: input.phone });
  if (input.email) telecom.push({ system: "email", value: input.email });

  return {
    resourceType: "Patient",
    id: input.id,
    identifier: [
      {
        system: "https://leafjourney.com/identifiers/patient",
        value: input.id,
      },
    ],
    name: [
      {
        use: "official",
        given: [input.firstName],
        family: input.lastName,
      },
    ],
    gender: input.sex ?? undefined,
    birthDate: dateOnly(input.dateOfBirth),
    telecom: telecom.length > 0 ? telecom : undefined,
    address: input.address
      ? [
          {
            line: [input.address.line1, input.address.line2].filter(Boolean),
            city: input.address.city,
            state: input.address.state,
            postalCode: input.address.postalCode,
          },
        ]
      : undefined,
    extension: input.raceEthnicity
      ? [
          {
            url: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-race",
            valueString: input.raceEthnicity,
          },
        ]
      : undefined,
  };
}

export function toFhirEncounter(
  input: FhirEncounterInput,
): Record<string, unknown> {
  const start = iso(input.startedAt);
  const end = iso(input.endedAt);
  return {
    resourceType: "Encounter",
    id: input.id,
    status: input.status,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    subject: { reference: `Patient/${input.patientId}` },
    type: input.type
      ? [{ text: input.type }]
      : undefined,
    period: { start, end },
    participant: input.providerId
      ? [
          {
            individual: { reference: `Practitioner/${input.providerId}` },
          },
        ]
      : undefined,
    reasonCode: input.reasonText
      ? [{ text: input.reasonText }]
      : undefined,
  };
}

const OBSERVATION_LOINC: Record<FhirObservationKind, { code: string; display: string }> = {
  "vital-blood-pressure": { code: "85354-9", display: "Blood pressure panel" },
  "vital-heart-rate": { code: "8867-4", display: "Heart rate" },
  "vital-weight": { code: "29463-7", display: "Body weight" },
  "outcome-scale": { code: "72133-2", display: "Patient-reported outcome" },
  "dose-log": { code: "94090-7", display: "Cannabis dose log" },
};

export function toFhirObservation(
  input: FhirObservationInput,
): Record<string, unknown> {
  const loinc = OBSERVATION_LOINC[input.kind];
  const base: Record<string, unknown> = {
    resourceType: "Observation",
    id: input.id,
    status: "final",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: loinc.code,
          display: loinc.display,
        },
      ],
    },
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId
      ? { reference: `Encounter/${input.encounterId}` }
      : undefined,
    effectiveDateTime: iso(input.observedAt),
  };

  if (input.kind === "vital-blood-pressure") {
    base.component = [
      {
        code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic BP" }] },
        valueQuantity: { value: input.value, unit: "mmHg" },
      },
      {
        code: { coding: [{ system: "http://loinc.org", code: "8462-4", display: "Diastolic BP" }] },
        valueQuantity: { value: input.value2 ?? 0, unit: "mmHg" },
      },
    ];
  } else if (typeof input.value === "number") {
    base.valueQuantity = { value: input.value, unit: input.unit };
  } else {
    base.valueString = input.value;
  }

  return base;
}

export function toFhirMedicationStatement(
  input: FhirMedicationStatementInput,
): Record<string, unknown> {
  const medication: Record<string, unknown> = {
    text: input.medicationName,
  };
  const coding: Array<Record<string, unknown>> = [];
  if (input.rxnormCode) {
    coding.push({
      system: "http://www.nlm.nih.gov/research/umls/rxnorm",
      code: input.rxnormCode,
      display: input.medicationName,
    });
  }
  if (input.isCannabis) {
    coding.push({
      system: "http://snomed.info/sct",
      code: "707158009",
      display: "Cannabinoid product (substance)",
    });
  }
  if (coding.length > 0) medication.coding = coding;

  return {
    resourceType: "MedicationStatement",
    id: input.id,
    status: input.status,
    subject: { reference: `Patient/${input.patientId}` },
    medicationCodeableConcept: medication,
    dosage: input.dosageText
      ? [{ text: input.dosageText }]
      : undefined,
    effectivePeriod: {
      start: iso(input.startedOn),
      end: iso(input.stoppedOn),
    },
    reasonCode: input.isCannabis
      ? [
          {
            coding: [
              {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "Z79.891",
                display: "Long term (current) use of cannabinoid",
              },
            ],
          },
        ]
      : undefined,
  };
}

export function toFhirDocumentReference(
  input: FhirDocumentReferenceInput,
): Record<string, unknown> {
  return {
    resourceType: "DocumentReference",
    id: input.id,
    status: "current",
    type: { text: input.title },
    subject: { reference: `Patient/${input.patientId}` },
    context: input.encounterId
      ? { encounter: [{ reference: `Encounter/${input.encounterId}` }] }
      : undefined,
    date: iso(input.authoredAt) ?? new Date().toISOString(),
    content: [
      {
        attachment: {
          contentType: input.mimeType ?? "text/plain",
          data: toBase64(input.content),
          title: input.title,
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// FHIR Bundle composition (used for /Patient/$everything responses)
// ---------------------------------------------------------------------------

export interface BundleEntry {
  resource: Record<string, unknown>;
}

export function fhirBundle(entries: BundleEntry[]): Record<string, unknown> {
  return {
    resourceType: "Bundle",
    type: "searchset",
    total: entries.length,
    entry: entries.map((e) => ({
      fullUrl: `${(e.resource as { resourceType?: string }).resourceType}/${(e.resource as { id?: string }).id}`,
      resource: e.resource,
    })),
  };
}

// ---------------------------------------------------------------------------
// Inbound mapping (FHIR → internal). Used when the bridge ingests data
// from a partner EMR. Returns "best effort" — fields we cannot map go to
// `unknown` so they can be reviewed.
// ---------------------------------------------------------------------------

export interface InboundPatient {
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  sex: "male" | "female" | "other" | "unknown" | null;
  email: string | null;
  phone: string | null;
  unknown: Record<string, unknown>;
}

export function fromFhirPatient(resource: unknown): InboundPatient {
  const r = resource as any;
  if (!r || r.resourceType !== "Patient") {
    throw new Error("Expected a FHIR Patient resource");
  }
  const name = Array.isArray(r.name) ? r.name[0] : null;
  const tel = Array.isArray(r.telecom) ? r.telecom : [];
  const phone = tel.find((t: any) => t?.system === "phone")?.value ?? null;
  const email = tel.find((t: any) => t?.system === "email")?.value ?? null;

  return {
    externalId: r.id,
    firstName: name?.given?.[0] ?? null,
    lastName: name?.family ?? null,
    dateOfBirth: r.birthDate ?? null,
    sex: (r.gender as any) ?? null,
    email,
    phone,
    unknown: {
      identifier: r.identifier,
      address: r.address,
      extension: r.extension,
    },
  };
}

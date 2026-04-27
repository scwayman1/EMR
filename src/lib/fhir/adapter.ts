// EMR-013 — FHIR ↔ EMR adapter helpers.
//
// One-way translators between our internal Prisma models and FHIR R4
// resource shapes. Keep this layer pure (no DB access) so it can be
// unit-tested and reused by both the API routes and the worker that
// processes async CCD imports.

import type {
  FhirBundle,
  FhirCondition,
  FhirEncounter,
  FhirMedicationStatement,
  FhirObservation,
  FhirPatient,
} from "./types";

interface InternalPatient {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

export function patientToFhir(p: InternalPatient): FhirPatient {
  return {
    resourceType: "Patient",
    id: p.id,
    identifier: [
      {
        system: "https://leafjourney.com/patient",
        value: p.id,
        use: "official",
      },
    ],
    name: [
      {
        use: "official",
        family: p.lastName,
        given: [p.firstName],
      },
    ],
    gender: normalizeGender(p.sex),
    birthDate: p.dob ? p.dob.toISOString().slice(0, 10) : undefined,
    telecom: [
      p.email ? { system: "email" as const, value: p.email } : null,
      p.phone ? { system: "phone" as const, value: p.phone } : null,
    ].filter((t): t is { system: "email" | "phone"; value: string } => t !== null),
    address:
      p.addressLine1 || p.city
        ? [
            {
              line: [p.addressLine1, p.addressLine2].filter(
                (line): line is string => Boolean(line),
              ),
              city: p.city ?? undefined,
              state: p.state ?? undefined,
              postalCode: p.postalCode ?? undefined,
              country: "US",
            },
          ]
        : undefined,
  };
}

function normalizeGender(sex: string | null): FhirPatient["gender"] {
  if (!sex) return "unknown";
  const lower = sex.toLowerCase();
  if (lower.startsWith("m")) return "male";
  if (lower.startsWith("f")) return "female";
  if (lower === "other") return "other";
  return "unknown";
}

interface InternalEncounter {
  id: string;
  patientId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
  reason?: string | null;
}

export function encounterToFhir(e: InternalEncounter): FhirEncounter {
  return {
    resourceType: "Encounter",
    id: e.id,
    status: mapEncounterStatus(e.status),
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    subject: { reference: `Patient/${e.patientId}` },
    period: {
      start: e.startedAt.toISOString(),
      end: e.endedAt?.toISOString(),
    },
    reasonCode: e.reason ? [{ text: e.reason }] : undefined,
  };
}

function mapEncounterStatus(s: string): FhirEncounter["status"] {
  if (s === "in_progress" || s === "active") return "in-progress";
  if (s === "completed" || s === "signed") return "finished";
  if (s === "cancelled" || s === "no_show") return "cancelled";
  if (s === "scheduled") return "planned";
  return "in-progress";
}

interface InternalCondition {
  id: string;
  patientId: string;
  icd10: string;
  description: string;
  onsetDate?: Date | null;
  resolvedAt?: Date | null;
}

export function conditionToFhir(c: InternalCondition): FhirCondition {
  return {
    resourceType: "Condition",
    id: c.id,
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: c.resolvedAt ? "resolved" : "active",
        },
      ],
    },
    code: {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10-cm",
          code: c.icd10,
          display: c.description,
        },
      ],
      text: c.description,
    },
    subject: { reference: `Patient/${c.patientId}` },
    onsetDateTime: c.onsetDate?.toISOString(),
  };
}

interface InternalMedication {
  id: string;
  patientId: string;
  name: string;
  rxnorm?: string | null;
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
  sig?: string | null;
}

export function medicationToFhir(m: InternalMedication): FhirMedicationStatement {
  return {
    resourceType: "MedicationStatement",
    id: m.id,
    status: mapMedicationStatus(m.status),
    medicationCodeableConcept: {
      coding: m.rxnorm
        ? [
            {
              system: "http://www.nlm.nih.gov/research/umls/rxnorm",
              code: m.rxnorm,
              display: m.name,
            },
          ]
        : undefined,
      text: m.name,
    },
    subject: { reference: `Patient/${m.patientId}` },
    effectivePeriod: {
      start: m.startDate?.toISOString(),
      end: m.endDate?.toISOString(),
    },
    dosage: m.sig ? [{ text: m.sig }] : undefined,
  };
}

function mapMedicationStatus(s: string): FhirMedicationStatement["status"] {
  if (s === "active") return "active";
  if (s === "completed" || s === "discontinued") return "completed";
  if (s === "stopped") return "stopped";
  if (s === "on_hold") return "on-hold";
  return "entered-in-error";
}

interface InternalLabResult {
  id: string;
  patientId: string;
  loinc?: string | null;
  testName: string;
  value: string | number;
  unit?: string | null;
  observedAt: Date;
}

export function labToFhirObservation(l: InternalLabResult): FhirObservation {
  const isNumber = typeof l.value === "number";
  return {
    resourceType: "Observation",
    id: l.id,
    status: "final",
    code: {
      coding: l.loinc
        ? [
            {
              system: "http://loinc.org",
              code: l.loinc,
              display: l.testName,
            },
          ]
        : undefined,
      text: l.testName,
    },
    subject: { reference: `Patient/${l.patientId}` },
    effectiveDateTime: l.observedAt.toISOString(),
    valueQuantity: isNumber
      ? { value: l.value as number, unit: l.unit ?? undefined }
      : undefined,
    valueString: !isNumber ? String(l.value) : undefined,
  };
}

/**
 * Build a FHIR document Bundle from internal records. Used by the
 * /api/fhir/Patient/[id]/$everything endpoint.
 */
export function buildPatientEverythingBundle(args: {
  patient: FhirPatient;
  encounters: FhirEncounter[];
  conditions: FhirCondition[];
  medications: FhirMedicationStatement[];
  observations: FhirObservation[];
}): FhirBundle {
  return {
    resourceType: "Bundle",
    type: "searchset",
    entry: [
      { resource: args.patient },
      ...args.encounters.map((e) => ({ resource: e })),
      ...args.conditions.map((c) => ({ resource: c })),
      ...args.medications.map((m) => ({ resource: m })),
      ...args.observations.map((o) => ({ resource: o })),
    ],
  };
}

/**
 * Stub for CCD/CDA → FHIR translation. The real implementation will use a
 * proper CDA parser (sax-js based) and map LOINC-coded sections into our
 * resource shapes. For now we accept the bytes and return an empty bundle
 * so callers can wire the upstream UI in parallel.
 */
export function translateCcdToFhirBundle(args: {
  filename: string;
  xml: string;
}): { bundle: FhirBundle; warnings: string[] } {
  return {
    bundle: { resourceType: "Bundle", type: "document", entry: [] },
    warnings: [
      `CCD parser not yet implemented — received ${args.filename} ` +
        `(${args.xml.length} bytes). Bytes were stored; translation pending.`,
    ],
  };
}

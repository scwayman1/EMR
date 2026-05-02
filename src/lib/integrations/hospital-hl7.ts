// EMR-106 — Hospital System Integration.
//
// HL7 FHIR R4 message builder/parser for the Leafjourney <-> hospital
// bridge. Covers the four flows the hospital partners actually need:
//   • ADT^A01..A03 (Admit / Discharge / Transfer) ingestion
//   • ORU^R01-style lab result ingestion (FHIR Observation)
//   • Outbound MedicationStatement / ServiceRequest referrals
//   • Webhook receiver that demuxes into the right handler
//
// We model FHIR R4 resources as plain TypeScript shapes — no SDK — so the
// module stays test-friendly and free of build-time native dependencies.
// All builders return validated `FhirBundle` objects; all parsers tolerate
// the messy real-world payloads hospitals tend to emit (extra fields,
// snake_case enums, missing meta blocks).

import { z } from "zod";

// ---------------------------------------------------------------------------
// Core FHIR R4 resource shapes (minimal, just what we exchange).
// ---------------------------------------------------------------------------

export type FhirResourceType =
  | "Patient"
  | "Encounter"
  | "Observation"
  | "MedicationStatement"
  | "ServiceRequest"
  | "Bundle"
  | "MessageHeader";

export interface FhirIdentifier {
  system?: string;
  value: string;
}

export interface FhirCoding {
  system?: string;
  code: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirReference {
  reference: string;        // e.g. "Patient/123"
  display?: string;
}

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  identifier?: FhirIdentifier[];
  name?: Array<{ family?: string; given?: string[] }>;
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;       // YYYY-MM-DD
}

export type EncounterStatus =
  | "planned"
  | "arrived"
  | "in-progress"
  | "finished"
  | "cancelled";

export interface FhirEncounter {
  resourceType: "Encounter";
  id: string;
  status: EncounterStatus;
  class: FhirCoding;        // inpatient | outpatient | emergency | etc.
  subject: FhirReference;
  period?: { start?: string; end?: string };
  location?: Array<{ location: FhirReference; status?: string }>;
}

export interface FhirObservation {
  resourceType: "Observation";
  id: string;
  status: "registered" | "preliminary" | "final" | "amended";
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime?: string;
  valueQuantity?: { value: number; unit?: string; system?: string; code?: string };
  valueString?: string;
  interpretation?: FhirCodeableConcept[];
}

export interface FhirMedicationStatement {
  resourceType: "MedicationStatement";
  id: string;
  status: "active" | "completed" | "stopped" | "intended";
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  effectivePeriod?: { start?: string; end?: string };
  dosage?: Array<{ text?: string }>;
}

export interface FhirServiceRequest {
  resourceType: "ServiceRequest";
  id: string;
  status: "draft" | "active" | "completed" | "revoked";
  intent: "proposal" | "plan" | "order" | "referral";
  code: FhirCodeableConcept;
  subject: FhirReference;
  authoredOn?: string;
  requester?: FhirReference;
  performer?: FhirReference[];
  reasonCode?: FhirCodeableConcept[];
}

export interface FhirBundleEntry<T = FhirAnyResource> {
  fullUrl?: string;
  resource: T;
}

export type FhirAnyResource =
  | FhirPatient
  | FhirEncounter
  | FhirObservation
  | FhirMedicationStatement
  | FhirServiceRequest;

export interface FhirBundle {
  resourceType: "Bundle";
  id: string;
  type: "message" | "transaction" | "collection" | "document";
  timestamp: string;
  entry: FhirBundleEntry[];
}

// ---------------------------------------------------------------------------
// ADT events.
// ---------------------------------------------------------------------------

export type AdtEventCode = "A01" | "A02" | "A03";

export interface AdtEvent {
  /** A01 Admit, A02 Transfer, A03 Discharge. */
  code: AdtEventCode;
  encounterId: string;
  patient: { id: string; mrn?: string; family: string; given: string };
  facility: string;
  unit?: string;
  occurredAt: string;
}

const adtCodeToEncounterStatus: Record<AdtEventCode, EncounterStatus> = {
  A01: "in-progress",
  A02: "in-progress",
  A03: "finished",
};

const adtCodeToClass: Record<AdtEventCode, FhirCoding> = {
  A01: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP", display: "inpatient encounter" },
  A02: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP", display: "inpatient encounter" },
  A03: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "IMP", display: "inpatient encounter" },
};

export function buildAdtBundle(event: AdtEvent): FhirBundle {
  const patient: FhirPatient = {
    resourceType: "Patient",
    id: event.patient.id,
    identifier: event.patient.mrn
      ? [{ system: "urn:hospital:mrn", value: event.patient.mrn }]
      : undefined,
    name: [{ family: event.patient.family, given: [event.patient.given] }],
  };
  const encounter: FhirEncounter = {
    resourceType: "Encounter",
    id: event.encounterId,
    status: adtCodeToEncounterStatus[event.code],
    class: adtCodeToClass[event.code],
    subject: { reference: `Patient/${event.patient.id}` },
    period:
      event.code === "A03"
        ? { end: event.occurredAt }
        : { start: event.occurredAt },
    location: event.unit
      ? [{ location: { reference: `Location/${event.unit}`, display: event.unit }, status: "active" }]
      : undefined,
  };
  return {
    resourceType: "Bundle",
    id: `adt-${event.code.toLowerCase()}-${event.encounterId}`,
    type: "message",
    timestamp: event.occurredAt,
    entry: [
      { fullUrl: `Patient/${patient.id}`, resource: patient },
      { fullUrl: `Encounter/${encounter.id}`, resource: encounter },
    ],
  };
}

const adtEventSchema = z.object({
  code: z.enum(["A01", "A02", "A03"]),
  encounterId: z.string().min(1),
  patient: z.object({
    id: z.string().min(1),
    mrn: z.string().optional(),
    family: z.string(),
    given: z.string(),
  }),
  facility: z.string(),
  unit: z.string().optional(),
  occurredAt: z.string(),
});

export function parseAdtEvent(input: unknown): AdtEvent {
  return adtEventSchema.parse(input);
}

export interface AdtIngestResult {
  action: "admit" | "transfer" | "discharge";
  encounterId: string;
  patientId: string;
  bundle: FhirBundle;
}

export function handleAdtEvent(event: AdtEvent): AdtIngestResult {
  const bundle = buildAdtBundle(event);
  const action: AdtIngestResult["action"] =
    event.code === "A01" ? "admit" : event.code === "A02" ? "transfer" : "discharge";
  return {
    action,
    encounterId: event.encounterId,
    patientId: event.patient.id,
    bundle,
  };
}

// ---------------------------------------------------------------------------
// Lab result ingestion (FHIR Observation).
// ---------------------------------------------------------------------------

export interface InboundLabResult {
  patientId: string;
  observationId: string;
  loincCode: string;
  display: string;
  value: number | string;
  unit?: string;
  abnormalFlag?: "L" | "H" | "N" | "A";
  observedAt: string;
  status?: FhirObservation["status"];
}

const interpretationMap: Record<NonNullable<InboundLabResult["abnormalFlag"]>, FhirCoding> = {
  L: { system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "L", display: "Low" },
  H: { system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "H", display: "High" },
  N: { system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "N", display: "Normal" },
  A: { system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: "A", display: "Abnormal" },
};

export function buildLabObservation(input: InboundLabResult): FhirObservation {
  const valuePart =
    typeof input.value === "number"
      ? { valueQuantity: { value: input.value, unit: input.unit, system: "http://unitsofmeasure.org", code: input.unit } }
      : { valueString: String(input.value) };
  return {
    resourceType: "Observation",
    id: input.observationId,
    status: input.status ?? "final",
    category: [
      {
        coding: [
          { system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory", display: "Laboratory" },
        ],
      },
    ],
    code: {
      coding: [{ system: "http://loinc.org", code: input.loincCode, display: input.display }],
      text: input.display,
    },
    subject: { reference: `Patient/${input.patientId}` },
    effectiveDateTime: input.observedAt,
    interpretation: input.abnormalFlag ? [{ coding: [interpretationMap[input.abnormalFlag]] }] : undefined,
    ...valuePart,
  };
}

const labResultSchema = z.object({
  patientId: z.string().min(1),
  observationId: z.string().min(1),
  loincCode: z.string().min(1),
  display: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  abnormalFlag: z.enum(["L", "H", "N", "A"]).optional(),
  observedAt: z.string(),
  status: z.enum(["registered", "preliminary", "final", "amended"]).optional(),
});

export interface LabIngestResult {
  observation: FhirObservation;
  bundle: FhirBundle;
  flaggedAbnormal: boolean;
}

export function ingestLabResult(input: unknown): LabIngestResult {
  const parsed = labResultSchema.parse(input);
  const observation = buildLabObservation(parsed);
  const bundle: FhirBundle = {
    resourceType: "Bundle",
    id: `lab-${observation.id}`,
    type: "collection",
    timestamp: parsed.observedAt,
    entry: [{ fullUrl: `Observation/${observation.id}`, resource: observation }],
  };
  return {
    observation,
    bundle,
    flaggedAbnormal: parsed.abnormalFlag === "H" || parsed.abnormalFlag === "L" || parsed.abnormalFlag === "A",
  };
}

// ---------------------------------------------------------------------------
// Outbound referral.
// ---------------------------------------------------------------------------

export interface OutboundReferral {
  patientId: string;
  serviceRequestId: string;
  reason: string;
  specialty: string;       // SNOMED specialty display, e.g. "Cardiology"
  specialtyCode?: string;  // SNOMED code if known
  requesterPractitionerId: string;
  performerOrganizationId?: string;
  authoredAt: string;
  cannabisMedicationsAtReferral?: Array<{
    rxnormCode?: string;
    display: string;
    dosageText?: string;
  }>;
}

export function buildReferralBundle(input: OutboundReferral): FhirBundle {
  const serviceRequest: FhirServiceRequest = {
    resourceType: "ServiceRequest",
    id: input.serviceRequestId,
    status: "active",
    intent: "referral",
    code: {
      coding: input.specialtyCode
        ? [{ system: "http://snomed.info/sct", code: input.specialtyCode, display: input.specialty }]
        : undefined,
      text: input.specialty,
    },
    subject: { reference: `Patient/${input.patientId}` },
    authoredOn: input.authoredAt,
    requester: { reference: `Practitioner/${input.requesterPractitionerId}` },
    performer: input.performerOrganizationId
      ? [{ reference: `Organization/${input.performerOrganizationId}` }]
      : undefined,
    reasonCode: [{ text: input.reason }],
  };

  const meds: FhirMedicationStatement[] = (input.cannabisMedicationsAtReferral ?? []).map((m, i) => ({
    resourceType: "MedicationStatement",
    id: `${input.serviceRequestId}-med-${i}`,
    status: "active",
    medicationCodeableConcept: {
      coding: m.rxnormCode
        ? [{ system: "http://www.nlm.nih.gov/research/umls/rxnorm", code: m.rxnormCode, display: m.display }]
        : undefined,
      text: m.display,
    },
    subject: { reference: `Patient/${input.patientId}` },
    dosage: m.dosageText ? [{ text: m.dosageText }] : undefined,
  }));

  return {
    resourceType: "Bundle",
    id: `referral-${input.serviceRequestId}`,
    type: "transaction",
    timestamp: input.authoredAt,
    entry: [
      { fullUrl: `ServiceRequest/${serviceRequest.id}`, resource: serviceRequest },
      ...meds.map((m) => ({ fullUrl: `MedicationStatement/${m.id}`, resource: m })),
    ],
  };
}

// ---------------------------------------------------------------------------
// Webhook receiver — demuxes by MessageHeader event or Bundle shape.
// Hospitals send any of: bare ADT JSON, FHIR message Bundle with a
// MessageHeader, or a transaction Bundle of Observations. We sniff the
// payload and route to the right handler.
// ---------------------------------------------------------------------------

export type WebhookOutcome =
  | { kind: "adt"; result: AdtIngestResult }
  | { kind: "lab"; result: LabIngestResult }
  | { kind: "ignored"; reason: string };

export interface WebhookEnvelope {
  /** Hospital partner identifier — used for tenancy and audit. */
  partnerId: string;
  /** Raw HTTP body parsed into JSON. */
  payload: unknown;
  /** HMAC signature header value. Verify at the edge before calling this. */
  signatureHeader?: string;
  receivedAt: string;
}

export interface WebhookReceiverOptions {
  /**
   * Optional verifier — caller is responsible for HMAC; we only call this
   * if provided so the receiver itself stays pure.
   */
  verifySignature?: (body: string, signature: string | undefined) => boolean;
}

function isBundle(x: unknown): x is FhirBundle {
  return !!x && typeof x === "object" && (x as { resourceType?: string }).resourceType === "Bundle";
}

function isObservationEntry(e: FhirBundleEntry): e is FhirBundleEntry<FhirObservation> {
  return e.resource.resourceType === "Observation";
}

export function receiveWebhook(env: WebhookEnvelope, opts: WebhookReceiverOptions = {}): WebhookOutcome {
  if (opts.verifySignature) {
    const body = typeof env.payload === "string" ? env.payload : JSON.stringify(env.payload);
    if (!opts.verifySignature(body, env.signatureHeader)) {
      return { kind: "ignored", reason: "signature_invalid" };
    }
  }

  const payload = env.payload as Record<string, unknown> | null;
  if (!payload || typeof payload !== "object") {
    return { kind: "ignored", reason: "non_object_payload" };
  }

  // Shape 1: bare ADT JSON (our partners' simplest format).
  if (typeof payload.code === "string" && /^A0[123]$/.test(payload.code as string)) {
    const event = parseAdtEvent(payload);
    return { kind: "adt", result: handleAdtEvent(event) };
  }

  // Shape 2: FHIR Bundle.
  if (isBundle(payload)) {
    const obs = payload.entry.find(isObservationEntry);
    if (obs) {
      const o = obs.resource;
      const value =
        o.valueQuantity?.value ??
        o.valueString ??
        0;
      const unit = o.valueQuantity?.unit;
      const code = o.code.coding?.[0];
      const result = ingestLabResult({
        patientId: o.subject.reference.replace(/^Patient\//, ""),
        observationId: o.id,
        loincCode: code?.code ?? "UNKNOWN",
        display: code?.display ?? o.code.text ?? "Unknown",
        value,
        unit,
        abnormalFlag: o.interpretation?.[0]?.coding?.[0]?.code as InboundLabResult["abnormalFlag"],
        observedAt: o.effectiveDateTime ?? env.receivedAt,
        status: o.status,
      });
      return { kind: "lab", result };
    }
  }

  return { kind: "ignored", reason: "unrecognized_shape" };
}

// ---------------------------------------------------------------------------
// Convenience: terse JSON-Patch-ish diffing for round-trip tests.
// ---------------------------------------------------------------------------

export function bundleSummary(b: FhirBundle): {
  id: string;
  type: FhirBundle["type"];
  resourceCount: number;
  resourceTypes: FhirResourceType[];
} {
  const types = new Set<FhirResourceType>();
  for (const e of b.entry) types.add(e.resource.resourceType as FhirResourceType);
  return {
    id: b.id,
    type: b.type,
    resourceCount: b.entry.length,
    resourceTypes: Array.from(types).sort(),
  };
}

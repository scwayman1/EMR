// EMR-013 — Conventional EMR Integration (HL7 FHIR R4 adapter).
//
// Bidirectional data exchange with conventional EMRs (Epic, Cerner, …):
//   • Export a patient as a FHIR R4 document Bundle (Patient + conditions +
//     medications) so an outside system can ingest the Leafjourney chart.
//   • Import a FHIR Bundle and reconcile medications (cannabis + conventional)
//     into a single de-duplicated list, flagging conflicts for the clinician.
//
// The mapping helpers are pure and unit-tested; the network plumbing is a thin
// shell around them.

export interface SimpleMedication {
  name: string;
  /** e.g. "10 mg", "0.5 mL" */
  dose?: string;
  /** Whether this is a cannabis product vs. a conventional pharmaceutical. */
  isCannabis?: boolean;
  /** RxNorm / source code, when known. */
  code?: string;
}

export interface SimpleCondition {
  name: string;
  /** ICD-10 code, when known. */
  code?: string;
}

export interface PatientChart {
  id: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  conditions: SimpleCondition[];
  medications: SimpleMedication[];
}

// ── FHIR resource shapes (minimal R4 subset) ───────────────────────────────

export interface FhirBundle {
  resourceType: "Bundle";
  type: "document";
  entry: Array<{ resource: FhirResource }>;
}

export type FhirResource =
  | FhirPatient
  | FhirCondition
  | FhirMedicationStatement;

interface FhirPatient {
  resourceType: "Patient";
  id: string;
  name: Array<{ family: string; given: string[] }>;
  birthDate?: string;
}

interface FhirCondition {
  resourceType: "Condition";
  code: { text: string; coding?: Array<{ system: string; code: string }> };
  subject: { reference: string };
}

interface FhirMedicationStatement {
  resourceType: "MedicationStatement";
  status: "active";
  medicationCodeableConcept: {
    text: string;
    coding?: Array<{ system: string; code: string }>;
  };
  dosage?: Array<{ text: string }>;
  subject: { reference: string };
}

const ICD10_SYSTEM = "http://hl7.org/fhir/sid/icd-10-cm";
const RXNORM_SYSTEM = "http://www.nlm.nih.gov/research/umls/rxnorm";

// ── Pure mapping ────────────────────────────────────────────────────────────

/** Map an internal patient chart to a FHIR R4 document Bundle. */
export function chartToFhirBundle(chart: PatientChart): FhirBundle {
  const ref = `Patient/${chart.id}`;
  const entries: Array<{ resource: FhirResource }> = [
    {
      resource: {
        resourceType: "Patient",
        id: chart.id,
        name: [{ family: chart.lastName, given: [chart.firstName] }],
        ...(chart.birthDate ? { birthDate: chart.birthDate } : {}),
      },
    },
    ...chart.conditions.map((c) => ({
      resource: {
        resourceType: "Condition" as const,
        code: {
          text: c.name,
          ...(c.code ? { coding: [{ system: ICD10_SYSTEM, code: c.code }] } : {}),
        },
        subject: { reference: ref },
      },
    })),
    ...chart.medications.map((m) => ({
      resource: {
        resourceType: "MedicationStatement" as const,
        status: "active" as const,
        medicationCodeableConcept: {
          text: m.name,
          ...(m.code ? { coding: [{ system: RXNORM_SYSTEM, code: m.code }] } : {}),
        },
        ...(m.dose ? { dosage: [{ text: m.dose }] } : {}),
        subject: { reference: ref },
      },
    })),
  ];

  return { resourceType: "Bundle", type: "document", entry: entries };
}

/** Extract medications from an inbound FHIR Bundle. */
export function medicationsFromBundle(bundle: FhirBundle): SimpleMedication[] {
  return bundle.entry
    .map((e) => e.resource)
    .filter(
      (r): r is FhirMedicationStatement =>
        r.resourceType === "MedicationStatement",
    )
    .map((r) => ({
      name: r.medicationCodeableConcept.text,
      dose: r.dosage?.[0]?.text,
      code: r.medicationCodeableConcept.coding?.[0]?.code,
    }));
}

export interface ReconciliationResult {
  /** De-duplicated union of both medication lists. */
  merged: SimpleMedication[];
  /** Medications present only in the incoming (external) list. */
  added: SimpleMedication[];
  /** Same drug name with a differing dose between the two lists. */
  conflicts: Array<{ name: string; existingDose?: string; incomingDose?: string }>;
}

const normName = (s: string) => s.trim().toLowerCase();

/**
 * Medication reconciliation between the local chart and an external EMR's
 * list. De-duplicates by name, surfaces new meds, and flags dose conflicts so
 * the clinician can resolve them. Cannabis flags are preserved from whichever
 * side asserts them.
 */
export function reconcileMedications(
  existing: SimpleMedication[],
  incoming: SimpleMedication[],
): ReconciliationResult {
  const byName = new Map<string, SimpleMedication>();
  for (const m of existing) byName.set(normName(m.name), { ...m });

  const added: SimpleMedication[] = [];
  const conflicts: ReconciliationResult["conflicts"] = [];

  for (const m of incoming) {
    const key = normName(m.name);
    const prior = byName.get(key);
    if (!prior) {
      byName.set(key, { ...m });
      added.push(m);
      continue;
    }
    if (m.dose && prior.dose && m.dose !== prior.dose) {
      conflicts.push({ name: prior.name, existingDose: prior.dose, incomingDose: m.dose });
    }
    // Preserve a cannabis flag from either source; fill in a missing dose.
    byName.set(key, {
      ...prior,
      dose: prior.dose ?? m.dose,
      isCannabis: prior.isCannabis || m.isCannabis,
      code: prior.code ?? m.code,
    });
  }

  return { merged: Array.from(byName.values()), added, conflicts };
}

// ── Network shell ────────────────────────────────────────────────────────────

export class FhirAdapter {
  constructor(
    private endpoint: string,
    private certPath: string,
  ) {}

  /** Export a patient chart as a FHIR R4 document Bundle. */
  async exportPatientBundle(chart: PatientChart): Promise<FhirBundle> {
    return chartToFhirBundle(chart);
  }

  /**
   * Import a FHIR Bundle (JSON) and reconcile its medications against the
   * local chart's current medication list.
   */
  async importAndReconcile(
    bundleJson: string,
    existing: SimpleMedication[],
  ): Promise<ReconciliationResult> {
    const bundle = JSON.parse(bundleJson) as FhirBundle;
    const incoming = medicationsFromBundle(bundle);
    return reconcileMedications(existing, incoming);
  }
}

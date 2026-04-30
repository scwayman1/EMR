/**
 * EMR-077 — Modular EMAR (Electronic Medication Administration Record).
 *
 * Administration events are persisted to AuditLog with a stable shape
 * so we can move to a dedicated MedicationAdministration table later
 * without rewriting callers (the AuditLog payload mirrors the columns
 * we'd add). This avoids a schema migration during the parallel
 * Phase-8 track work and keeps the module shippable.
 *
 * Top-200 conventional formulary lives at /data/formulary.json so the
 * MA can pick a med even when the patient's PatientMedication list is
 * incomplete. Cannabis formulary continues to come from CannabisProduct
 * (live, per-org) so this module bridges both worlds.
 */

export const EMAR_AUDIT_ACTION = "med.administered";

export interface AdministrationEvent {
  patientMedicationId?: string | null;
  cannabisRegimenId?: string | null;
  /** Free-text label when neither FK is set (e.g. one-off in-clinic dose). */
  medicationLabel: string;
  /** Quantity actually administered. */
  amount: number;
  unit: string;
  route: string;
  /** Optional indication for this dose, e.g. "PRN headache". */
  indication?: string | null;
  notes?: string | null;
  administeredAtIso: string;
}

export interface AdministrationRecord extends AdministrationEvent {
  id: string;
  administeredByUserId: string;
  administeredByName: string | null;
}

/**
 * Decode a stored AuditLog row back into the administration shape. Kept
 * here so the page component doesn't need to know about the AuditLog
 * shim — when we cut over to a real MedicationAdministration table, we
 * delete this and update the queries.
 */
export function decodeAdministrationLog(row: {
  id: string;
  actorUserId: string;
  actor?: { firstName: string | null; lastName: string | null } | null;
  metadata: unknown;
  createdAt: Date;
}): AdministrationRecord | null {
  if (!row.metadata || typeof row.metadata !== "object") return null;
  const m = row.metadata as Record<string, unknown>;
  if (typeof m.medicationLabel !== "string") return null;
  return {
    id: row.id,
    patientMedicationId: typeof m.patientMedicationId === "string" ? m.patientMedicationId : null,
    cannabisRegimenId: typeof m.cannabisRegimenId === "string" ? m.cannabisRegimenId : null,
    medicationLabel: m.medicationLabel,
    amount: typeof m.amount === "number" ? m.amount : 0,
    unit: typeof m.unit === "string" ? m.unit : "",
    route: typeof m.route === "string" ? m.route : "oral",
    indication: typeof m.indication === "string" ? m.indication : null,
    notes: typeof m.notes === "string" ? m.notes : null,
    administeredAtIso: typeof m.administeredAtIso === "string"
      ? m.administeredAtIso
      : row.createdAt.toISOString(),
    administeredByUserId: row.actorUserId,
    administeredByName: row.actor
      ? `${row.actor.firstName ?? ""} ${row.actor.lastName ?? ""}`.trim() || null
      : null,
  };
}

/**
 * Top-200 most-prescribed US generics (2024 CMS data, abbreviated for
 * shippable scope). The full pharma API hookup arrives in a follow-up
 * ticket; this list gets the MA started without depending on a network
 * call. Each entry carries its standard adult dosing range so the
 * EMAR can suggest a default amount when the MA picks an unfamiliar
 * med.
 */
export const FORMULARY: ReadonlyArray<{
  generic: string;
  brand?: string;
  defaultDoseMg?: number;
  unit: string;
  route: "oral" | "iv" | "im" | "topical" | "subq" | "inhaled" | "sublingual";
}> = [
  { generic: "atorvastatin", brand: "Lipitor", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "levothyroxine", brand: "Synthroid", defaultDoseMg: 50, unit: "mcg", route: "oral" },
  { generic: "metformin", brand: "Glucophage", defaultDoseMg: 500, unit: "mg", route: "oral" },
  { generic: "lisinopril", brand: "Zestril", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "amlodipine", brand: "Norvasc", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "metoprolol", brand: "Lopressor", defaultDoseMg: 25, unit: "mg", route: "oral" },
  { generic: "omeprazole", brand: "Prilosec", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "simvastatin", brand: "Zocor", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "losartan", brand: "Cozaar", defaultDoseMg: 50, unit: "mg", route: "oral" },
  { generic: "albuterol", brand: "ProAir", defaultDoseMg: 90, unit: "mcg", route: "inhaled" },
  { generic: "gabapentin", brand: "Neurontin", defaultDoseMg: 300, unit: "mg", route: "oral" },
  { generic: "hydrochlorothiazide", brand: "HCTZ", defaultDoseMg: 25, unit: "mg", route: "oral" },
  { generic: "sertraline", brand: "Zoloft", defaultDoseMg: 50, unit: "mg", route: "oral" },
  { generic: "fluoxetine", brand: "Prozac", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "escitalopram", brand: "Lexapro", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "citalopram", brand: "Celexa", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "trazodone", brand: "Desyrel", defaultDoseMg: 50, unit: "mg", route: "oral" },
  { generic: "duloxetine", brand: "Cymbalta", defaultDoseMg: 30, unit: "mg", route: "oral" },
  { generic: "bupropion", brand: "Wellbutrin", defaultDoseMg: 150, unit: "mg", route: "oral" },
  { generic: "tramadol", brand: "Ultram", defaultDoseMg: 50, unit: "mg", route: "oral" },
  { generic: "ibuprofen", brand: "Advil", defaultDoseMg: 400, unit: "mg", route: "oral" },
  { generic: "acetaminophen", brand: "Tylenol", defaultDoseMg: 500, unit: "mg", route: "oral" },
  { generic: "naproxen", brand: "Aleve", defaultDoseMg: 250, unit: "mg", route: "oral" },
  { generic: "prednisone", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "methylprednisolone", brand: "Medrol", defaultDoseMg: 4, unit: "mg", route: "oral" },
  { generic: "furosemide", brand: "Lasix", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "carvedilol", brand: "Coreg", defaultDoseMg: 6.25, unit: "mg", route: "oral" },
  { generic: "warfarin", brand: "Coumadin", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "apixaban", brand: "Eliquis", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "rivaroxaban", brand: "Xarelto", defaultDoseMg: 20, unit: "mg", route: "oral" },
  { generic: "clopidogrel", brand: "Plavix", defaultDoseMg: 75, unit: "mg", route: "oral" },
  { generic: "aspirin", defaultDoseMg: 81, unit: "mg", route: "oral" },
  { generic: "insulin glargine", brand: "Lantus", defaultDoseMg: 10, unit: "units", route: "subq" },
  { generic: "insulin lispro", brand: "Humalog", defaultDoseMg: 4, unit: "units", route: "subq" },
  { generic: "glipizide", brand: "Glucotrol", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "sitagliptin", brand: "Januvia", defaultDoseMg: 100, unit: "mg", route: "oral" },
  { generic: "empagliflozin", brand: "Jardiance", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "semaglutide", brand: "Ozempic", defaultDoseMg: 0.25, unit: "mg", route: "subq" },
  { generic: "tirzepatide", brand: "Mounjaro", defaultDoseMg: 2.5, unit: "mg", route: "subq" },
  { generic: "pantoprazole", brand: "Protonix", defaultDoseMg: 40, unit: "mg", route: "oral" },
  { generic: "ranitidine", brand: "Zantac", defaultDoseMg: 150, unit: "mg", route: "oral" },
  { generic: "cetirizine", brand: "Zyrtec", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "loratadine", brand: "Claritin", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "diphenhydramine", brand: "Benadryl", defaultDoseMg: 25, unit: "mg", route: "oral" },
  { generic: "ondansetron", brand: "Zofran", defaultDoseMg: 4, unit: "mg", route: "oral" },
  { generic: "amoxicillin", defaultDoseMg: 500, unit: "mg", route: "oral" },
  { generic: "azithromycin", brand: "Zithromax", defaultDoseMg: 250, unit: "mg", route: "oral" },
  { generic: "ciprofloxacin", brand: "Cipro", defaultDoseMg: 500, unit: "mg", route: "oral" },
  { generic: "doxycycline", defaultDoseMg: 100, unit: "mg", route: "oral" },
  { generic: "cephalexin", brand: "Keflex", defaultDoseMg: 500, unit: "mg", route: "oral" },
  { generic: "clonazepam", brand: "Klonopin", defaultDoseMg: 0.5, unit: "mg", route: "oral" },
  { generic: "alprazolam", brand: "Xanax", defaultDoseMg: 0.5, unit: "mg", route: "oral" },
  { generic: "lorazepam", brand: "Ativan", defaultDoseMg: 1, unit: "mg", route: "oral" },
  { generic: "zolpidem", brand: "Ambien", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "tamsulosin", brand: "Flomax", defaultDoseMg: 0.4, unit: "mg", route: "oral" },
  { generic: "finasteride", brand: "Propecia", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "sildenafil", brand: "Viagra", defaultDoseMg: 50, unit: "mg", route: "oral" },
  { generic: "tadalafil", brand: "Cialis", defaultDoseMg: 5, unit: "mg", route: "oral" },
  { generic: "montelukast", brand: "Singulair", defaultDoseMg: 10, unit: "mg", route: "oral" },
  { generic: "fluticasone nasal", brand: "Flonase", defaultDoseMg: 50, unit: "mcg", route: "inhaled" },
  { generic: "tiotropium", brand: "Spiriva", defaultDoseMg: 18, unit: "mcg", route: "inhaled" },
  { generic: "budesonide-formoterol", brand: "Symbicort", defaultDoseMg: 80, unit: "mcg", route: "inhaled" },
];

/**
 * Search the formulary by name fragment. Case-insensitive substring
 * match against either the generic or the brand name. Returns the top
 * 12 hits so the picker stays snappy.
 */
export function searchFormulary(query: string) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return FORMULARY.slice(0, 12);
  return FORMULARY.filter(
    (e) =>
      e.generic.toLowerCase().includes(q) ||
      (e.brand?.toLowerCase().includes(q) ?? false),
  ).slice(0, 12);
}

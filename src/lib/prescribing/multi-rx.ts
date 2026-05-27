/**
 * EMR-148 — Multi-Medication Prescribing + Double-Check
 *
 * Helpers for batch e-Rx surfaces:
 *
 *   • `validateBatch` — Zod schema for the prescription set, with
 *     dose/route/frequency required per item.
 *   • `interactionMatrix` — pairwise check across the batch using a
 *     small built-in interaction table. Returns a square matrix the
 *     UI can render as a heat map.
 *   • `findDuplicateTherapy` — flags two meds in the same class
 *     (e.g. two ACE inhibitors) which is almost always an error.
 *   • `lookupFormulary` — formulary tier + prior-auth flag from a
 *     curated list. Real formularies plug in by replacing
 *     `FORMULARY_INDEX`.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

export const prescriptionSchema = z.object({
  /** Stable id provided by the caller — used to link rows in the matrix. */
  id: z.string().min(1),
  /** Generic name. Used as the join key for interaction + formulary checks. */
  name: z.string().min(1),
  dose: z.string().min(1, "Dose is required"),
  route: z.enum(["PO", "SL", "SC", "IM", "IV", "Topical", "Inhaled", "PR"]),
  frequency: z.string().min(1, "Frequency is required"),
  durationDays: z.number().int().positive().optional(),
  /** Free-text notes the clinician adds for the pharmacist. */
  notes: z.string().max(500).optional(),
  /** Cannabis Rx? Drives our cannabis-specific routing later. */
  isCannabis: z.boolean().default(false),
});

export type Prescription = z.infer<typeof prescriptionSchema>;

export const batchSchema = z.object({
  patientId: z.string().min(1),
  encounterId: z.string().min(1),
  prescriptions: z.array(prescriptionSchema).min(1).max(20),
});

export type PrescriptionBatch = z.infer<typeof batchSchema>;

export function validateBatch(input: unknown): {
  ok: boolean;
  data?: PrescriptionBatch;
  errors?: string[];
} {
  const result = batchSchema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  };
}

/* -------------------------------------------------------------------------- */
/* Interaction matrix                                                         */
/* -------------------------------------------------------------------------- */

export type InteractionSeverity = "minor" | "moderate" | "major" | "contraindicated";

export interface InteractionFinding {
  a: string;
  b: string;
  severity: InteractionSeverity;
  rationale: string;
}

interface InteractionRule {
  a: RegExp;
  b: RegExp;
  severity: InteractionSeverity;
  rationale: string;
}

const INTERACTION_RULES: InteractionRule[] = [
  { a: /warfarin/i, b: /ibuprofen|naproxen|aspirin/i, severity: "major", rationale: "Combined GI bleed risk." },
  { a: /warfarin/i, b: /cbd/i, severity: "moderate", rationale: "CBD inhibits CYP2C9 — monitor INR." },
  { a: /sertraline|fluoxetine|escitalopram/i, b: /tramadol|linezolid/i, severity: "contraindicated", rationale: "Serotonin syndrome risk." },
  { a: /sildenafil|tadalafil/i, b: /nitroglycerin|isosorbide/i, severity: "contraindicated", rationale: "Severe hypotension risk." },
  { a: /metformin/i, b: /contrast/i, severity: "major", rationale: "Lactic acidosis risk with iodinated contrast." },
  { a: /clarithromycin|erythromycin/i, b: /simvastatin|atorvastatin/i, severity: "major", rationale: "CYP3A4 inhibition — myopathy risk." },
  { a: /lisinopril|losartan|valsartan/i, b: /spironolactone|potassium/i, severity: "moderate", rationale: "Hyperkalemia risk." },
  { a: /thc/i, b: /clobazam|warfarin/i, severity: "moderate", rationale: "Cannabinoid CYP interaction." },
];

export function checkPair(a: string, b: string): InteractionFinding | null {
  for (const rule of INTERACTION_RULES) {
    if ((rule.a.test(a) && rule.b.test(b)) || (rule.a.test(b) && rule.b.test(a))) {
      return { a, b, severity: rule.severity, rationale: rule.rationale };
    }
  }
  return null;
}

export interface InteractionMatrixCell {
  finding: InteractionFinding | null;
}

export interface InteractionMatrix {
  ids: string[];
  /** matrix[i][j] — symmetric. matrix[i][i] is always null. */
  cells: InteractionMatrixCell[][];
  highestSeverity: InteractionSeverity | null;
  findings: InteractionFinding[];
}

export function interactionMatrix(rxs: Prescription[]): InteractionMatrix {
  const n = rxs.length;
  const cells: InteractionMatrixCell[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => ({ finding: null })),
  );
  const findings: InteractionFinding[] = [];
  let highest: InteractionSeverity | null = null;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const f = checkPair(rxs[i]!.name, rxs[j]!.name);
      if (f) {
        cells[i]![j] = { finding: f };
        cells[j]![i] = { finding: f };
        findings.push(f);
        highest = pickHigher(highest, f.severity);
      }
    }
  }

  return { ids: rxs.map((r) => r.id), cells, highestSeverity: highest, findings };
}

const RANK: Record<InteractionSeverity, number> = {
  minor: 1,
  moderate: 2,
  major: 3,
  contraindicated: 4,
};

function pickHigher(
  a: InteractionSeverity | null,
  b: InteractionSeverity,
): InteractionSeverity {
  if (!a) return b;
  return RANK[b] > RANK[a] ? b : a;
}

/* -------------------------------------------------------------------------- */
/* Duplicate-therapy detection                                                */
/* -------------------------------------------------------------------------- */

export interface DuplicateTherapy {
  className: string;
  members: string[];
}

const DRUG_CLASSES: Array<{ class: string; pattern: RegExp }> = [
  { class: "ACE inhibitor", pattern: /(lisinopril|enalapril|ramipril|benazepril|captopril)/i },
  { class: "ARB", pattern: /(losartan|valsartan|olmesartan|irbesartan|candesartan)/i },
  { class: "Statin", pattern: /(atorvastatin|simvastatin|rosuvastatin|pravastatin|lovastatin)/i },
  { class: "SSRI", pattern: /(sertraline|fluoxetine|escitalopram|citalopram|paroxetine)/i },
  { class: "PPI", pattern: /(omeprazole|pantoprazole|esomeprazole|lansoprazole)/i },
  { class: "Beta blocker", pattern: /(metoprolol|atenolol|carvedilol|propranolol|bisoprolol)/i },
  { class: "Loop diuretic", pattern: /(furosemide|bumetanide|torsemide)/i },
  { class: "Benzodiazepine", pattern: /(alprazolam|lorazepam|clonazepam|diazepam|temazepam)/i },
];

export function findDuplicateTherapy(rxs: Prescription[]): DuplicateTherapy[] {
  const out: DuplicateTherapy[] = [];
  for (const dc of DRUG_CLASSES) {
    const members = rxs.filter((r) => dc.pattern.test(r.name)).map((r) => r.name);
    if (members.length > 1) {
      out.push({ className: dc.class, members });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Formulary lookup (placeholder — replace with real plan data)               */
/* -------------------------------------------------------------------------- */

export type FormularyTier = "preferred" | "non-preferred" | "specialty" | "not-covered";

export interface FormularyEntry {
  tier: FormularyTier;
  /** Estimated patient cost, USD. -1 = unknown. */
  estimatedCost: number;
  priorAuthRequired: boolean;
  /** Plain-language note for the clinician. */
  note?: string;
}

const FORMULARY_INDEX: Array<{ pattern: RegExp; entry: FormularyEntry }> = [
  { pattern: /metformin/i, entry: { tier: "preferred", estimatedCost: 4, priorAuthRequired: false } },
  { pattern: /lisinopril/i, entry: { tier: "preferred", estimatedCost: 4, priorAuthRequired: false } },
  { pattern: /atorvastatin/i, entry: { tier: "preferred", estimatedCost: 6, priorAuthRequired: false } },
  { pattern: /sertraline/i, entry: { tier: "preferred", estimatedCost: 5, priorAuthRequired: false } },
  { pattern: /albuterol/i, entry: { tier: "preferred", estimatedCost: 12, priorAuthRequired: false } },
  { pattern: /ozempic|semaglutide/i, entry: { tier: "specialty", estimatedCost: 850, priorAuthRequired: true, note: "Diabetes diagnosis required for coverage." } },
  { pattern: /humira|adalimumab/i, entry: { tier: "specialty", estimatedCost: 2200, priorAuthRequired: true, note: "PA + step therapy. Specialty pharmacy only." } },
  { pattern: /epidiolex|cannabidiol/i, entry: { tier: "specialty", estimatedCost: 1300, priorAuthRequired: true, note: "FDA-approved for LGS, Dravet, TSC." } },
];

export function lookupFormulary(name: string): FormularyEntry {
  for (const f of FORMULARY_INDEX) if (f.pattern.test(name)) return f.entry;
  return { tier: "non-preferred", estimatedCost: -1, priorAuthRequired: false };
}

/* -------------------------------------------------------------------------- */
/* Aggregate double-check report                                              */
/* -------------------------------------------------------------------------- */

export interface DoubleCheckReport {
  matrix: InteractionMatrix;
  duplicates: DuplicateTherapy[];
  formulary: Array<{ id: string; name: string; entry: FormularyEntry }>;
  /** True iff the batch is safe to send without an override. */
  safeToSend: boolean;
  /**
   * True when the block is a hard stop that must not be overridable.
   * Currently set for contraindicated interactions and duplicate-class
   * therapy — both of these require the clinician to fix the batch
   * rather than attesting through them.
   */
  hardBlock: boolean;
  /** Highest-severity blocker, if any. */
  blockReason?: string;
}

export function runDoubleCheck(rxs: Prescription[]): DoubleCheckReport {
  const matrix = interactionMatrix(rxs);
  const duplicates = findDuplicateTherapy(rxs);
  const formulary = rxs.map((r) => ({ id: r.id, name: r.name, entry: lookupFormulary(r.name) }));

  let blockReason: string | undefined;
  let hardBlock = false;
  if (matrix.highestSeverity === "contraindicated") {
    blockReason = "Contraindicated interaction in batch — review before sending.";
    hardBlock = true;
  } else if (duplicates.length > 0) {
    blockReason = `Duplicate therapy detected: ${duplicates.map((d) => d.className).join(", ")}.`;
    hardBlock = true;
  }

  return {
    matrix,
    duplicates,
    formulary,
    safeToSend: !blockReason,
    hardBlock,
    blockReason,
  };
}

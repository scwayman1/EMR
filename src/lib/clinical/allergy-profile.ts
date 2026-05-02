/**
 * EMR-113 — Allergies + Contraindications Profile.
 * --------------------------------------------------
 * `Patient.allergies` and `Patient.contraindications` are stored as
 * `String[]` on the schema (intentionally — the existing intake flow
 * captures them as plain text). This module gives that flat list
 * structure: severity, kind (drug / food / environmental), reaction
 * description, and a cross-reference against the patient's active
 * `PatientMedication` rows so the chart can flag the obvious "patient
 * is allergic to penicillin and we just prescribed amoxicillin" case.
 *
 * Pure functions. The component reads/writes via a server action that
 * persists the structured records back into the `String[]` columns
 * using a `JSON-line` encoding so the legacy reader still sees the
 * label as a human-readable string.
 *
 * Structured wire format (one JSON object per array entry, one line):
 *   {"label":"Penicillin","kind":"drug","severity":"severe",
 *    "reaction":"anaphylaxis","onsetYear":2014}
 *
 * If the entry can't be parsed as JSON it's treated as a free-text
 * label (matching the legacy String[] entries already in the wild).
 */

import { z } from "zod";

export type AllergyKind = "drug" | "food" | "environmental" | "latex" | "other";
export type AllergySeverity = "mild" | "moderate" | "severe" | "life-threatening";
export type ContraindicationKind =
  | "interaction"
  | "condition"
  | "lifestyle"
  | "lab-flag"
  | "other";

// ---------------------------------------------------------------------------
// Allergy
// ---------------------------------------------------------------------------

export const AllergySchema = z
  .object({
    label: z.string().min(1).max(160),
    kind: z.enum(["drug", "food", "environmental", "latex", "other"]).default("drug"),
    severity: z
      .enum(["mild", "moderate", "severe", "life-threatening"])
      .default("moderate"),
    reaction: z.string().max(280).optional(),
    onsetYear: z.number().int().min(1900).max(2100).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type AllergyEntry = z.infer<typeof AllergySchema>;

export const ContraindicationSchema = z
  .object({
    label: z.string().min(1).max(160),
    kind: z
      .enum(["interaction", "condition", "lifestyle", "lab-flag", "other"])
      .default("interaction"),
    severity: z
      .enum(["mild", "moderate", "severe", "life-threatening"])
      .default("moderate"),
    notes: z.string().max(500).optional(),
  })
  .strict();

export type ContraindicationEntry = z.infer<typeof ContraindicationSchema>;

// ---------------------------------------------------------------------------
// Encode / decode wire format — keeps Patient.allergies a String[] but
// transparently upgrades each row into structured JSON when the editor
// saves. Legacy entries (plain-string labels) are read as `kind: "other"`.
// ---------------------------------------------------------------------------

export function encodeAllergy(entry: AllergyEntry): string {
  return JSON.stringify(AllergySchema.parse(entry));
}

export function encodeContraindication(entry: ContraindicationEntry): string {
  return JSON.stringify(ContraindicationSchema.parse(entry));
}

export function decodeAllergy(raw: string): AllergyEntry {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      return AllergySchema.parse(obj);
    } catch {
      // fall through to label-only treatment
    }
  }
  return AllergySchema.parse({ label: trimmed, kind: "other", severity: "moderate" });
}

export function decodeContraindication(raw: string): ContraindicationEntry {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      return ContraindicationSchema.parse(obj);
    } catch {
      // fall through
    }
  }
  return ContraindicationSchema.parse({
    label: trimmed,
    kind: "other",
    severity: "moderate",
  });
}

export function decodeAllergies(rows: string[]): AllergyEntry[] {
  return rows.map(decodeAllergy);
}

export function decodeContraindications(rows: string[]): ContraindicationEntry[] {
  return rows.map(decodeContraindication);
}

// ---------------------------------------------------------------------------
// Cross-reference against active medications.
// ---------------------------------------------------------------------------

export interface ActiveMedication {
  id: string;
  name: string;
  /** Generic / molecular name when known — usually the strongest cross-ref signal. */
  genericName?: string | null;
}

export interface CrossReferenceHit {
  allergyLabel: string;
  medicationId: string;
  medicationName: string;
  /** "exact" when the allergy label matches the med name verbatim;
   *  "family" when it matches one of the cross-class keywords below. */
  matchKind: "exact" | "family";
  severity: AllergySeverity;
}

/**
 * Cross-class keyword expansion. Keep this small + curated; the goal is
 * to catch the obvious "penicillin allergy → amoxicillin Rx" case, not
 * to be a full interaction database (that lives in `lib/clinical/interactions`).
 */
const FAMILY_KEYWORDS: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "penicillin", "augmentin", "dicloxacillin"],
  sulfa: ["sulfamethoxazole", "bactrim", "sulfasalazine"],
  cephalosporin: ["cephalexin", "ceftriaxone", "cefdinir", "cefuroxime"],
  nsaid: ["ibuprofen", "naproxen", "diclofenac", "aspirin", "celecoxib"],
  opioid: ["oxycodone", "hydrocodone", "morphine", "codeine", "fentanyl"],
  benzodiazepine: ["lorazepam", "alprazolam", "diazepam", "clonazepam"],
  ssri: ["fluoxetine", "sertraline", "citalopram", "escitalopram", "paroxetine"],
  statin: ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin"],
  ace: ["lisinopril", "enalapril", "ramipril"],
};

function familyKeyword(label: string): string | null {
  const lower = label.toLowerCase();
  for (const family of Object.keys(FAMILY_KEYWORDS)) {
    if (lower.includes(family)) return family;
  }
  return null;
}

function medMatchesFamily(med: ActiveMedication, family: string): boolean {
  const aliases = FAMILY_KEYWORDS[family] ?? [];
  const targets = [med.name, med.genericName ?? ""].map((s) => s.toLowerCase());
  return aliases.some((alias) =>
    targets.some((t) => t.includes(alias.toLowerCase())),
  );
}

export function crossReferenceWithMedications(
  allergies: AllergyEntry[],
  activeMedications: ActiveMedication[],
): CrossReferenceHit[] {
  const hits: CrossReferenceHit[] = [];
  for (const allergy of allergies) {
    const labelLower = allergy.label.toLowerCase();
    const family = familyKeyword(allergy.label);

    for (const med of activeMedications) {
      const medNameLower = med.name.toLowerCase();
      const genericLower = (med.genericName ?? "").toLowerCase();

      if (medNameLower === labelLower || genericLower === labelLower) {
        hits.push({
          allergyLabel: allergy.label,
          medicationId: med.id,
          medicationName: med.name,
          matchKind: "exact",
          severity: allergy.severity,
        });
        continue;
      }

      if (family && medMatchesFamily(med, family)) {
        hits.push({
          allergyLabel: allergy.label,
          medicationId: med.id,
          medicationName: med.name,
          matchKind: "family",
          severity: allergy.severity,
        });
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Chart-badge summary — the count + worst severity that the patient header
// renders inline.
// ---------------------------------------------------------------------------

export interface ChartAlertBadge {
  allergyCount: number;
  contraindicationCount: number;
  worstSeverity: AllergySeverity | null;
  /** True when at least one cross-ref hit exists — drives the red ring. */
  hasActiveCrossRef: boolean;
  /** Short text the badge shows on hover. */
  hoverText: string;
}

const SEVERITY_RANK: Record<AllergySeverity, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  "life-threatening": 4,
};

export function buildChartAlertBadge(
  allergies: AllergyEntry[],
  contraindications: ContraindicationEntry[],
  crossRefs: CrossReferenceHit[],
): ChartAlertBadge {
  let worst: AllergySeverity | null = null;
  for (const a of allergies) {
    if (worst === null || SEVERITY_RANK[a.severity] > SEVERITY_RANK[worst]) {
      worst = a.severity;
    }
  }

  const parts: string[] = [];
  if (allergies.length) parts.push(`${allergies.length} allergy${allergies.length === 1 ? "" : "ies"}`);
  if (contraindications.length)
    parts.push(`${contraindications.length} contraindication${contraindications.length === 1 ? "" : "s"}`);
  if (crossRefs.length)
    parts.push(`${crossRefs.length} active cross-ref${crossRefs.length === 1 ? "" : "s"}`);

  return {
    allergyCount: allergies.length,
    contraindicationCount: contraindications.length,
    worstSeverity: worst,
    hasActiveCrossRef: crossRefs.length > 0,
    hoverText: parts.length === 0 ? "No allergies on file" : parts.join(" · "),
  };
}

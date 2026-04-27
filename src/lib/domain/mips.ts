// ---------------------------------------------------------------------------
// MIPS Quality Measure Extrapolation Service (EMR-042)
// ---------------------------------------------------------------------------
// Parses finalized clinical notes + structured patient data and counts
// numerator / denominator hits for the MIPS quality measures Leafjourney
// reports under the Medicare Quality Payment Program.
//
// MIPS reporting requires, for each measure:
//   • Eligible population (denominator)        — patients who match the measure
//   • Numerator                                  — patients who received the action
//   • Performance rate                           — numerator / (denominator − exclusions)
//
// This service runs over a date range and emits per-measure counts that can
// be exported for the QPP submission file or surfaced in the operator
// dashboard. It deliberately uses simple string matching against finalized
// notes — the bar for MIPS is "the documentation supports it", not "the LLM
// decided so". A higher-fidelity LLM-assisted pass can layer on top later.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db/prisma";
import type { Note, Patient, OutcomeLog } from "@prisma/client";

// ---------------------------------------------------------------------------
// Measure definitions
// ---------------------------------------------------------------------------
// Each measure declares the Quality Payment Program identifiers (CMS eCQM ID
// and the legacy MIPS Quality ID), an English description, and pure-function
// predicates for denominator (eligibility), numerator (action documented),
// and exception (allowed exclusions).
// ---------------------------------------------------------------------------

export interface MipsMeasureContext {
  patient: Patient;
  notes: Note[]; // finalized notes within the reporting period
  outcomes: OutcomeLog[];
  // CCM codes and ICD-10 hits collected once per patient for fast matching.
  icd10Codes: Set<string>;
  noteText: string; // concatenated finalized-note bodies (lowercased)
}

export interface MipsMeasure {
  measureId: string; // e.g. "Q001" (legacy MIPS) or "CMS68v12"
  legacyId?: string; // legacy MIPS Quality ID
  ecqmId?: string;
  domain: "clinical_process" | "patient_safety" | "communication" | "preventive" | "outcome";
  title: string;
  description: string;
  inDenominator: (ctx: MipsMeasureContext) => boolean;
  inNumerator: (ctx: MipsMeasureContext) => boolean;
  inException?: (ctx: MipsMeasureContext) => boolean;
}

// Helper: did any finalized note in the period mention X?
function noteMentions(ctx: MipsMeasureContext, ...patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(ctx.noteText));
}

// Patient age at the start of the reporting period.
function ageAt(patient: Patient, asOf: Date): number | null {
  if (!patient.dateOfBirth) return null;
  const ms = asOf.getTime() - patient.dateOfBirth.getTime();
  return Math.floor(ms / (365.25 * 86_400_000));
}

// ---------------------------------------------------------------------------
// Cannabis-care MIPS measure pack — chosen for an ambulatory cannabis clinic.
// These are real CMS measures we can score with note-level evidence:
// ---------------------------------------------------------------------------

export const MIPS_MEASURES: MipsMeasure[] = [
  {
    measureId: "Q128",
    legacyId: "128",
    ecqmId: "CMS69v12",
    domain: "clinical_process",
    title: "Preventive Care: BMI Screening and Follow-Up",
    description:
      "% of patients ≥18 with a documented BMI during the encounter and a follow-up plan when out of range.",
    inDenominator: (ctx) => (ageAt(ctx.patient, new Date()) ?? 0) >= 18 && ctx.notes.length > 0,
    inNumerator: (ctx) =>
      noteMentions(ctx, /\bbmi\b[^a-z0-9]*\d{1,2}(\.\d+)?/i) ||
      noteMentions(ctx, /body\s+mass\s+index/i),
    inException: (ctx) =>
      noteMentions(ctx, /unable to obtain bmi|bmi not measured due to/i),
  },
  {
    measureId: "Q226",
    legacyId: "226",
    ecqmId: "CMS138v12",
    domain: "preventive",
    title: "Tobacco Use: Screening and Cessation Intervention",
    description:
      "% of patients ≥18 screened for tobacco use AND received cessation counseling if a user.",
    inDenominator: (ctx) => (ageAt(ctx.patient, new Date()) ?? 0) >= 18 && ctx.notes.length > 0,
    inNumerator: (ctx) =>
      noteMentions(ctx, /tobacco use:?\s*(non[-\s]?user|never|no|denies)/i) ||
      noteMentions(ctx, /(smok|tobacco)[^.]{0,40}(cessation|counsel|advised to quit|nrt)/i),
  },
  {
    measureId: "Q134",
    legacyId: "134",
    ecqmId: "CMS2v13",
    domain: "preventive",
    title: "Preventive Care: Screening for Depression and Follow-Up",
    description:
      "% of patients ≥12 screened for depression with a standardized tool AND a follow-up plan if positive.",
    inDenominator: (ctx) => (ageAt(ctx.patient, new Date()) ?? 0) >= 12 && ctx.notes.length > 0,
    inNumerator: (ctx) =>
      noteMentions(ctx, /\bphq[-\s]?9\b/i, /\bphq[-\s]?2\b/i, /depression screen(ing)?/i),
  },
  {
    measureId: "Q130",
    legacyId: "130",
    ecqmId: "CMS68v12",
    domain: "patient_safety",
    title: "Documentation of Current Medications in the Medical Record",
    description:
      "% of visits for patients ≥18 with a complete documented medication list.",
    inDenominator: (ctx) => (ageAt(ctx.patient, new Date()) ?? 0) >= 18 && ctx.notes.length > 0,
    inNumerator: (ctx) =>
      noteMentions(
        ctx,
        /current medications:|medication reconciliation|medication list reviewed/i,
      ),
  },
  {
    measureId: "Q236",
    legacyId: "236",
    ecqmId: "CMS165v12",
    domain: "outcome",
    title: "Controlling High Blood Pressure",
    description:
      "% of patients 18–85 with hypertension whose most recent BP is <140/90.",
    inDenominator: (ctx) => {
      const age = ageAt(ctx.patient, new Date()) ?? 0;
      return age >= 18 && age <= 85 && (ctx.icd10Codes.has("I10") || /hypertension/i.test(ctx.noteText));
    },
    inNumerator: (ctx) => {
      const m = ctx.noteText.match(/bp[^\d]{0,5}(\d{2,3})\s*\/\s*(\d{2,3})/i);
      if (!m) return false;
      const sys = Number(m[1]);
      const dia = Number(m[2]);
      return sys < 140 && dia < 90;
    },
  },
  {
    measureId: "Q431",
    legacyId: "431",
    ecqmId: "CMS137v12",
    domain: "communication",
    title: "Preventive Care: Unhealthy Alcohol Use Screening & Brief Counseling",
    description:
      "% of patients ≥18 screened for unhealthy alcohol use, with brief counseling if positive.",
    inDenominator: (ctx) => (ageAt(ctx.patient, new Date()) ?? 0) >= 18 && ctx.notes.length > 0,
    inNumerator: (ctx) =>
      noteMentions(ctx, /audit[-\s]?c|alcohol screen|alcohol use:?\s*\d+\s*drinks/i),
  },
  {
    measureId: "CB001",
    domain: "clinical_process",
    title: "Cannabis: Counseling on Risks/Benefits Documented",
    description:
      "% of cannabis-prescribing visits where risks/benefits counseling is documented (Z71.89).",
    inDenominator: (ctx) =>
      ctx.icd10Codes.has("Z71.89") ||
      Array.from(ctx.icd10Codes).some((c) => c.startsWith("F12")),
    inNumerator: (ctx) =>
      noteMentions(
        ctx,
        /risks?\s+and\s+benefits|patient counseled|cannabis (counseling|education)/i,
      ),
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface MipsReportInput {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  /** Optional cap — primarily for testing on large orgs. */
  patientLimit?: number;
}

export interface MipsMeasureResult {
  measureId: string;
  title: string;
  domain: MipsMeasure["domain"];
  denominator: number;
  numerator: number;
  exceptions: number;
  performanceRate: number; // 0-1
  performanceRatePct: string; // "67.4%"
}

export interface MipsReport {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  patientCount: number;
  encounterCount: number;
  measures: MipsMeasureResult[];
  generatedAt: Date;
}

/**
 * Build a MIPS report for an organization over a period. Iterates eligible
 * patients, hydrates their notes/outcomes, and counts numerator/denominator
 * hits across every registered measure.
 */
export async function generateMipsReport(input: MipsReportInput): Promise<MipsReport> {
  const { organizationId, periodStart, periodEnd, patientLimit } = input;

  const patients = await prisma.patient.findMany({
    where: {
      organizationId,
      deletedAt: null,
      encounters: {
        some: {
          completedAt: { gte: periodStart, lte: periodEnd },
        },
      },
    },
    take: patientLimit,
  });

  let encounterCount = 0;
  const counts: Record<
    string,
    { denominator: number; numerator: number; exceptions: number }
  > = {};
  for (const m of MIPS_MEASURES) {
    counts[m.measureId] = { denominator: 0, numerator: 0, exceptions: 0 };
  }

  for (const patient of patients) {
    const encounters = await prisma.encounter.findMany({
      where: {
        patientId: patient.id,
        completedAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        notes: { where: { status: "finalized" } },
      },
    });
    encounterCount += encounters.length;
    if (encounters.length === 0) continue;

    const notes: Note[] = encounters.flatMap((e) => e.notes);
    if (notes.length === 0) continue;

    const noteText = notes
      .map((n) => {
        const blocks = Array.isArray(n.blocks) ? (n.blocks as any[]) : [];
        return blocks.map((b) => `${b.heading ?? ""} ${b.body ?? ""}`).join(" ");
      })
      .join(" ")
      .toLowerCase();

    // Pull ICD-10 codes from any CodingSuggestion attached to the patient's notes.
    const codingSuggestions = await prisma.codingSuggestion.findMany({
      where: { noteId: { in: notes.map((n) => n.id) } },
    });
    const icd10Codes = new Set<string>();
    for (const cs of codingSuggestions) {
      const codes = Array.isArray(cs.icd10) ? (cs.icd10 as any[]) : [];
      for (const c of codes) if (c?.code) icd10Codes.add(String(c.code));
    }

    const outcomes = await prisma.outcomeLog.findMany({
      where: {
        patientId: patient.id,
        loggedAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const ctx: MipsMeasureContext = {
      patient,
      notes,
      outcomes,
      icd10Codes,
      noteText,
    };

    for (const measure of MIPS_MEASURES) {
      if (!measure.inDenominator(ctx)) continue;
      const bucket = counts[measure.measureId];
      bucket.denominator++;
      if (measure.inException?.(ctx)) {
        bucket.exceptions++;
        continue;
      }
      if (measure.inNumerator(ctx)) bucket.numerator++;
    }
  }

  const measures: MipsMeasureResult[] = MIPS_MEASURES.map((m) => {
    const c = counts[m.measureId];
    const eligible = Math.max(0, c.denominator - c.exceptions);
    const rate = eligible === 0 ? 0 : c.numerator / eligible;
    return {
      measureId: m.measureId,
      title: m.title,
      domain: m.domain,
      denominator: c.denominator,
      numerator: c.numerator,
      exceptions: c.exceptions,
      performanceRate: rate,
      performanceRatePct: `${(rate * 100).toFixed(1)}%`,
    };
  });

  return {
    organizationId,
    periodStart,
    periodEnd,
    patientCount: patients.length,
    encounterCount,
    measures,
    generatedAt: new Date(),
  };
}

/**
 * Score a single patient against the measure pack. Useful for the chart
 * "MIPS readiness" widget and for unit testing measure logic.
 */
export async function scorePatientForMips(
  patientId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<Array<{ measureId: string; inDenominator: boolean; inNumerator: boolean; inException: boolean }>> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new Error(`Patient ${patientId} not found`);

  const encounters = await prisma.encounter.findMany({
    where: {
      patientId,
      completedAt: { gte: periodStart, lte: periodEnd },
    },
    include: { notes: { where: { status: "finalized" } } },
  });
  const notes: Note[] = encounters.flatMap((e) => e.notes);

  const noteText = notes
    .map((n) => {
      const blocks = Array.isArray(n.blocks) ? (n.blocks as any[]) : [];
      return blocks.map((b) => `${b.heading ?? ""} ${b.body ?? ""}`).join(" ");
    })
    .join(" ")
    .toLowerCase();

  const codingSuggestions = await prisma.codingSuggestion.findMany({
    where: { noteId: { in: notes.map((n) => n.id) } },
  });
  const icd10Codes = new Set<string>();
  for (const cs of codingSuggestions) {
    const codes = Array.isArray(cs.icd10) ? (cs.icd10 as any[]) : [];
    for (const c of codes) if (c?.code) icd10Codes.add(String(c.code));
  }

  const outcomes = await prisma.outcomeLog.findMany({
    where: { patientId, loggedAt: { gte: periodStart, lte: periodEnd } },
  });

  const ctx: MipsMeasureContext = { patient, notes, outcomes, icd10Codes, noteText };

  return MIPS_MEASURES.map((m) => ({
    measureId: m.measureId,
    inDenominator: m.inDenominator(ctx),
    inNumerator: m.inNumerator(ctx),
    inException: !!m.inException?.(ctx),
  }));
}

/**
 * Export a MIPS report as a CMS QPP-style submission row set. Returns flat
 * rows the operator can hand to a QPP submission tool. The QPP file format
 * is fully specified at qpp.cms.gov; this returns the per-measure
 * performance-rate rows that the form needs.
 */
export function toQppRows(report: MipsReport): Array<Record<string, string | number>> {
  return report.measures.map((m) => ({
    measureId: m.measureId,
    title: m.title,
    domain: m.domain,
    periodStart: report.periodStart.toISOString().slice(0, 10),
    periodEnd: report.periodEnd.toISOString().slice(0, 10),
    denominator: m.denominator,
    numerator: m.numerator,
    exceptions: m.exceptions,
    performanceRate: m.performanceRatePct,
  }));
}

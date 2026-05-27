/**
 * EMR-042 — MIPS / MACRA quality measure extrapolation.
 *
 * The Merit-based Incentive Payment System has four categories — Quality
 * (45%), Promoting Interoperability (25%), Improvement Activities (15%),
 * and Cost (15%). For a small cannabis-first practice, the categories
 * that move the needle are Quality and Promoting Interoperability;
 * Improvement Activities is largely attestation-based.
 *
 * This module is the rules engine. Given a roster of patients and their
 * encounters, observations, dose logs and screenings, it returns:
 *
 *   - The performance numerator/denominator per measure
 *   - The composite MIPS score (0-100)
 *   - The category-by-category breakdown
 *   - The patients who blocked each measure (so ops can chase them)
 *
 * The schema is conservative — only measures that are realistic for a
 * cannabis-medicine clinic are included. The CMS measure ids are real
 * (Quality ID 130, 226, etc.) so when we wire this to QPP submission the
 * mapping is one-to-one.
 */
import { z } from "zod";

export type MipsCategory =
  | "quality"
  | "promoting_interoperability"
  | "improvement_activities"
  | "cost";

export interface MipsMeasure {
  id: string;
  /** CMS Quality ID number when applicable. */
  cmsId?: string;
  category: MipsCategory;
  title: string;
  description: string;
  /** Out of 10 — how this contributes to the category score. */
  weight: number;
  /** Inverse measures are scored where lower percent = better (e.g. ED visits). */
  inverse?: boolean;
}

export const MIPS_MEASURES: MipsMeasure[] = [
  // ─── Quality ──────────────────────────────────────────────
  {
    id: "Q130",
    cmsId: "130",
    category: "quality",
    title: "Documentation of current medications",
    description:
      "Percentage of visits with a complete, reconciled medication list captured in the chart.",
    weight: 10,
  },
  {
    id: "Q226",
    cmsId: "226",
    category: "quality",
    title: "Tobacco use screening + cessation",
    description:
      "Percentage of patients ≥18 screened for tobacco use, with cessation counseling when positive.",
    weight: 10,
  },
  {
    id: "Q128",
    cmsId: "128",
    category: "quality",
    title: "Body Mass Index screening + follow-up",
    description: "Documented BMI and follow-up plan when out of range.",
    weight: 8,
  },
  {
    id: "Q236",
    cmsId: "236",
    category: "quality",
    title: "Controlling High Blood Pressure",
    description:
      "Percentage of hypertensive patients whose most recent BP is < 140/90.",
    weight: 10,
  },
  {
    id: "QCB1",
    category: "quality",
    title: "Cannabis Adverse Event Capture (custom)",
    description:
      "Percentage of cannabis dose logs followed by an outcome rating within 72 hours.",
    weight: 8,
  },
  // ─── Promoting Interoperability ───────────────────────────
  {
    id: "PI-EP-1",
    category: "promoting_interoperability",
    title: "e-Prescribing",
    description: "Percentage of permissible prescriptions sent electronically.",
    weight: 10,
  },
  {
    id: "PI-PEA-2",
    category: "promoting_interoperability",
    title: "Patient electronic access",
    description:
      "Percentage of patients with timely access to their record via the portal.",
    weight: 10,
  },
  {
    id: "PI-HIE-3",
    category: "promoting_interoperability",
    title: "Health information exchange (sent)",
    description:
      "Percentage of referrals where a summary of care record was sent electronically.",
    weight: 10,
  },
  // ─── Improvement Activities ───────────────────────────────
  {
    id: "IA-PSPA",
    category: "improvement_activities",
    title: "Annual registry contribution",
    description:
      "Practice contributes data to the Cannabis Outcomes Registry (RWE export).",
    weight: 5,
  },
  {
    id: "IA-CCM",
    category: "improvement_activities",
    title: "Care coordination — cannabis",
    description:
      "Documented warm handoff between primary care and cannabis specialist on each new patient.",
    weight: 5,
  },
  // ─── Cost (claims-based; we leave it pre-populated) ───────
  {
    id: "C-TPCC",
    category: "cost",
    title: "Total per capita cost",
    description: "Risk-adjusted Medicare cost per beneficiary.",
    weight: 5,
  },
];

// ---------------------------------------------------------------------------
// Input shape — what the extrapolator agent (or manual ingest) feeds in.
// ---------------------------------------------------------------------------

export const mipsCohortInputSchema = z.object({
  reportingPeriodStart: z.string(),
  reportingPeriodEnd: z.string(),
  patients: z.array(
    z.object({
      id: z.string(),
      ageYears: z.number().nullable(),
      hasMedicationList: z.boolean(),
      tobaccoScreened: z.boolean(),
      tobaccoPositive: z.boolean().nullable(),
      tobaccoCessationOffered: z.boolean(),
      bmiCaptured: z.boolean(),
      bmiOutOfRangePlan: z.boolean(),
      hypertensive: z.boolean(),
      mostRecentSystolic: z.number().nullable(),
      mostRecentDiastolic: z.number().nullable(),
      doseLogsLast90: z.number(),
      doseLogsWithFollowupOutcome: z.number(),
      ePrescriptionsLast90: z.number(),
      paperPrescriptionsLast90: z.number(),
      portalActivatedAt: z.string().nullable(),
      referralsSentLast90: z.number(),
      referralsWithSummaryOfCare: z.number(),
      contributedToRegistry: z.boolean(),
      warmHandoffDocumented: z.boolean(),
    }),
  ),
});

export type MipsCohortInput = z.infer<typeof mipsCohortInputSchema>;

// ---------------------------------------------------------------------------
// Output shape
// ---------------------------------------------------------------------------

export interface MeasureResult {
  measureId: string;
  category: MipsCategory;
  title: string;
  numerator: number;
  denominator: number;
  performance: number; // 0..1
  scorePoints: number; // 0..weight
  blockers: string[]; // patient ids that hurt the measure
}

export interface CategoryRollup {
  category: MipsCategory;
  scorePoints: number;
  scorePossible: number;
  weightedScore: number; // % contribution to composite
}

export interface MipsExtrapolationResult {
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  totalPatients: number;
  measures: MeasureResult[];
  categories: CategoryRollup[];
  /** Composite MIPS score (0..100) */
  compositeScore: number;
  /** Category weight contributions used to compute composite. */
  categoryWeights: Record<MipsCategory, number>;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const CATEGORY_WEIGHTS: Record<MipsCategory, number> = {
  quality: 0.45,
  promoting_interoperability: 0.25,
  improvement_activities: 0.15,
  cost: 0.15,
};

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function extrapolate(input: MipsCohortInput): MipsExtrapolationResult {
  const patients = input.patients;
  const total = patients.length;
  const measures: MeasureResult[] = [];

  function addMeasure(
    measureId: string,
    numerator: number,
    denominator: number,
    blockers: string[],
  ) {
    const def = MIPS_MEASURES.find((m) => m.id === measureId)!;
    const performance = pct(numerator, denominator);
    const score = (def.inverse ? 1 - performance : performance) * def.weight;
    measures.push({
      measureId,
      category: def.category,
      title: def.title,
      numerator,
      denominator,
      performance,
      scorePoints: Math.round(score * 100) / 100,
      blockers: blockers.slice(0, 25),
    });
  }

  // Q130 — Medication list documented
  {
    const eligible = patients;
    const num = eligible.filter((p) => p.hasMedicationList).length;
    addMeasure(
      "Q130",
      num,
      eligible.length,
      eligible.filter((p) => !p.hasMedicationList).map((p) => p.id),
    );
  }

  // Q226 — Tobacco screening + cessation
  {
    const eligible = patients.filter((p) => (p.ageYears ?? 0) >= 18);
    const passes = eligible.filter(
      (p) =>
        p.tobaccoScreened &&
        (p.tobaccoPositive === false || p.tobaccoCessationOffered),
    );
    addMeasure(
      "Q226",
      passes.length,
      eligible.length,
      eligible
        .filter((p) => !passes.includes(p))
        .map((p) => p.id),
    );
  }

  // Q128 — BMI screening + follow-up
  {
    const eligible = patients;
    const num = eligible.filter(
      (p) => p.bmiCaptured && (p.bmiOutOfRangePlan || true),
    ).length;
    addMeasure(
      "Q128",
      num,
      eligible.length,
      eligible.filter((p) => !p.bmiCaptured).map((p) => p.id),
    );
  }

  // Q236 — Controlling High Blood Pressure
  {
    const eligible = patients.filter((p) => p.hypertensive);
    const num = eligible.filter(
      (p) =>
        (p.mostRecentSystolic ?? 999) < 140 &&
        (p.mostRecentDiastolic ?? 999) < 90,
    ).length;
    addMeasure(
      "Q236",
      num,
      eligible.length,
      eligible
        .filter(
          (p) =>
            (p.mostRecentSystolic ?? 999) >= 140 ||
            (p.mostRecentDiastolic ?? 999) >= 90,
        )
        .map((p) => p.id),
    );
  }

  // QCB1 — Cannabis Adverse Event Capture
  {
    const totalLogs = patients.reduce((acc, p) => acc + p.doseLogsLast90, 0);
    const followups = patients.reduce(
      (acc, p) => acc + p.doseLogsWithFollowupOutcome,
      0,
    );
    addMeasure(
      "QCB1",
      followups,
      totalLogs,
      patients
        .filter(
          (p) => p.doseLogsLast90 > 0 && p.doseLogsWithFollowupOutcome === 0,
        )
        .map((p) => p.id),
    );
  }

  // PI-EP-1 — e-Prescribing
  {
    const totalRx = patients.reduce(
      (acc, p) => acc + p.ePrescriptionsLast90 + p.paperPrescriptionsLast90,
      0,
    );
    const eRx = patients.reduce((acc, p) => acc + p.ePrescriptionsLast90, 0);
    addMeasure(
      "PI-EP-1",
      eRx,
      totalRx,
      patients
        .filter((p) => p.paperPrescriptionsLast90 > 0)
        .map((p) => p.id),
    );
  }

  // PI-PEA-2 — Patient electronic access
  {
    const num = patients.filter((p) => p.portalActivatedAt).length;
    addMeasure(
      "PI-PEA-2",
      num,
      patients.length,
      patients.filter((p) => !p.portalActivatedAt).map((p) => p.id),
    );
  }

  // PI-HIE-3 — HIE sent
  {
    const totalReferrals = patients.reduce(
      (acc, p) => acc + p.referralsSentLast90,
      0,
    );
    const summaries = patients.reduce(
      (acc, p) => acc + p.referralsWithSummaryOfCare,
      0,
    );
    addMeasure(
      "PI-HIE-3",
      summaries,
      totalReferrals,
      patients
        .filter(
          (p) =>
            p.referralsSentLast90 > 0 &&
            p.referralsWithSummaryOfCare < p.referralsSentLast90,
        )
        .map((p) => p.id),
    );
  }

  // IA-PSPA — Annual registry contribution
  {
    const num = patients.filter((p) => p.contributedToRegistry).length;
    addMeasure(
      "IA-PSPA",
      num,
      patients.length,
      patients
        .filter((p) => !p.contributedToRegistry)
        .map((p) => p.id),
    );
  }

  // IA-CCM — Care coordination
  {
    const num = patients.filter((p) => p.warmHandoffDocumented).length;
    addMeasure(
      "IA-CCM",
      num,
      patients.length,
      patients
        .filter((p) => !p.warmHandoffDocumented)
        .map((p) => p.id),
    );
  }

  // C-TPCC — placeholder (claims-based; CMS supplies actual)
  {
    const def = MIPS_MEASURES.find((m) => m.id === "C-TPCC")!;
    measures.push({
      measureId: "C-TPCC",
      category: "cost",
      title: def.title,
      numerator: 0,
      denominator: 0,
      performance: 0.5,
      scorePoints: def.weight * 0.5,
      blockers: [],
    });
  }

  // Roll up by category
  const categories: CategoryRollup[] = (
    Object.keys(CATEGORY_WEIGHTS) as MipsCategory[]
  ).map((category) => {
    const inCat = measures.filter((m) => m.category === category);
    const points = inCat.reduce((acc, m) => acc + m.scorePoints, 0);
    const possible = MIPS_MEASURES.filter((m) => m.category === category)
      .reduce((acc, m) => acc + m.weight, 0);
    return {
      category,
      scorePoints: Math.round(points * 100) / 100,
      scorePossible: possible,
      weightedScore:
        possible > 0
          ? Math.round((points / possible) * CATEGORY_WEIGHTS[category] * 100 * 100) / 100
          : 0,
    };
  });

  const composite = categories.reduce(
    (acc, c) => acc + c.weightedScore,
    0,
  );

  return {
    reportingPeriodStart: input.reportingPeriodStart,
    reportingPeriodEnd: input.reportingPeriodEnd,
    totalPatients: total,
    measures,
    categories,
    compositeScore: Math.round(composite * 100) / 100,
    categoryWeights: CATEGORY_WEIGHTS,
  };
}

/** Demo cohort for fixture / preview rendering. Not used in production. */
export function demoCohort(): MipsCohortInput {
  const ids = Array.from({ length: 30 }, (_, i) => `pt-${(i + 1).toString().padStart(3, "0")}`);
  return {
    reportingPeriodStart: "2026-01-01",
    reportingPeriodEnd: "2026-03-31",
    patients: ids.map((id, i) => ({
      id,
      ageYears: 18 + (i * 7) % 70,
      hasMedicationList: i % 7 !== 0,
      tobaccoScreened: i % 5 !== 0,
      tobaccoPositive: i % 11 === 0,
      tobaccoCessationOffered: i % 11 !== 0,
      bmiCaptured: i % 6 !== 0,
      bmiOutOfRangePlan: true,
      hypertensive: i % 4 === 0,
      mostRecentSystolic: i % 4 === 0 ? 132 + (i % 30) : null,
      mostRecentDiastolic: i % 4 === 0 ? 84 + (i % 12) : null,
      doseLogsLast90: 1 + (i % 8),
      doseLogsWithFollowupOutcome: i % 8 === 0 ? 0 : 1 + (i % 6),
      ePrescriptionsLast90: 2 + (i % 5),
      paperPrescriptionsLast90: i % 13 === 0 ? 1 : 0,
      portalActivatedAt: i % 9 === 0 ? null : "2026-02-01",
      referralsSentLast90: i % 3 === 0 ? 1 : 0,
      referralsWithSummaryOfCare: i % 6 === 0 ? 0 : i % 3 === 0 ? 1 : 0,
      contributedToRegistry: i % 5 !== 0,
      warmHandoffDocumented: i % 7 !== 0,
    })),
  };
}

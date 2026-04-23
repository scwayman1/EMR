// Population Health Dashboard — aggregate cohort views
// Provides practice-level insights across the entire patient population.

export type MetricTimeframe = "7d" | "30d" | "90d" | "1y" | "all";
export type CohortSegment = "all" | "new" | "active" | "lapsed" | "high_risk";

export interface PopulationMetric {
  label: string;
  value: number;
  previousValue?: number;
  unit: string;
  trend: "up" | "down" | "flat";
  trendIsGood: boolean;
}

export interface OutcomeDistribution {
  metric: string;
  buckets: { range: string; count: number; percentage: number }[];
  mean: number;
  median: number;
}

export interface CohortBreakdown {
  segment: CohortSegment;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ConditionPrevalence {
  condition: string;
  icd10: string;
  count: number;
  percentage: number;
}

// ── Demo data generators ───────────────────────────────

export function generatePopulationMetrics(totalPatients: number): PopulationMetric[] {
  return [
    { label: "Total patients", value: totalPatients, previousValue: Math.round(totalPatients * 0.92), unit: "", trend: "up", trendIsGood: true },
    { label: "Active (30d)", value: Math.round(totalPatients * 0.68), previousValue: Math.round(totalPatients * 0.62), unit: "", trend: "up", trendIsGood: true },
    { label: "Avg pain score", value: 4.2, previousValue: 5.1, unit: "/10", trend: "down", trendIsGood: true },
    { label: "Avg sleep score", value: 6.8, previousValue: 6.1, unit: "/10", trend: "up", trendIsGood: true },
    { label: "Avg anxiety score", value: 3.9, previousValue: 4.5, unit: "/10", trend: "down", trendIsGood: true },
    { label: "Treatment adherence", value: 78, previousValue: 72, unit: "%", trend: "up", trendIsGood: true },
    { label: "Follow-up rate", value: 85, previousValue: 81, unit: "%", trend: "up", trendIsGood: true },
    { label: "Avg visits/patient", value: 3.2, previousValue: 2.8, unit: "", trend: "up", trendIsGood: true },
  ];
}

export function generateCohortBreakdown(totalPatients: number): CohortBreakdown[] {
  return [
    { segment: "active", label: "Active", count: Math.round(totalPatients * 0.55), percentage: 55, color: "bg-emerald-500" },
    { segment: "new", label: "New (30d)", count: Math.round(totalPatients * 0.13), percentage: 13, color: "bg-blue-500" },
    { segment: "lapsed", label: "Lapsed (>90d)", count: Math.round(totalPatients * 0.22), percentage: 22, color: "bg-amber-500" },
    { segment: "high_risk", label: "High risk", count: Math.round(totalPatients * 0.10), percentage: 10, color: "bg-red-500" },
  ];
}

export function generateConditionPrevalence(totalPatients: number): ConditionPrevalence[] {
  return [
    { condition: "Chronic pain", icd10: "G89.29", count: Math.round(totalPatients * 0.42), percentage: 42 },
    { condition: "Anxiety disorders", icd10: "F41.1", count: Math.round(totalPatients * 0.31), percentage: 31 },
    { condition: "Insomnia", icd10: "G47.00", count: Math.round(totalPatients * 0.28), percentage: 28 },
    { condition: "PTSD", icd10: "F43.10", count: Math.round(totalPatients * 0.15), percentage: 15 },
    { condition: "Nausea/Chemotherapy", icd10: "R11.0", count: Math.round(totalPatients * 0.12), percentage: 12 },
    { condition: "Migraine", icd10: "G43.909", count: Math.round(totalPatients * 0.09), percentage: 9 },
    { condition: "Depression", icd10: "F32.9", count: Math.round(totalPatients * 0.08), percentage: 8 },
    { condition: "Multiple sclerosis", icd10: "G35", count: Math.round(totalPatients * 0.04), percentage: 4 },
  ];
}

export const OUTCOME_METRICS = ["pain", "sleep", "anxiety", "mood", "nausea", "appetite", "energy"] as const;

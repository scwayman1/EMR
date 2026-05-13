/**
 * EMR-097 — Data Research & Reports Module.
 *
 * "Accounting software for clinical data." The operator picks data
 * points, builds a dataset, and renders the result as a bar chart,
 * pie chart, line trend, or projection. This file is the pure data
 * layer — given a `ReportSpec` it returns a `RenderedReport` that the
 * UI can hand to recharts without any extra shaping.
 *
 * Persistence and saved templates are out of scope here; the consumer
 * stores `ReportSpec` JSON wherever it likes.
 */

export type ReportKind = "bar" | "pie" | "line" | "projection" | "pivot";

export type ClinicalDimension =
  | "conditions"
  | "products"
  | "outcomes"
  | "providers"
  | "payers"
  | "age_band"
  | "sex"
  | "month";

export type ClinicalMetric =
  | "patient_count"
  | "outcome_log_count"
  | "avg_pain_reduction"
  | "avg_sleep_improvement"
  | "rx_count"
  | "revenue_cents";

export interface ReportSpec {
  id: string;
  title: string;
  kind: ReportKind;
  dimension: ClinicalDimension;
  metric: ClinicalMetric;
  /** Optional second dimension for stacked or pivot reports. */
  groupBy?: ClinicalDimension;
  /** For projection reports — months ahead to forecast. */
  horizonMonths?: number;
}

export interface ReportRow {
  /** Human label on the X axis. */
  label: string;
  /** Primary metric value (numeric). */
  value: number;
  /** Optional group bucket for stacked / pivot rows. */
  group?: string;
  /** For projection rows — true when this point is forecast. */
  forecast?: boolean;
}

export interface RenderedReport {
  spec: ReportSpec;
  rows: ReportRow[];
  /** Totals row, useful in tables and as a sanity check. */
  total: number;
  /** Pre-computed mean for the bar/line case. */
  mean: number;
  /** Pre-computed standard deviation for the metric. */
  stddev: number;
}

/* -------------------------------------------------------------------------- */
/* Seed fact tables                                                           */
/* -------------------------------------------------------------------------- */

/**
 * In production this comes from `prisma.outcomeLog`, claims, and
 * regimen tables. The shape of these arrays is what `renderReport`
 * commits to — swap them out, the engine stays the same.
 */
export interface ClinicalFact {
  patientId: string;
  monthIso: string; // "2026-04"
  condition: string;
  product: string;
  provider: string;
  payer: string;
  ageBand: string;
  sex: "male" | "female" | "other";
  painDelta: number; // negative = improvement
  sleepDelta: number; // negative = improvement
  rxCount: number;
  revenueCents: number;
}

export const DEMO_FACTS: ClinicalFact[] = [
  { patientId: "p1", monthIso: "2026-01", condition: "Chronic pain", product: "1:1 softgel", provider: "Patel", payer: "Medicare", ageBand: "60-74", sex: "female", painDelta: -2.1, sleepDelta: -0.4, rxCount: 1, revenueCents: 26500 },
  { patientId: "p2", monthIso: "2026-01", condition: "Anxiety", product: "20:1 CBD tincture", provider: "Patel", payer: "Aetna", ageBand: "30-44", sex: "male", painDelta: 0, sleepDelta: -0.2, rxCount: 1, revenueCents: 11800 },
  { patientId: "p3", monthIso: "2026-02", condition: "Insomnia", product: "CBN tincture", provider: "Lopez", payer: "Self pay", ageBand: "45-59", sex: "female", painDelta: 0, sleepDelta: -2.6, rxCount: 1, revenueCents: 30000 },
  { patientId: "p4", monthIso: "2026-02", condition: "Chronic pain", product: "1:1 softgel", provider: "Lopez", payer: "Medicaid", ageBand: "30-44", sex: "male", painDelta: -1.8, sleepDelta: -0.6, rxCount: 2, revenueCents: 22000 },
  { patientId: "p5", monthIso: "2026-02", condition: "PTSD", product: "20:1 CBD tincture", provider: "Patel", payer: "VA", ageBand: "30-44", sex: "male", painDelta: -1.2, sleepDelta: -1.8, rxCount: 1, revenueCents: 0 },
  { patientId: "p6", monthIso: "2026-03", condition: "Chronic pain", product: "Topical balm", provider: "Patel", payer: "Aetna", ageBand: "60-74", sex: "female", painDelta: -1.6, sleepDelta: 0, rxCount: 1, revenueCents: 14500 },
  { patientId: "p7", monthIso: "2026-03", condition: "Anxiety", product: "20:1 CBD tincture", provider: "Lopez", payer: "BCBS", ageBand: "30-44", sex: "female", painDelta: 0, sleepDelta: -0.4, rxCount: 1, revenueCents: 10200 },
  { patientId: "p8", monthIso: "2026-03", condition: "Insomnia", product: "CBN tincture", provider: "Patel", payer: "Self pay", ageBand: "45-59", sex: "female", painDelta: 0, sleepDelta: -3.1, rxCount: 1, revenueCents: 30000 },
  { patientId: "p9", monthIso: "2026-04", condition: "Chronic pain", product: "1:1 softgel", provider: "Patel", payer: "Medicare", ageBand: "75+", sex: "male", painDelta: -2.4, sleepDelta: -0.8, rxCount: 2, revenueCents: 31000 },
  { patientId: "p10", monthIso: "2026-04", condition: "Anxiety", product: "Inhaled flower", provider: "Lopez", payer: "Cigna", ageBand: "30-44", sex: "female", painDelta: 0, sleepDelta: -0.2, rxCount: 1, revenueCents: 14400 },
  { patientId: "p11", monthIso: "2026-04", condition: "Insomnia", product: "CBN tincture", provider: "Patel", payer: "Aetna", ageBand: "60-74", sex: "male", painDelta: -0.4, sleepDelta: -2.2, rxCount: 1, revenueCents: 18500 },
  { patientId: "p12", monthIso: "2026-04", condition: "PTSD", product: "20:1 CBD tincture", provider: "Lopez", payer: "VA", ageBand: "45-59", sex: "male", painDelta: -1.4, sleepDelta: -1.6, rxCount: 1, revenueCents: 0 },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function bucketKey(fact: ClinicalFact, dim: ClinicalDimension): string {
  switch (dim) {
    case "conditions":
      return fact.condition;
    case "products":
      return fact.product;
    case "outcomes":
      return fact.painDelta < -1 ? "Major improvement" : fact.painDelta < 0 ? "Some improvement" : "Stable";
    case "providers":
      return fact.provider;
    case "payers":
      return fact.payer;
    case "age_band":
      return fact.ageBand;
    case "sex":
      return fact.sex;
    case "month":
      return fact.monthIso;
  }
}

function metricValue(fact: ClinicalFact, metric: ClinicalMetric): number {
  switch (metric) {
    case "patient_count":
      return 1; // de-duplicated below
    case "outcome_log_count":
      return 1;
    case "avg_pain_reduction":
      return -fact.painDelta; // flip sign so improvement is positive
    case "avg_sleep_improvement":
      return -fact.sleepDelta;
    case "rx_count":
      return fact.rxCount;
    case "revenue_cents":
      return fact.revenueCents;
  }
}

function stddev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const sum = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return Math.sqrt(sum / (values.length - 1));
}

/**
 * Naive linear-regression forecast for projection reports. Given a
 * series of monthly points, fit y = ax + b on the index and extend
 * `horizon` months forward. Marks projection rows with forecast=true.
 */
function project(rows: ReportRow[], horizon: number): ReportRow[] {
  if (rows.length < 2 || horizon <= 0) return rows;
  const xs = rows.map((_, i) => i);
  const ys = rows.map((r) => r.value);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  const lastLabel = rows[rows.length - 1].label;
  const result = [...rows];
  for (let h = 1; h <= horizon; h++) {
    const idx = n + h - 1;
    const value = Math.max(0, slope * idx + intercept);
    const label = nextMonthLabel(lastLabel, h);
    result.push({ label, value, forecast: true });
  }
  return result;
}

function nextMonthLabel(last: string, offset: number): string {
  const match = last.match(/^(\d{4})-(\d{2})$/);
  if (!match) return `+${offset}`;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const totalIdx = year * 12 + (month - 1) + offset;
  const newYear = Math.floor(totalIdx / 12);
  const newMonth = (totalIdx % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Render                                                                     */
/* -------------------------------------------------------------------------- */

export function renderReport(
  spec: ReportSpec,
  facts: ClinicalFact[] = DEMO_FACTS,
): RenderedReport {
  const buckets = new Map<string, { values: number[]; group?: string }>();
  const seenPatients = new Map<string, Set<string>>(); // for patient_count

  for (const fact of facts) {
    const key = bucketKey(fact, spec.dimension);
    const group = spec.groupBy ? bucketKey(fact, spec.groupBy) : undefined;
    const bucket = buckets.get(key) ?? { values: [], group };
    if (spec.metric === "patient_count") {
      const ids = seenPatients.get(key) ?? new Set();
      if (!ids.has(fact.patientId)) {
        ids.add(fact.patientId);
        bucket.values.push(1);
      }
      seenPatients.set(key, ids);
    } else {
      bucket.values.push(metricValue(fact, spec.metric));
    }
    buckets.set(key, bucket);
  }

  let rows: ReportRow[] = Array.from(buckets.entries()).map(([label, bucket]) => {
    const sum = bucket.values.reduce((a, b) => a + b, 0);
    const value =
      spec.metric === "avg_pain_reduction" || spec.metric === "avg_sleep_improvement"
        ? bucket.values.length === 0
          ? 0
          : sum / bucket.values.length
        : sum;
    return { label, value: Math.round(value * 100) / 100, group: bucket.group };
  });

  // Stable sort: month dimension goes chronological; everything else
  // by descending value so the dominant bucket is on the left.
  if (spec.dimension === "month") {
    rows.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    rows.sort((a, b) => b.value - a.value);
  }

  if (spec.kind === "projection" && spec.dimension === "month") {
    rows = project(rows, spec.horizonMonths ?? 3);
  }

  const observed = rows.filter((r) => !r.forecast).map((r) => r.value);
  const total = observed.reduce((a, b) => a + b, 0);
  const mean = observed.length === 0 ? 0 : total / observed.length;
  return {
    spec,
    rows,
    total: Math.round(total * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    stddev: Math.round(stddev(observed, mean) * 100) / 100,
  };
}

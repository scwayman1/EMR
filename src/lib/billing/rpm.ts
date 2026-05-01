/**
 * Medicare RPM (Remote Patient Monitoring) — EMR-120
 * --------------------------------------------------
 * RPM device data lands in the patient chart, accumulates against the
 * monthly billing cycle, and emits a CPT-coded claim line when the
 * billing thresholds are met. Per CMS guidance:
 *
 *   - 99453 — initial setup + patient education (one-time, per device)
 *   - 99454 — supply of device + daily transmissions ≥ 16 days
 *             in a 30-day calendar window
 *   - 99457 — first 20 minutes of clinical management per calendar
 *             month (provider-time-based, requires interactive
 *             communication with the patient)
 *   - 99458 — each additional 20 minutes (add-on to 99457)
 *
 * This module is the deterministic eligibility engine. The RPM
 * billing agent (future) wraps it to actually drop claim lines.
 */

export type RpmDeviceCategory = "blood_pressure" | "glucose" | "weight" | "spo2" | "ecg";

export interface RpmReading {
  patientId: string;
  deviceId: string;
  category: RpmDeviceCategory;
  measuredAt: Date;
  receivedAt: Date;
  values: Record<string, number>;
  units: Record<string, string>;
  source: string;
}

export interface ProviderReviewEvent {
  patientId: string;
  providerId: string;
  startedAt: Date;
  endedAt: Date;
  /** Required by CMS for 99457: real-time interactive contact. */
  interactiveCommunication: boolean;
  signedAt: Date;
  notes: string;
}

export type RpmCpt = "99453" | "99454" | "99457" | "99458";

export interface RpmBillingLine {
  cpt: RpmCpt;
  units: number;
  rationale: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface RpmBillingPeriod {
  monthStart: Date;
  monthEnd: Date;
  patientId: string;
  /** Whether 99453 has ever been billed for this device on this
   * patient. CMS allows it once per device. */
  setupAlreadyBilled: boolean;
}

export interface RpmEvaluationInput {
  period: RpmBillingPeriod;
  readings: RpmReading[];
  reviews: ProviderReviewEvent[];
}

export const TRANSMISSION_DAYS_REQUIRED = 16;
export const NINETY_NINE_457_THRESHOLD_MIN = 20;
export const NINETY_NINE_458_BLOCK_MIN = 20;

/** Pure evaluator: given a month of readings + reviews, return the
 * claim lines that are eligible to bill. Does not write to the DB. */
export function evaluateRpmMonth(input: RpmEvaluationInput): RpmBillingLine[] {
  const { period, readings, reviews } = input;
  const out: RpmBillingLine[] = [];

  if (!period.setupAlreadyBilled && readings.length > 0) {
    out.push({
      cpt: "99453",
      units: 1,
      rationale: "Initial setup + patient education for RPM device.",
      periodStart: period.monthStart,
      periodEnd: period.monthEnd,
    });
  }

  const distinctDays = new Set<string>();
  for (const r of readings) {
    if (r.measuredAt < period.monthStart || r.measuredAt > period.monthEnd) continue;
    distinctDays.add(r.measuredAt.toISOString().slice(0, 10));
  }
  if (distinctDays.size >= TRANSMISSION_DAYS_REQUIRED) {
    out.push({
      cpt: "99454",
      units: 1,
      rationale: `Device supplied + ${distinctDays.size} distinct transmission days (CMS requires ${TRANSMISSION_DAYS_REQUIRED}).`,
      periodStart: period.monthStart,
      periodEnd: period.monthEnd,
    });
  }

  const inPeriodReviews = reviews.filter(
    (r) =>
      r.startedAt >= period.monthStart &&
      r.startedAt <= period.monthEnd &&
      r.interactiveCommunication,
  );
  const totalMinutes = inPeriodReviews.reduce(
    (sum, r) => sum + minutesBetween(r.startedAt, r.endedAt),
    0,
  );

  if (totalMinutes >= NINETY_NINE_457_THRESHOLD_MIN) {
    out.push({
      cpt: "99457",
      units: 1,
      rationale: `${totalMinutes} minutes of interactive clinical management (≥${NINETY_NINE_457_THRESHOLD_MIN} min required).`,
      periodStart: period.monthStart,
      periodEnd: period.monthEnd,
    });

    const additional = Math.floor(
      (totalMinutes - NINETY_NINE_457_THRESHOLD_MIN) / NINETY_NINE_458_BLOCK_MIN,
    );
    if (additional > 0) {
      out.push({
        cpt: "99458",
        units: additional,
        rationale: `${additional} additional 20-minute block(s) beyond the first 20 minutes (total ${totalMinutes} min).`,
        periodStart: period.monthStart,
        periodEnd: period.monthEnd,
      });
    }
  }

  return out;
}

export interface VitalTrend {
  metric: string;
  latest: number;
  unit: string;
  prior: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "new";
  measuredAt: Date;
}

/** Trend summary for the chart vitals section. */
export function summarizeTrends(readings: RpmReading[]): VitalTrend[] {
  const byMetric = new Map<string, RpmReading[]>();
  for (const r of readings) {
    for (const k of Object.keys(r.values)) {
      const arr = byMetric.get(k) ?? [];
      arr.push(r);
      byMetric.set(k, arr);
    }
  }

  const trends: VitalTrend[] = [];
  for (const [metric, list] of byMetric) {
    list.sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
    const latest = list[list.length - 1];
    const prior = list.length > 1 ? list[list.length - 2] : null;
    const latestVal = latest.values[metric];
    const priorVal = prior?.values[metric] ?? null;
    const delta = priorVal === null ? null : latestVal - priorVal;
    const direction: VitalTrend["direction"] =
      priorVal === null ? "new" : delta === 0 ? "flat" : delta! > 0 ? "up" : "down";
    trends.push({
      metric,
      latest: latestVal,
      unit: latest.units[metric] ?? "",
      prior: priorVal,
      delta,
      direction,
      measuredAt: latest.measuredAt,
    });
  }
  return trends;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

/** Format a CMS-required attestation line stored verbatim against the
 * 99457/99458 claim line so a downstream auditor can see exactly which
 * interactive review supported the bill. */
export function attestationLine(review: ProviderReviewEvent): string {
  const minutes = minutesBetween(review.startedAt, review.endedAt);
  return [
    `RPM clinical management — ${minutes} min`,
    `Interactive: ${review.interactiveCommunication ? "yes" : "no"}`,
    `Provider sign-off: ${review.signedAt.toISOString()}`,
  ].join(" · ");
}

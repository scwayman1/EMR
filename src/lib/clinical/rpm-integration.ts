/**
 * Medicare Remote Patient Monitoring (RPM) integration scaffold — EMR-120
 *
 * RPM is a high-leverage Medicare reimbursement avenue for cannabis care:
 * patients on chronic-pain regimens already log daily symptoms, and a
 * couple of biometric streams (BP, HR, sleep, weight) push us into
 * billable territory. Medicare reimburses through CPT codes 99453,
 * 99454, 99457, 99458, 99091 — each with strict device, time-on-care,
 * and reading-frequency requirements.
 *
 * This file is a typed scaffold so the orchestrator, billing pipeline,
 * and patient portal can all speak a shared vocabulary while the actual
 * device + Medicare adapter integrations land. The codes, thresholds,
 * and reimbursement amounts are accurate as of CY2026 — update annually
 * when CMS publishes the new fee schedule.
 */

export type RpmCpt =
  | "99453"
  | "99454"
  | "99457"
  | "99458"
  | "99091";

/**
 * CMS-published threshold for "interactive communication time" required
 * to bill 99457 (≥20 min in a calendar month) and 99458 (each additional
 * 20 min, max 2 add-on units).
 */
export const RPM_THRESHOLDS = {
  /** Days per month a device must transmit to bill 99454. */
  minTransmissionDaysPerMonth: 16,
  /** Minutes per month of clinical staff time to bill 99457. */
  minMonitoringMinutes99457: 20,
  /** Minutes per month per additional 99458 add-on. */
  monitoringIncrementMinutes: 20,
  /** Max 99458 add-on units per patient per month. */
  max99458AddOns: 2,
} as const;

/**
 * Medicare 2026 national average reimbursement (USD) — used for
 * forecasting the monthly RPM revenue line on the dashboard. Values
 * are rounded; payer-specific rates override at claim time.
 */
export const RPM_REIMBURSEMENT_USD: Record<RpmCpt, number> = {
  "99453": 19.04, // one-time setup
  "99454": 47.03, // device monthly supply
  "99457": 47.78, // first 20 min staff time
  "99458": 38.54, // each addl 20 min, up to ×2
  "99091": 56.19, // physician interpretation, 30 min
};

export type RpmDeviceKind =
  | "blood_pressure_cuff"
  | "weight_scale"
  | "pulse_oximeter"
  | "glucose_meter"
  | "spirometer"
  | "wearable_hr"
  | "wearable_sleep";

export interface RpmDevice {
  /** Internal id; usually the manufacturer's device serial. */
  id: string;
  patientId: string;
  kind: RpmDeviceKind;
  manufacturer: string;
  model: string;
  /** When the patient was provisioned (used for billing 99453 once). */
  provisionedAt: string;
  /** Soft-deletion marker; null = active. */
  retiredAt: string | null;
}

export interface RpmReading {
  id: string;
  deviceId: string;
  patientId: string;
  /** ISO timestamp the reading was captured. */
  measuredAt: string;
  /** Loose key/value to fit the variety of biometric payloads. */
  metric: string;
  value: number;
  unit: string;
  /**
   * `manual` = patient typed it in.
   * `device` = pulled directly from the device's API/Bluetooth bridge.
   * Only `device` readings count toward the 99454 transmission-day
   * tally per CMS.
   */
  source: "device" | "manual";
}

export interface RpmCareEvent {
  id: string;
  patientId: string;
  /** Clinician or billing-eligible staff who performed the work. */
  performedByUserId: string;
  /** Minutes spent. Aggregated per-month for 99457/99458 thresholds. */
  minutes: number;
  /** ISO timestamp; the calendar month decides which billing window
   *  this event lands in. */
  occurredAt: string;
  /** Free-text note for chart traceability. */
  note?: string;
}

export interface RpmBillingPeriod {
  patientId: string;
  /** YYYY-MM string the period covers. */
  month: string;
  /** Distinct calendar days with at least one device reading. */
  transmissionDays: number;
  /** Sum of clinical staff care-event minutes in the month. */
  careMinutes: number;
  /** Did the patient have a device provisioned (any time before period)? */
  hasProvisionedDevice: boolean;
  /** Has 99453 already been billed for this patient historically? */
  alreadyBilled99453: boolean;
}

export interface RpmEligibility {
  cpt: RpmCpt;
  /** True if all gating requirements were met. */
  eligible: boolean;
  /** When ineligible, a one-line human-readable reason. */
  reason?: string;
  /** How many units (supports 99458's add-on count). */
  units: number;
  /** Forecasted revenue (USD) if billed. */
  expectedRevenue: number;
}

/**
 * Decide which RPM CPT codes are billable for a patient in a given
 * calendar month. Pure / synchronous; the orchestrator hands us an
 * already-aggregated RpmBillingPeriod and we return the eligibility
 * matrix. Persisting + actually filing claims is the billing fleet's
 * job — see /src/lib/billing/billing-orchestrator.ts.
 */
export function evaluateRpmEligibility(
  period: RpmBillingPeriod,
): RpmEligibility[] {
  const out: RpmEligibility[] = [];

  // 99453 — one-time device setup. Bill the first month a device is
  // provisioned; never again for the same patient.
  out.push({
    cpt: "99453",
    eligible: period.hasProvisionedDevice && !period.alreadyBilled99453,
    reason: !period.hasProvisionedDevice
      ? "No device provisioned."
      : period.alreadyBilled99453
        ? "Already billed for this patient."
        : undefined,
    units: period.hasProvisionedDevice && !period.alreadyBilled99453 ? 1 : 0,
    expectedRevenue:
      period.hasProvisionedDevice && !period.alreadyBilled99453
        ? RPM_REIMBURSEMENT_USD["99453"]
        : 0,
  });

  // 99454 — device + monthly supply, requires ≥16 transmission days.
  const ok99454 =
    period.hasProvisionedDevice &&
    period.transmissionDays >= RPM_THRESHOLDS.minTransmissionDaysPerMonth;
  out.push({
    cpt: "99454",
    eligible: ok99454,
    reason: ok99454
      ? undefined
      : `Need ≥${RPM_THRESHOLDS.minTransmissionDaysPerMonth} transmission days; got ${period.transmissionDays}.`,
    units: ok99454 ? 1 : 0,
    expectedRevenue: ok99454 ? RPM_REIMBURSEMENT_USD["99454"] : 0,
  });

  // 99457 — first 20 min monthly clinical care.
  const ok99457 =
    period.careMinutes >= RPM_THRESHOLDS.minMonitoringMinutes99457;
  out.push({
    cpt: "99457",
    eligible: ok99457,
    reason: ok99457
      ? undefined
      : `Need ≥${RPM_THRESHOLDS.minMonitoringMinutes99457} care minutes; got ${period.careMinutes}.`,
    units: ok99457 ? 1 : 0,
    expectedRevenue: ok99457 ? RPM_REIMBURSEMENT_USD["99457"] : 0,
  });

  // 99458 — each additional 20 min beyond the first. Max 2 add-on units.
  const beyondFirst = Math.max(
    0,
    period.careMinutes - RPM_THRESHOLDS.minMonitoringMinutes99457,
  );
  const addOnUnits = Math.min(
    Math.floor(beyondFirst / RPM_THRESHOLDS.monitoringIncrementMinutes),
    RPM_THRESHOLDS.max99458AddOns,
  );
  out.push({
    cpt: "99458",
    eligible: addOnUnits > 0,
    reason:
      addOnUnits > 0
        ? undefined
        : "Need an additional 20+ min beyond 99457 to bill 99458.",
    units: addOnUnits,
    expectedRevenue: addOnUnits * RPM_REIMBURSEMENT_USD["99458"],
  });

  return out;
}

/**
 * Aggregate a stream of readings + care events into a RpmBillingPeriod
 * for the given month. Pure helper — no side effects, easy to test.
 */
export function aggregateBillingPeriod(input: {
  patientId: string;
  /** YYYY-MM */
  month: string;
  readings: RpmReading[];
  careEvents: RpmCareEvent[];
  hasProvisionedDevice: boolean;
  alreadyBilled99453: boolean;
}): RpmBillingPeriod {
  const days = new Set<string>();
  for (const r of input.readings) {
    if (r.source !== "device") continue;
    if (!r.measuredAt.startsWith(input.month + "-")) continue;
    days.add(r.measuredAt.slice(0, 10));
  }
  const careMinutes = input.careEvents
    .filter((e) => e.occurredAt.startsWith(input.month + "-"))
    .reduce((acc, e) => acc + e.minutes, 0);
  return {
    patientId: input.patientId,
    month: input.month,
    transmissionDays: days.size,
    careMinutes,
    hasProvisionedDevice: input.hasProvisionedDevice,
    alreadyBilled99453: input.alreadyBilled99453,
  };
}

/**
 * Forecast revenue for a list of patients in a given month. Drives the
 * RPM tile on the financial dashboard.
 */
export interface RpmForecast {
  month: string;
  patientCount: number;
  totalUSD: number;
  byCpt: Record<RpmCpt, { units: number; usd: number }>;
}

export function forecastMonthlyRpmRevenue(
  periods: RpmBillingPeriod[],
): RpmForecast {
  const byCpt: RpmForecast["byCpt"] = {
    "99453": { units: 0, usd: 0 },
    "99454": { units: 0, usd: 0 },
    "99457": { units: 0, usd: 0 },
    "99458": { units: 0, usd: 0 },
    "99091": { units: 0, usd: 0 },
  };
  let total = 0;
  for (const p of periods) {
    for (const e of evaluateRpmEligibility(p)) {
      byCpt[e.cpt].units += e.units;
      byCpt[e.cpt].usd += e.expectedRevenue;
      total += e.expectedRevenue;
    }
  }
  return {
    month: periods[0]?.month ?? "",
    patientCount: periods.length,
    totalUSD: Math.round(total * 100) / 100,
    byCpt,
  };
}

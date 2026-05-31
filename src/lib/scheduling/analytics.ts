/**
 * EMR-215 — Scheduling Analytics Cockpit (metrics + forecast engine).
 *
 * Pure-function analytics layer over a flat list of appointment records.
 * Computes the operational KPIs the scheduling cockpit surfaces (fill rate,
 * no-show / cancel rates, lead-time percentiles, new-patient conversion,
 * revenue-per-slot, provider utilization), slices those metrics by an
 * arbitrary dimension, projects near-term demand from booking velocity, and
 * raises bottleneck / action-trigger alerts. The page (EMR-216) consumes
 * this; everything here is deterministic and takes the reference time as an
 * explicit `now` so it stays testable and never touches the wall clock.
 */
import { z } from "zod";

export const AppointmentStatusSchema = z.enum([
  "requested",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const AppointmentCohortSchema = z.enum(["new", "recurring", "urgent"]);
export type AppointmentCohort = z.infer<typeof AppointmentCohortSchema>;

export const AppointmentRecordSchema = z.object({
  id: z.string(),
  /** Provider the appointment is assigned to. null = unassigned / pool. */
  providerId: z.string().nullable(),
  startAt: z.date(),
  endAt: z.date(),
  status: AppointmentStatusSchema,
  /** Free-form modality string ("video", "in_person", ...). */
  modality: z.string(),
  /** When the appointment was booked — drives lead time + booking velocity. */
  createdAt: z.date(),
  visitType: z.string().optional(),
  payer: z.string().nullable().optional(),
  /** Captured revenue for completed visits. null/absent = not yet billed. */
  revenue: z.number().nullable().optional(),
  cohort: AppointmentCohortSchema.optional(),
});
export type AppointmentRecord = z.infer<typeof AppointmentRecordSchema>;

export interface ProviderUtilization {
  providerId: string;
  bookedHours: number;
  util: number; // bookedHours / capacityHours, 0..(unbounded if overbooked)
}

export interface SchedulingMetrics {
  /** Completed / (completed + no_show) over past appts. 0 if no past appts. */
  fillRate: number;
  /** no_show / (completed + no_show) over past appts. */
  noShowRate: number;
  /** cancelled / (all past appts) over past appts. */
  cancelRate: number;
  /** Lead-time (days) percentiles over booked appts. */
  leadTimeDaysP50: number;
  leadTimeDaysP90: number;
  /** completed-new / booked-new. 0 if no new patients booked. */
  newPatientConversion: number;
  /** Mean revenue across completed appts with a numeric revenue. */
  revenuePerSlot: number;
  providerUtilization: ProviderUtilization[];
  counts: MetricCounts;
}

export interface MetricCounts {
  total: number;
  past: number;
  future: number;
  booked: number;
  completed: number;
  noShow: number;
  cancelled: number;
  requested: number;
  confirmed: number;
}

export interface MetricsOptions {
  /**
   * Capacity hours per provider over the window the metrics cover. Used as
   * the denominator for utilization. Default 80 (~two work weeks).
   */
  capacityHours?: number;
}

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

/** "Booked" = a visit that consumed a slot (not just a pending request). */
const BOOKED_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "confirmed",
  "completed",
  "no_show",
]);

function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function isPast(appt: AppointmentRecord, now: Date): boolean {
  return appt.startAt.getTime() < now.getTime();
}

function leadTimeDays(appt: AppointmentRecord): number {
  return Math.max(0, (appt.startAt.getTime() - appt.createdAt.getTime()) / MS_PER_DAY);
}

function durationHours(appt: AppointmentRecord): number {
  return Math.max(0, (appt.endAt.getTime() - appt.startAt.getTime()) / MS_PER_HOUR);
}

/**
 * Linear-interpolated percentile (same convention as numpy's default). `p`
 * is a fraction 0..1. Returns 0 for an empty input rather than NaN.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = p * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
}

/**
 * Compute the full KPI bundle. Rates are computed over PAST appointments
 * (startAt < now); lead time + booking-derived metrics use the booked set.
 * Every ratio is divide-by-zero guarded and returns 0 when undefined.
 */
export function computeMetrics(
  appts: AppointmentRecord[],
  now: Date,
  options: MetricsOptions = {},
): SchedulingMetrics {
  const capacityHours = options.capacityHours ?? 80;

  const past = appts.filter((a) => isPast(a, now));
  const future = appts.filter((a) => !isPast(a, now));

  const completed = past.filter((a) => a.status === "completed");
  const noShow = past.filter((a) => a.status === "no_show");
  const cancelled = past.filter((a) => a.status === "cancelled");
  const requested = appts.filter((a) => a.status === "requested");
  const confirmed = appts.filter((a) => a.status === "confirmed");

  // Attended denominator: visits that actually came due (completed + no_show).
  const attendedDenom = completed.length + noShow.length;
  const fillRate = safeDiv(completed.length, attendedDenom);
  const noShowRate = safeDiv(noShow.length, attendedDenom);
  const cancelRate = safeDiv(cancelled.length, past.length);

  const booked = appts.filter((a) => BOOKED_STATUSES.has(a.status));
  const leadTimes = booked.map(leadTimeDays);
  const leadTimeDaysP50 = percentile(leadTimes, 0.5);
  const leadTimeDaysP90 = percentile(leadTimes, 0.9);

  const bookedNew = booked.filter((a) => a.cohort === "new");
  const completedNew = bookedNew.filter((a) => a.status === "completed");
  const newPatientConversion = safeDiv(completedNew.length, bookedNew.length);

  const revenues = completed
    .map((a) => a.revenue)
    .filter((r): r is number => typeof r === "number");
  const revenuePerSlot = safeDiv(
    revenues.reduce((sum, r) => sum + r, 0),
    revenues.length,
  );

  const providerUtilization = computeProviderUtilization(booked, capacityHours);

  const counts: MetricCounts = {
    total: appts.length,
    past: past.length,
    future: future.length,
    booked: booked.length,
    completed: completed.length,
    noShow: noShow.length,
    cancelled: cancelled.length,
    requested: requested.length,
    confirmed: confirmed.length,
  };

  return {
    fillRate,
    noShowRate,
    cancelRate,
    leadTimeDaysP50,
    leadTimeDaysP90,
    newPatientConversion,
    revenuePerSlot,
    providerUtilization,
    counts,
  };
}

function computeProviderUtilization(
  booked: AppointmentRecord[],
  capacityHours: number,
): ProviderUtilization[] {
  const byProvider = new Map<string, number>();
  for (const appt of booked) {
    if (appt.providerId === null) continue;
    const prev = byProvider.get(appt.providerId) ?? 0;
    byProvider.set(appt.providerId, prev + durationHours(appt));
  }
  return [...byProvider.entries()]
    .map(([providerId, bookedHours]) => ({
      providerId,
      bookedHours,
      util: safeDiv(bookedHours, capacityHours),
    }))
    .sort((a, b) => b.util - a.util);
}

export type SliceDimension =
  | "provider"
  | "visitType"
  | "payer"
  | "dayOfWeek"
  | "hourOfDay"
  | "cohort";

export interface MetricsSlice {
  key: string;
  metrics: SchedulingMetrics;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function sliceKey(appt: AppointmentRecord, dimension: SliceDimension): string {
  switch (dimension) {
    case "provider":
      return appt.providerId ?? "unassigned";
    case "visitType":
      return appt.visitType ?? "unknown";
    case "payer":
      return appt.payer ?? "unknown";
    case "dayOfWeek":
      return DAY_NAMES[appt.startAt.getDay()];
    case "hourOfDay":
      return String(appt.startAt.getHours());
    case "cohort":
      return appt.cohort ?? "unknown";
  }
}

/**
 * Group appointments by `dimension` and compute the full metric bundle per
 * group. Keys are sorted ascending so output is deterministic.
 */
export function sliceBy(
  appts: AppointmentRecord[],
  dimension: SliceDimension,
  now: Date,
  options: MetricsOptions = {},
): MetricsSlice[] {
  const groups = new Map<string, AppointmentRecord[]>();
  for (const appt of appts) {
    const key = sliceKey(appt, dimension);
    const bucket = groups.get(key);
    if (bucket) bucket.push(appt);
    else groups.set(key, [appt]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, group]) => ({ key, metrics: computeMetrics(group, now, options) }));
}

export interface DemandForecast {
  /** Booking velocity — appointments booked per day over the trailing window. */
  perDay: number;
  /** Projected new bookings over `horizonDays`. */
  projected: number;
}

/** Trailing window (days) used to estimate booking velocity. */
const VELOCITY_WINDOW_DAYS = 14;

/**
 * Forecast new-booking demand by extrapolating recent booking velocity.
 * Counts appointments whose `createdAt` falls within the trailing 14 days
 * ending at `now`, divides by 14 to get a per-day rate, then scales out to
 * `horizonDays`. Deterministic — `now` is supplied by the caller.
 */
export function forecastDemand(
  appts: AppointmentRecord[],
  now: Date,
  horizonDays: number,
): DemandForecast {
  const horizon = Math.max(0, horizonDays);
  const windowStart = now.getTime() - VELOCITY_WINDOW_DAYS * MS_PER_DAY;
  const recentBookings = appts.filter((a) => {
    const t = a.createdAt.getTime();
    return t >= windowStart && t <= now.getTime();
  }).length;
  const perDay = recentBookings / VELOCITY_WINDOW_DAYS;
  return { perDay, projected: perDay * horizon };
}

export interface ForecastWindows {
  d30: DemandForecast;
  d60: DemandForecast;
  d90: DemandForecast;
}

/** Convenience: the three standard planning horizons in one call. */
export function forecastWindows(appts: AppointmentRecord[], now: Date): ForecastWindows {
  return {
    d30: forecastDemand(appts, now, 30),
    d60: forecastDemand(appts, now, 60),
    d90: forecastDemand(appts, now, 90),
  };
}

export type BottleneckSeverity = "watch" | "warn" | "critical";

export interface Bottleneck {
  providerId: string;
  util: number;
  severity: BottleneckSeverity;
}

export interface BottleneckOptions {
  /** Utilization above which a provider is flagged. Default 0.85. */
  utilThreshold?: number;
}

function bottleneckSeverity(util: number): BottleneckSeverity {
  if (util >= 1) return "critical";
  if (util >= 0.95) return "warn";
  return "watch";
}

/**
 * Surface providers running hot. Returns every provider whose utilization
 * exceeds the threshold (default 0.85), sorted hottest-first, tagged with a
 * coarse severity the cockpit colors on.
 */
export function detectBottlenecks(
  metrics: SchedulingMetrics,
  opts: BottleneckOptions = {},
): Bottleneck[] {
  const threshold = opts.utilThreshold ?? 0.85;
  return metrics.providerUtilization
    .filter((p) => p.util > threshold)
    .map((p) => ({
      providerId: p.providerId,
      util: p.util,
      severity: bottleneckSeverity(p.util),
    }))
    .sort((a, b) => b.util - a.util);
}

export interface ActionTrigger {
  rule: string;
  fired: boolean;
  detail: string;
}

export interface ActionTriggerOptions {
  /** Fill-rate floor for the low-fill-rate streak rule. Default 0.70. */
  fillRateFloor?: number;
  /** Consecutive weeks below the floor before firing. Default 2. */
  consecutiveWeeks?: number;
}

/**
 * Evaluate operational alert rules against a series of weekly fill rates
 * (oldest first). Currently implements the "fill rate below floor for N
 * consecutive weeks" rule; the array shape keeps it extensible for future
 * rules without changing the call site.
 */
export function actionTriggers(
  weeklyFillRates: number[],
  opts: ActionTriggerOptions = {},
): ActionTrigger[] {
  const floor = opts.fillRateFloor ?? 0.7;
  const needed = opts.consecutiveWeeks ?? 2;

  let longestStreak = 0;
  let currentStreak = 0;
  for (const rate of weeklyFillRates) {
    if (rate < floor) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const fired = longestStreak >= needed;
  const lowFillRule: ActionTrigger = {
    rule: `fill_rate_below_${floor}_for_${needed}_weeks`,
    fired,
    detail: fired
      ? `Fill rate stayed below ${floor} for ${longestStreak} consecutive week(s).`
      : `Longest sub-${floor} streak was ${longestStreak} week(s); needs ${needed}.`,
  };

  return [lowFillRule];
}

/**
 * EMR-214 — Provider burnout guardrails.
 *
 * Encodes per-provider scheduling preferences and a burnout index that
 * the slot recommender (EMR-209) and the waitlist engine (EMR-210)
 * consult before placing a visit on a calendar.
 *
 * Goals:
 *   - Hard caps so a single provider can't be packed beyond their stated
 *     daily/weekly volume.
 *   - "Soft caps" (lunch protected, no-double-back-to-back-emotional-visits)
 *     that the recommender can break only with explicit operator consent.
 *   - A burnout index (0..1) the operator dashboard can chart over time.
 */
import { z } from "zod";

export const ProviderPrefsSchema = z.object({
  providerId: z.string(),
  /** Hard cap on completed/scheduled visits per calendar day. */
  maxPatientsPerDay: z.number().int().min(1).max(40),
  /** Hard cap on visits per week. */
  maxPatientsPerWeek: z.number().int().min(1).max(160),
  /** Minutes between consecutive visits (buffer block). */
  minBufferMinutes: z.number().int().min(0).max(60),
  /** Minutes of lunch protected between 11a–2p, 0 to disable. */
  lunchMinutes: z.number().int().min(0).max(120),
  /** Cap on emotionally-heavy visit *types* per day (e.g. PTSD intakes). */
  maxHighIntensityPerDay: z.number().int().min(0).max(20),
  /** Whether the provider accepts urgent same-day add-ons. */
  acceptsSameDayAddons: z.boolean(),
  /** Days of week the provider works (0=Sun..6=Sat). */
  workDays: z.array(z.number().int().min(0).max(6)),
  /** Daily working window. */
  workHours: z.object({ startHour: z.number().min(0).max(23), endHour: z.number().min(0).max(23) }),
  /** Last clinician-stated burnout self-rating (0..10). */
  selfReportedBurnout: z.number().min(0).max(10).nullable(),
});
export type ProviderPrefs = z.infer<typeof ProviderPrefsSchema>;

export const DEFAULT_PROVIDER_PREFS: Omit<ProviderPrefs, "providerId"> = {
  maxPatientsPerDay: 16,
  maxPatientsPerWeek: 60,
  minBufferMinutes: 5,
  lunchMinutes: 30,
  maxHighIntensityPerDay: 4,
  acceptsSameDayAddons: true,
  workDays: [1, 2, 3, 4, 5],
  workHours: { startHour: 8, endHour: 18 },
  selfReportedBurnout: null,
};

export interface DayLoad {
  day: Date;
  scheduledVisits: number;
  highIntensityVisits: number;
  /** Average visit duration in minutes. */
  avgDurationMin: number;
  /** Latest visit start time of the day, hour-of-day. */
  latestStartHour: number;
  /** Total documented hours (visits + admin) so far this day. */
  totalDocumentedHours: number;
}

export interface BookingProposal {
  startAt: Date;
  endAt: Date;
  isHighIntensity: boolean;
  isSameDayAddon: boolean;
}

export type GuardrailViolation =
  | "exceeds_daily_cap"
  | "exceeds_weekly_cap"
  | "outside_work_hours"
  | "outside_work_day"
  | "violates_lunch"
  | "exceeds_high_intensity_cap"
  | "no_buffer"
  | "rejects_same_day_addons";

export interface GuardrailDecision {
  allowed: boolean;
  /** Hard violations that prevent booking outright. */
  hardViolations: GuardrailViolation[];
  /** Soft violations the operator may override. */
  softViolations: GuardrailViolation[];
}

/**
 * Decide whether a proposed booking is allowed given the provider's prefs
 * and the day's existing load.
 */
export function evaluateBooking(
  prefs: ProviderPrefs,
  proposal: BookingProposal,
  thisDayLoad: DayLoad,
  weeklyVisitCount: number,
  bufferConflictMinutes: number,
): GuardrailDecision {
  const hard: GuardrailViolation[] = [];
  const soft: GuardrailViolation[] = [];

  if (!prefs.workDays.includes(proposal.startAt.getDay())) {
    hard.push("outside_work_day");
  }

  const startHour = proposal.startAt.getHours();
  const endHour = proposal.endAt.getHours();
  if (startHour < prefs.workHours.startHour || endHour > prefs.workHours.endHour) {
    hard.push("outside_work_hours");
  }

  if (thisDayLoad.scheduledVisits >= prefs.maxPatientsPerDay) {
    hard.push("exceeds_daily_cap");
  }
  if (weeklyVisitCount >= prefs.maxPatientsPerWeek) {
    hard.push("exceeds_weekly_cap");
  }

  if (proposal.isSameDayAddon && !prefs.acceptsSameDayAddons) {
    hard.push("rejects_same_day_addons");
  }

  if (
    proposal.isHighIntensity &&
    thisDayLoad.highIntensityVisits >= prefs.maxHighIntensityPerDay
  ) {
    soft.push("exceeds_high_intensity_cap");
  }

  if (prefs.lunchMinutes > 0 && overlapsLunch(proposal, prefs.lunchMinutes)) {
    soft.push("violates_lunch");
  }

  if (bufferConflictMinutes > 0 && bufferConflictMinutes < prefs.minBufferMinutes) {
    soft.push("no_buffer");
  }

  return {
    allowed: hard.length === 0,
    hardViolations: hard,
    softViolations: soft,
  };
}

/**
 * Burnout index, 0..1. Inputs are the rolling 14-day load plus the most
 * recent self-report. Above 0.7 → operator is paged to redistribute load.
 *
 * Components:
 *   - Daily load saturation (avg / cap)
 *   - High-intensity ratio
 *   - Work hour overflow (visits ending after stated end)
 *   - Self-reported burnout, mapped to 0..1 (10 → 1.0)
 *   - Documentation lag — total documented hours far exceeding stated end
 *     suggests after-hours charting (the classic burnout proxy).
 */
export function burnoutIndex(prefs: ProviderPrefs, fortnight: DayLoad[]): {
  score: number;
  components: Record<string, number>;
  level: "green" | "yellow" | "red";
} {
  const dailyCap = prefs.maxPatientsPerDay;
  const intensityCap = prefs.maxHighIntensityPerDay || 1;
  const stdEnd = prefs.workHours.endHour;

  const saturation =
    avg(fortnight.map((d) => Math.min(1, d.scheduledVisits / Math.max(1, dailyCap))));
  const intensity =
    avg(fortnight.map((d) => Math.min(1, d.highIntensityVisits / Math.max(1, intensityCap))));
  const overrun =
    avg(fortnight.map((d) => Math.max(0, (d.latestStartHour - stdEnd) / 4))); // 4h past = 1.0
  const selfReport =
    prefs.selfReportedBurnout === null ? 0.5 : prefs.selfReportedBurnout / 10;
  const docLag =
    avg(fortnight.map((d) => {
      const hoursOverWindow = d.totalDocumentedHours - (stdEnd - prefs.workHours.startHour);
      return Math.max(0, Math.min(1, hoursOverWindow / 4));
    }));

  const score =
    0.3 * saturation +
    0.15 * intensity +
    0.15 * overrun +
    0.25 * selfReport +
    0.15 * docLag;

  const level: "green" | "yellow" | "red" =
    score < 0.45 ? "green" : score < 0.7 ? "yellow" : "red";

  return {
    score: Math.round(score * 100) / 100,
    components: {
      saturation: round(saturation),
      intensity: round(intensity),
      overrun: round(overrun),
      selfReport: round(selfReport),
      docLag: round(docLag),
    },
    level,
  };
}

function overlapsLunch(proposal: BookingProposal, lunchMin: number): boolean {
  if (lunchMin <= 0) return false;
  // We define lunch as a flexible window inside 11:30–13:30, of length lunchMin.
  // Any booking that spans through the entire window blocks lunch.
  const day = proposal.startAt;
  const lunchStart = new Date(day);
  lunchStart.setHours(11, 30, 0, 0);
  const lunchEnd = new Date(day);
  lunchEnd.setHours(13, 30, 0, 0);
  // booking covers the window if it starts before lunchStart + lunchMin slack
  // and ends after lunchEnd - lunchMin slack
  return (
    proposal.startAt.getTime() <= lunchStart.getTime() + lunchMin * 60_000 &&
    proposal.endAt.getTime() >= lunchEnd.getTime() - lunchMin * 60_000
  );
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

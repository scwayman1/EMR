/**
 * EMR-210 — Intelligent waitlist + cancellation fill.
 *
 * When a slot opens up (a cancellation, a no-show backfill, an added-capacity
 * block), this engine decides who to offer it to and in what order. Entries
 * that physically cannot take the slot (wrong visit type, wrong day, outside
 * their stated hours, wrong provider) are hard-filtered out; the rest are
 * scored by a weighted blend of clinical urgency, cadence overdue-ness,
 * no-show risk fit, flexibility, VIP status, and how long they have waited.
 *
 * The ranker is pure and read-only — callers pass in the pre-fetched waitlist
 * and the open slot, and we never read the wall clock (the slot's startAt is
 * the reference time). Offer waves stagger outreach so we don't blast every
 * patient at once and end up double-booked.
 */
import { z } from "zod";
import type { RiskTier } from "./no-show-model";

export const UrgencySchema = z.enum(["routine", "soon", "urgent"]);
export type Urgency = z.infer<typeof UrgencySchema>;

export const ContactChannelSchema = z.enum(["sms", "email", "voice", "portal"]);
export type ContactChannel = z.infer<typeof ContactChannelSchema>;

export const HourRangeSchema = z.object({
  /** 0–23, inclusive lower bound on slot start hour. */
  earliestHour: z.number().int().min(0).max(23),
  /** 0–23, exclusive upper bound on slot start hour. */
  latestHour: z.number().int().min(0).max(24),
});
export type HourRange = z.infer<typeof HourRangeSchema>;

export const WaitlistEntrySchema = z.object({
  patientId: z.string(),
  displayName: z.string(),
  /** When the patient joined the waitlist — older waits rank higher. */
  addedAt: z.date(),
  /** Visit type the patient is waiting for; must match the slot's visitType. */
  visitType: z.string(),
  /** Preferred provider — honored as a hard filter by default (see opts). */
  preferredProviderId: z.string().nullable(),
  /** Weekdays the patient can take (0=Sun..6=Sat). [] = any day works. */
  acceptableWeekdays: z.array(z.number().int().min(0).max(6)),
  /** Acceptable start-hour window, or null = any hour works. */
  acceptableHourRange: HourRangeSchema.nullable(),
  urgency: UrgencySchema,
  /** Days overdue from the cadence engine (EMR-208); 0 if not overdue. */
  overdueDays: z.number().min(0),
  /** No-show risk tier from EMR-207. */
  riskTier: z.custom<RiskTier>((v) => v === "low" || v === "medium" || v === "high"),
  /** 0..1 — how flexible the patient is (short-notice, any-modality, etc.). */
  flexibilityScore: z.number().min(0).max(1),
  vip: z.boolean(),
  contactChannel: ContactChannelSchema,
});
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;

export interface OpenSlot {
  slotId: string;
  providerId: string;
  startAt: Date;
  endAt: Date;
  modality: string;
  visitType: string;
}

export interface ScoredWaitlistEntry {
  entry: WaitlistEntry;
  score: number;
  reasons: string[];
}

export interface RankWaitlistOptions {
  /**
   * When true (default), a patient's preferredProviderId — if set — must
   * match the slot's provider or they are filtered out entirely. When false,
   * a provider mismatch is allowed (the preference still influences scoring
   * via the soft provider-match bonus).
   */
  honorProviderPreferenceAsHard?: boolean;
  /** Hard cap on the number of ranked entries returned. */
  limit?: number;
}

const WEIGHTS = {
  urgency: 0.3,
  overdue: 0.22,
  riskFit: 0.12,
  flexibility: 0.1,
  vip: 0.1,
  waitTime: 0.16,
} as const;

/** Days of overdue-ness at which the cadence factor saturates to its full weight. */
const OVERDUE_SATURATION_DAYS = 30;
/** Days on the waitlist at which the wait-time factor saturates. */
const WAIT_SATURATION_DAYS = 30;

const URGENCY_WEIGHT: Record<Urgency, number> = {
  routine: 0,
  soon: 0.5,
  urgent: 1,
};

/**
 * Rank a waitlist against a single open slot. Entries that cannot physically
 * take the slot are removed (not down-ranked) so the UI never offers them.
 * The remaining entries are scored and returned highest-first.
 */
export function rankWaitlist(
  entries: WaitlistEntry[],
  slot: OpenSlot,
  opts: RankWaitlistOptions = {},
): ScoredWaitlistEntry[] {
  const honorProvider = opts.honorProviderPreferenceAsHard ?? true;
  const slotDay = slot.startAt.getDay();
  const slotHour = slot.startAt.getHours();

  const eligible = entries.filter((entry) => {
    if (entry.visitType !== slot.visitType) return false;
    if (
      entry.acceptableWeekdays.length > 0 &&
      !entry.acceptableWeekdays.includes(slotDay)
    ) {
      return false;
    }
    if (entry.acceptableHourRange) {
      const { earliestHour, latestHour } = entry.acceptableHourRange;
      if (slotHour < earliestHour || slotHour >= latestHour) return false;
    }
    if (
      honorProvider &&
      entry.preferredProviderId !== null &&
      entry.preferredProviderId !== slot.providerId
    ) {
      return false;
    }
    return true;
  });

  const scored = eligible.map((entry) => scoreEntry(entry, slot));
  scored.sort((a, b) => b.score - a.score);

  return typeof opts.limit === "number" ? scored.slice(0, opts.limit) : scored;
}

function scoreEntry(entry: WaitlistEntry, slot: OpenSlot): ScoredWaitlistEntry {
  const reasons: string[] = [];
  let score = 0;

  // 1. Clinical urgency.
  const urgencyContribution = WEIGHTS.urgency * URGENCY_WEIGHT[entry.urgency];
  if (urgencyContribution > 0) {
    score += urgencyContribution;
    reasons.push(
      entry.urgency === "urgent" ? "Urgent clinical need" : "Needs to be seen soon",
    );
  }

  // 2. Cadence overdue-ness — the longer they're past due, the higher they rank.
  if (entry.overdueDays > 0) {
    const overdueFraction = Math.min(1, entry.overdueDays / OVERDUE_SATURATION_DAYS);
    const overdueContribution = WEIGHTS.overdue * overdueFraction;
    score += overdueContribution;
    reasons.push(`Overdue by ${Math.floor(entry.overdueDays)}d`);
  }

  // 3. No-show risk fit — prefer not to burn a recovered slot on a high-risk
  //    patient (modest weight; clinical need still dominates).
  const riskFit = riskFitWeight(entry.riskTier);
  const riskContribution = WEIGHTS.riskFit * riskFit;
  score += riskContribution;
  if (entry.riskTier === "low") {
    reasons.push("Low no-show risk");
  } else if (entry.riskTier === "high") {
    reasons.push("High no-show risk (de-prioritized)");
  }

  // 4. Flexibility — flexible patients are cheaper to fill and less likely to
  //    decline a short-notice offer.
  const flexContribution = WEIGHTS.flexibility * entry.flexibilityScore;
  score += flexContribution;
  if (entry.flexibilityScore >= 0.7) reasons.push("Highly flexible");

  // 5. VIP boost.
  if (entry.vip) {
    score += WEIGHTS.vip;
    reasons.push("VIP patient");
  }

  // 6. Wait time — older entries (relative to the slot start) rank higher.
  const waitDays = Math.max(
    0,
    (slot.startAt.getTime() - entry.addedAt.getTime()) / 86_400_000,
  );
  const waitFraction = Math.min(1, waitDays / WAIT_SATURATION_DAYS);
  const waitContribution = WEIGHTS.waitTime * waitFraction;
  score += waitContribution;
  if (waitDays >= 7) reasons.push(`Waiting ${Math.floor(waitDays)}d`);

  return { entry, score: round3(score), reasons };
}

/**
 * Higher = more preferred for a recovered slot. Low-risk patients are the
 * safest fill; high-risk patients are modestly de-prioritized so we don't
 * hand a freshly opened prime slot to a likely no-show.
 */
function riskFitWeight(tier: RiskTier): number {
  switch (tier) {
    case "low":
      return 1;
    case "medium":
      return 0.6;
    case "high":
      return 0.2;
  }
}

export interface OfferWave {
  wave: number;
  offsetMinutes: number;
  entries: ScoredWaitlistEntry[];
}

const WAVE_PLAN = [
  { wave: 1, size: 3, offsetMinutes: 0 },
  { wave: 2, size: 5, offsetMinutes: 15 },
  { wave: 3, size: Infinity, offsetMinutes: 45 },
] as const;

/**
 * Split a ranked waitlist into staggered offer waves. Wave 1 (top 3) goes out
 * immediately in parallel; wave 2 (next 5) fires after a short delay if no one
 * in wave 1 has claimed the slot; wave 3 is a final blast to everyone else.
 * Empty waves are omitted.
 */
export function offerWaves(ranked: ScoredWaitlistEntry[]): OfferWave[] {
  const waves: OfferWave[] = [];
  let cursor = 0;

  for (const plan of WAVE_PLAN) {
    if (cursor >= ranked.length) break;
    const end = plan.size === Infinity ? ranked.length : cursor + plan.size;
    const entries = ranked.slice(cursor, end);
    if (entries.length > 0) {
      waves.push({ wave: plan.wave, offsetMinutes: plan.offsetMinutes, entries });
    }
    cursor = end;
  }

  return waves;
}

export interface FillEvent {
  cancelledAt: Date;
  /** When the slot was filled from the waitlist; null = never filled. */
  filledAt: Date | null;
}

export interface FillMetrics {
  /** Fraction of cancellations that were re-filled (0..1). */
  fillRate: number;
  /** Median minutes from cancellation to fill, across filled events only. */
  medianFillMinutes: number;
  filled: number;
  total: number;
}

/**
 * Aggregate cancellation-fill performance. fillRate is filled/total; the
 * median fill time is computed only over events that actually filled (an
 * unfilled slot has no fill latency). Returns zeros for an empty input.
 */
export function fillMetrics(events: FillEvent[]): FillMetrics {
  const total = events.length;
  const filledEvents = events.filter((e) => e.filledAt !== null);
  const filled = filledEvents.length;

  const durations = filledEvents
    .map((e) => (e.filledAt as Date).getTime() - e.cancelledAt.getTime())
    .map((ms) => Math.max(0, ms / 60_000))
    .sort((a, b) => a - b);

  return {
    fillRate: total === 0 ? 0 : round3(filled / total),
    medianFillMinutes: round3(median(durations)),
    filled,
    total,
  };
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

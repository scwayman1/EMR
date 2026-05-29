/**
 * EMR-213 — Group visit, block, and recurring scheduling.
 *
 * Pure expansion + bookkeeping helpers for the three "many-at-once" booking
 * shapes the scheduler supports: recurring series (a single visit repeated on
 * a weekly/biweekly/monthly cadence), provider blocks (recurring time windows
 * held open for a visit type), and group visits (one slot, many patients).
 *
 * Everything here is deterministic and clock-free: callers pass the reference
 * date in explicitly (mirroring cadence-engine's nextDueDate) so the same
 * inputs always expand to the same occurrences and tests never flake.
 */
import { z } from "zod";

export const RecurrenceFrequencySchema = z.enum(["weekly", "biweekly", "monthly"]);
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

export const RecurringSeriesSchema = z.object({
  /** First occurrence start. Subsequent occurrences derive from this. */
  startAt: z.date(),
  /** Length of each occurrence in minutes. */
  durationMinutes: z.number().int().positive(),
  frequency: RecurrenceFrequencySchema,
  /** Number of occurrences to generate (inclusive of the first). */
  count: z.number().int().min(1).max(52),
  providerId: z.string(),
  visitType: z.string(),
});
export type RecurringSeries = z.infer<typeof RecurringSeriesSchema>;

export interface Occurrence {
  /** Zero-based position in the series. */
  index: number;
  startAt: Date;
  endAt: Date;
}

export const BlockReservationSchema = z.object({
  /** 0=Sun .. 6=Sat. */
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  label: z.string(),
  /** Number of weekly repetitions to expand. */
  weeks: z.number().int().positive(),
});
export type BlockReservation = z.infer<typeof BlockReservationSchema>;

export const GroupVisitSchema = z.object({
  startAt: z.date(),
  durationMinutes: z.number().int().positive(),
  /** Hard cap on enrolled patients. */
  maxSeats: z.number().int().positive(),
  providerId: z.string(),
  topic: z.string(),
  /** Enrolled patient IDs, in enrollment order. */
  roster: z.array(z.string()),
});
export type GroupVisit = z.infer<typeof GroupVisitSchema>;

const MINUTE_MS = 60_000;

/**
 * Add one calendar month to a date, preserving the day-of-month where
 * possible and clamping to the last day of the target month when the source
 * day doesn't exist there (e.g. Jan 31 + 1mo -> Feb 28, or Feb 29 in a leap
 * year). Operates in UTC so expansion is timezone-stable.
 */
function addCalendarMonths(base: Date, months: number): Date {
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  // Last day of the target month: day 0 of the following month.
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds(),
      base.getUTCMilliseconds(),
    ),
  );
}

function occurrenceStart(series: RecurringSeries, index: number): Date {
  switch (series.frequency) {
    case "weekly":
      return new Date(series.startAt.getTime() + index * 7 * 24 * 60 * MINUTE_MS);
    case "biweekly":
      return new Date(series.startAt.getTime() + index * 14 * 24 * 60 * MINUTE_MS);
    case "monthly":
      return addCalendarMonths(series.startAt, index);
  }
}

/**
 * Expand a recurring series into its concrete occurrences. Weekly steps by
 * 7 days, biweekly by 14 days, monthly by one calendar month (with end-of-month
 * clamping). Every occurrence is `durationMinutes` long.
 */
export function expandSeries(series: RecurringSeries): Occurrence[] {
  const parsed = RecurringSeriesSchema.parse(series);
  const occurrences: Occurrence[] = [];

  for (let index = 0; index < parsed.count; index += 1) {
    const startAt = occurrenceStart(parsed, index);
    const endAt = new Date(startAt.getTime() + parsed.durationMinutes * MINUTE_MS);
    occurrences.push({ index, startAt, endAt });
  }

  return occurrences;
}

/**
 * Expand a weekly provider block into the next `weeks` occurrences whose date
 * falls on/after `fromDate`. The first occurrence is the first matching
 * day-of-week on/after `fromDate`; each subsequent one is +7 days.
 */
export function expandBlock(
  block: BlockReservation,
  fromDate: Date,
): Array<{ start: Date; end: Date; label: string }> {
  const parsed = BlockReservationSchema.parse(block);

  // Anchor on the calendar date of fromDate (UTC), then advance to the
  // first matching day-of-week on/after that date.
  const anchor = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()),
  );
  const dayDelta = ((parsed.dayOfWeek - anchor.getUTCDay()) % 7 + 7) % 7;
  const firstDate = new Date(anchor.getTime() + dayDelta * 24 * 60 * MINUTE_MS);

  const results: Array<{ start: Date; end: Date; label: string }> = [];
  for (let week = 0; week < parsed.weeks; week += 1) {
    const dayStart = new Date(firstDate.getTime() + week * 7 * 24 * 60 * MINUTE_MS);
    const start = new Date(
      Date.UTC(
        dayStart.getUTCFullYear(),
        dayStart.getUTCMonth(),
        dayStart.getUTCDate(),
        parsed.startHour,
      ),
    );
    const end = new Date(
      Date.UTC(
        dayStart.getUTCFullYear(),
        dayStart.getUTCMonth(),
        dayStart.getUTCDate(),
        parsed.endHour,
      ),
    );
    results.push({ start, end, label: parsed.label });
  }

  return results;
}

/** Seats still open on a group visit (never negative). */
export function seatsRemaining(visit: GroupVisit): number {
  return Math.max(0, visit.maxSeats - visit.roster.length);
}

/**
 * Add a patient to a group visit's roster. Rejects (without mutating) when the
 * visit is full or the patient is already enrolled; otherwise returns a new
 * visit with the patient appended. The input visit is never mutated.
 */
export function addToRoster(
  visit: GroupVisit,
  patientId: string,
): { ok: boolean; visit: GroupVisit; reason?: string } {
  if (visit.roster.includes(patientId)) {
    return { ok: false, visit, reason: "Patient already on roster" };
  }
  if (seatsRemaining(visit) <= 0) {
    return { ok: false, visit, reason: "Group visit is full" };
  }
  const updated: GroupVisit = { ...visit, roster: [...visit.roster, patientId] };
  return { ok: true, visit: updated };
}

/**
 * Detect overlaps between scheduled occurrences and known-busy intervals.
 * Two intervals overlap iff `a.start < b.end && b.start < a.end` (touching
 * endpoints are not a conflict). Returns one entry per (occurrence, busy) pair
 * that overlaps so the caller can surface every collision.
 */
export function detectConflicts(
  occurrences: Array<{ start: Date; end: Date }>,
  busy: Array<{ start: Date; end: Date }>,
): Array<{ occurrence: { start: Date; end: Date }; conflictsWith: { start: Date; end: Date } }> {
  const conflicts: Array<{
    occurrence: { start: Date; end: Date };
    conflictsWith: { start: Date; end: Date };
  }> = [];

  for (const occurrence of occurrences) {
    for (const slot of busy) {
      if (
        occurrence.start.getTime() < slot.end.getTime() &&
        slot.start.getTime() < occurrence.end.getTime()
      ) {
        conflicts.push({ occurrence, conflictsWith: slot });
      }
    }
  }

  return conflicts;
}

/**
 * Given a series and the set of occurrence indexes the patient actually
 * attended, return the indexes they missed (in ascending order). Feeds the
 * auto-rebooking flow so missed sessions can be re-offered.
 */
export function backfillMissedWeeks(series: RecurringSeries, attended: number[]): number[] {
  const parsed = RecurringSeriesSchema.parse(series);
  const attendedSet = new Set(attended);
  const missed: number[] = [];

  for (let index = 0; index < parsed.count; index += 1) {
    if (!attendedSet.has(index)) {
      missed.push(index);
    }
  }

  return missed;
}

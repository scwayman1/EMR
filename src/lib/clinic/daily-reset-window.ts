// EMR-575 — Daily reset window for the Command Center bottom-row tiles.
//
// Clinical Flow and Clinical Discovery both display "today's" activity, but
// "today" for a clinician's narrative arc doesn't snap at midnight. Dr.
// Patel's directive: the day rolls over at 23:59 local time so the last
// minute of the clinical day is still counted under that day's totals.
//
// `getDailyResetWindow(now)` returns the [start, end] interval whose start is
// the most recent 23:59 boundary on or before `now`, and whose end is `now`.
// Examples (local time):
//
//   now = 10:00 today          → start = 23:59 yesterday
//   now = 23:58 today          → start = 23:59 yesterday
//   now = 23:59 today exactly  → start = 23:59 today
//   now = 23:59:30 today       → start = 23:59 today
//
// Callers pass the window into Prisma `gte` / `lte` filters. The helper is
// pure — no Date.now(), no Intl side effects — so it's trivial to unit-test.
//
// Timezone handling: the `tz` parameter is accepted for forward
// compatibility (per-practice timezones land in a later phase). For now the
// helper computes against the host process's local timezone, which on Vercel
// is UTC; when we wire per-practice timezones, we'll translate `now` through
// `Intl.DateTimeFormat` before invoking. The signature is locked in so
// callers don't change.

export interface DailyResetWindow {
  start: Date;
  end: Date;
}

/**
 * Compute the daily-reset window ending at `now`.
 *
 * The window starts at the most recent 23:59:00 local-time boundary on or
 * before `now`. If `now` is exactly 23:59:00 or later in the day, the
 * window starts that same day; otherwise it starts at 23:59:00 of the
 * previous day.
 *
 * @param now anchor "current time" (callers usually pass `new Date()`)
 * @param _tz reserved for future per-practice timezone support
 */
export function getDailyResetWindow(
  now: Date,
  _tz?: string,
): DailyResetWindow {
  // Today's 23:59:00 boundary in the host's local timezone.
  const todayBoundary = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    0,
    0,
  );

  // If we haven't crossed today's boundary yet, the window opens at
  // yesterday's. Otherwise it opens at today's.
  const start =
    now.getTime() >= todayBoundary.getTime()
      ? todayBoundary
      : new Date(todayBoundary.getTime() - 86_400_000);

  return { start, end: new Date(now.getTime()) };
}

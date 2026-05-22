/**
 * EMR-780 — Birthday detection helpers.
 *
 * Birthdays are a calendar-date concept: a patient born on May 21 should
 * see the celebration whenever the local calendar reads May 21, regardless
 * of timezone offset against the stored timestamp. dateOfBirth is stored
 * as a UTC midnight DateTime in the schema, so we compare the *UTC*
 * month/day of the stored value against the *local* month/day today.
 */

export function birthdayMonthDay(
  dob: Date | string | null | undefined,
): { month: number; day: number } | null {
  if (!dob) return null;
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getUTCMonth(), day: d.getUTCDate() };
}

export function isBirthdayToday(
  dob: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const md = birthdayMonthDay(dob);
  if (!md) return false;
  return md.month === now.getMonth() && md.day === now.getDate();
}

/**
 * Milliseconds from `now` until 00:01 the following local day — used by
 * client components to schedule a one-shot timer that hides the birthday
 * indicator the moment the calendar rolls over.
 */
export function msUntilNextDayPlusOneMinute(now: Date = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    1,
    0,
    0,
  );
  return Math.max(0, next.getTime() - now.getTime());
}

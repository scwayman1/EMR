// ---------------------------------------------------------------------------
// Period helpers — every CFO report is bracketed by [start, end). All dates
// are resolved in UTC for determinism; the operator UI re-renders in the
// user's timezone.
// ---------------------------------------------------------------------------

import type { FinancialReportPeriod } from "@prisma/client";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  period: FinancialReportPeriod;
}

const MS_PER_DAY = 86_400_000;

function startOfDayUTC(d: Date): Date {
  const c = new Date(d);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

/** Monday-anchored ISO week start (Monday 00:00 UTC). */
export function startOfIsoWeek(d: Date): Date {
  const c = startOfDayUTC(d);
  const day = c.getUTCDay() || 7; // Sunday → 7
  if (day !== 1) c.setUTCDate(c.getUTCDate() - (day - 1));
  return c;
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1));
}

export function startOfYear(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

export function addMonths(d: Date, months: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

/** "Week of Apr 21" / "Mar 2026" / "Q1 2026" / "FY 2026" */
function formatLabel(start: Date, period: FinancialReportPeriod): string {
  const month = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = start.getUTCDate();
  const year = start.getUTCFullYear();
  switch (period) {
    case "weekly": return `Week of ${month} ${day}`;
    case "monthly": return `${start.toLocaleString("en-US", { month: "long", timeZone: "UTC" })} ${year}`;
    case "quarterly": return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${year}`;
    case "annual": return `FY ${year}`;
    case "daily": return `${month} ${day}, ${year}`;
    case "custom": return `${month} ${day}, ${year}`;
  }
}

export function rangeForPeriod(period: FinancialReportPeriod, anchor: Date = new Date()): DateRange {
  let start: Date;
  let end: Date;
  switch (period) {
    case "weekly":
      start = startOfIsoWeek(anchor);
      end = addDays(start, 7);
      break;
    case "monthly":
      start = startOfMonth(anchor);
      end = addMonths(start, 1);
      break;
    case "quarterly":
      start = startOfQuarter(anchor);
      end = addMonths(start, 3);
      break;
    case "annual":
      start = startOfYear(anchor);
      end = new Date(Date.UTC(start.getUTCFullYear() + 1, 0, 1));
      break;
    case "daily":
      start = startOfDayUTC(anchor);
      end = addDays(start, 1);
      break;
    case "custom":
      start = startOfDayUTC(anchor);
      end = addDays(start, 1);
      break;
  }
  return { start, end, label: formatLabel(start, period), period };
}

/** Previous comparable period (same length immediately prior). */
export function priorRange(range: DateRange): DateRange {
  const length = range.end.getTime() - range.start.getTime();
  const start = new Date(range.start.getTime() - length);
  const end = range.start;
  return { start, end, label: formatLabel(start, range.period), period: range.period };
}

/** Year-to-date through anchor. */
export function ytd(anchor: Date = new Date()): DateRange {
  const start = startOfYear(anchor);
  const end = startOfDayUTC(addDays(anchor, 1));
  return { start, end, label: `YTD ${start.getUTCFullYear()}`, period: "custom" };
}

/** Generate the last N weekly ranges ending at `anchor` (inclusive). */
export function lastNWeeks(n: number, anchor: Date = new Date()): DateRange[] {
  const current = startOfIsoWeek(anchor);
  const out: DateRange[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = addDays(current, -i * 7);
    const end = addDays(start, 7);
    out.push({ start, end, label: formatLabel(start, "weekly"), period: "weekly" });
  }
  return out;
}

/** Generate the last N monthly ranges ending at the month containing `anchor`. */
export function lastNMonths(n: number, anchor: Date = new Date()): DateRange[] {
  const cur = startOfMonth(anchor);
  const out: DateRange[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const start = addMonths(cur, -i);
    const end = addMonths(start, 1);
    out.push({ start, end, label: formatLabel(start, "monthly"), period: "monthly" });
  }
  return out;
}

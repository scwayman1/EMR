/**
 * Calendar primitive — date math + utility helpers
 * -------------------------------------------------
 * All dates are LOCAL. We deliberately avoid date-fns / dayjs (no new deps).
 */

import * as React from "react";
import type { CalendarEvent, CalendarEventColor } from "./types";

// ── Basic date math ─────────────────────────────────────────────

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function startOfWeek(d: Date): Date {
  // Sunday-first to match iOS Calendar default.
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

export function isPast(d: Date): boolean {
  return d.getTime() < Date.now();
}

// ── Event helpers ───────────────────────────────────────────────

export function eventStart(ev: CalendarEvent): Date {
  return new Date(ev.start);
}
export function eventEnd(ev: CalendarEvent): Date {
  return new Date(ev.end);
}

/** True if the event intersects the given local day. */
export function eventOnDay(ev: CalendarEvent, day: Date): boolean {
  const s = eventStart(ev);
  const e = eventEnd(ev);
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return s <= dayEnd && e >= dayStart;
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((ev) => eventOnDay(ev, day))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** True if the event has already ended relative to now. */
export function isEventPast(ev: CalendarEvent): boolean {
  return eventEnd(ev).getTime() < Date.now();
}

// ── Formatting ──────────────────────────────────────────────────

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

const monthYearFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export function formatMonthYear(d: Date): string {
  return monthYearFmt.format(d);
}

const weekdayShortFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dayNumFmt = new Intl.DateTimeFormat(undefined, { day: "numeric" });

export function formatWeekday(d: Date): string {
  return weekdayShortFmt.format(d);
}
export function formatDayNum(d: Date): string {
  return dayNumFmt.format(d);
}

/** Pretty "Apr 7 – 13, 2025" style range, collapsing same-month dashes. */
export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const a = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  }).format(start);
  const b = new Intl.DateTimeFormat(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${a} – ${b}`;
}

export function formatDayLong(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// ── Sunday-first weekday labels (e.g. "Sun", "Mon"…) ────────────

export function weekdayLabels(): string[] {
  const anchor = new Date(2024, 0, 7); // a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    weekdayShortFmt.format(addDays(anchor, i))
  );
}

// ── Color → tailwind class mapping for event blocks ─────────────

export function eventColorClasses(color: CalendarEventColor = "accent") {
  switch (color) {
    case "warning":
      return {
        bg: "bg-amber-100/80 dark:bg-amber-950/40",
        border: "border-amber-300/60 dark:border-amber-800/60",
        text: "text-amber-900 dark:text-amber-100",
        bar: "bg-amber-500",
      };
    case "danger":
      return {
        bg: "bg-rose-100/80 dark:bg-rose-950/40",
        border: "border-rose-300/60 dark:border-rose-800/60",
        text: "text-rose-900 dark:text-rose-100",
        bar: "bg-rose-500",
      };
    case "info":
      return {
        bg: "bg-sky-100/80 dark:bg-sky-950/40",
        border: "border-sky-300/60 dark:border-sky-800/60",
        text: "text-sky-900 dark:text-sky-100",
        bar: "bg-sky-500",
      };
    case "neutral":
      return {
        bg: "bg-neutral-100/80 dark:bg-neutral-900/60",
        border: "border-neutral-300/60 dark:border-neutral-800/60",
        text: "text-neutral-900 dark:text-neutral-100",
        bar: "bg-neutral-500",
      };
    case "accent":
    default:
      return {
        bg: "bg-accent-soft",
        border: "border-accent/20",
        text: "text-accent",
        bar: "bg-accent",
      };
  }
}

// ── Reduced motion hook ─────────────────────────────────────────

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

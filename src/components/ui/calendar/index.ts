/**
 * @leafjourney/ui/calendar — public surface
 *
 * Composable Apple-Calendar-flavored primitive. No new deps; built on
 * React + Tailwind + the existing DatePicker (PR #463).
 *
 * Usage:
 *   import { Calendar, CalendarMonth, type CalendarEvent } from "@/components/ui/calendar";
 */

export { Calendar } from "./calendar";
export type { CalendarProps } from "./calendar";

export { CalendarMonth } from "./calendar-month";
export type { CalendarMonthProps } from "./calendar-month";

export { CalendarWeek } from "./calendar-week";
export type { CalendarWeekProps } from "./calendar-week";

export { CalendarDay } from "./calendar-day";
export type { CalendarDayProps } from "./calendar-day";

export { CalendarToolbar } from "./calendar-toolbar";
export type { CalendarToolbarProps } from "./calendar-toolbar";

export { EventBlock } from "./event-block";
export type { EventBlockProps } from "./event-block";

export type {
  CalendarEvent,
  CalendarEventColor,
  CalendarView,
} from "./types";

export {
  eventsForDay,
  eventOnDay,
  isEventPast,
  formatTime,
  formatMonthYear,
  formatWeekRange,
  formatDayLong,
  startOfWeek,
  startOfMonth,
  startOfDay,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
} from "./utils";

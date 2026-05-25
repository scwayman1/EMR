/**
 * Calendar primitive — shared types
 * ----------------------------------
 * A thin, framework-agnostic CalendarEvent shape. Intentionally does NOT
 * mirror a Prisma model — callers map their domain entities (Appointment,
 * TelehealthVisit, etc.) into this interface at the edge.
 *
 * Times are ISO 8601 strings to keep server -> client transport simple.
 */

export type CalendarEventColor =
  | "accent"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

export interface CalendarEvent {
  id: string;
  /** ISO 8601 start instant. */
  start: string;
  /** ISO 8601 end instant. Must be > start. */
  end: string;
  title: string;
  description?: string;
  color?: CalendarEventColor;
  /** Optional EMR patient handle for linking. */
  patientId?: string;
  /** Optional click-through href. If absent, onClick fires instead. */
  href?: string;
}

export type CalendarView = "month" | "week" | "day";

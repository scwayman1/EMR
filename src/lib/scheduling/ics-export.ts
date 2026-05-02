/**
 * iCal / Google Calendar export — EMR-085
 *
 * Builds RFC 5545 (.ics) calendar bodies for Leafjourney appointments,
 * dose reminders, and follow-up tasks so patients and clinicians can pull
 * the schedule into Apple Calendar, Google Calendar, or Outlook directly.
 *
 * The implementation is a small, dependency-free serializer because we
 * only emit the subset of iCal we actually use (VEVENT with optional
 * VALARM). Full RFC compliance is overkill — every consumer we care
 * about happily ingests this minimal shape.
 */

export interface CalendarEvent {
  /** Stable id (UUID or "appt-<id>"). Used as UID in the .ics. */
  id: string;
  /** Short display title. */
  title: string;
  /** Optional long description shown in the event detail. */
  description?: string;
  /** ISO timestamp for event start. */
  startsAt: string;
  /** ISO timestamp for event end; defaults to start + 30min. */
  endsAt?: string;
  /** Location string (clinic name + room, telehealth URL, etc.). */
  location?: string;
  /** Email of the organizer (clinic / clinician). */
  organizerEmail?: string;
  /** Reminder offset in minutes before start (e.g. 15 = "15min before"). */
  reminderMinutes?: number[];
  /** Optional URL — Google Calendar shows a "View" link when present. */
  url?: string;
  /**
   * Recurrence rule body, e.g. "FREQ=DAILY;COUNT=10" for a 10-day
   * dose reminder. Pass-through to RRULE.
   */
  rrule?: string;
  /** Last-modified timestamp; defaults to now. */
  updatedAt?: string;
}

export interface CalendarFeed {
  /** Visible name in the calendar app's sidebar. */
  name: string;
  /** Free-text description for the feed. */
  description?: string;
  events: CalendarEvent[];
}

const PRODID = "-//Leafjourney//EMR Calendar 1.0//EN";

/** RFC 5545 dates use UTC "20251231T120000Z" form. */
function toIcsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for iCal export: ${iso}`);
  }
  const y = d.getUTCFullYear().toString().padStart(4, "0");
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mm = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

/**
 * iCal text fields are escaped per RFC 5545 §3.3.11. Backslashes,
 * commas, semicolons, and embedded newlines all need protection.
 */
export function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Wrap long lines per RFC 5545 §3.1 (75 octets, CRLF + space continuation). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  out.push(line.slice(i, i + 75));
  i += 75;
  while (i < line.length) {
    out.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return out.join("\r\n");
}

function plus30Min(iso: string): string {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + 30);
  return d.toISOString();
}

function buildAlarm(minutes: number): string[] {
  return [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder",
    `TRIGGER:-PT${minutes}M`,
    "END:VALARM",
  ];
}

function buildEvent(event: CalendarEvent): string[] {
  const lines: string[] = [];
  const dtStart = toIcsDate(event.startsAt);
  const dtEnd = toIcsDate(event.endsAt ?? plus30Min(event.startsAt));
  const dtStamp = toIcsDate(event.updatedAt ?? new Date().toISOString());

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${event.id}@leafjourney.com`);
  lines.push(`DTSTAMP:${dtStamp}`);
  lines.push(`DTSTART:${dtStart}`);
  lines.push(`DTEND:${dtEnd}`);
  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  if (event.organizerEmail) {
    lines.push(`ORGANIZER:mailto:${event.organizerEmail}`);
  }
  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`);
  }
  for (const minutes of event.reminderMinutes ?? []) {
    lines.push(...buildAlarm(minutes));
  }
  lines.push("END:VEVENT");
  return lines;
}

/** Build a complete VCALENDAR body for a feed. */
export function buildCalendar(feed: CalendarFeed): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:${PRODID}`);
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeIcsText(feed.name)}`);
  if (feed.description) {
    lines.push(`X-WR-CALDESC:${escapeIcsText(feed.description)}`);
  }
  for (const event of feed.events) {
    lines.push(...buildEvent(event));
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Build a single-event .ics body — used by "Add to calendar" buttons. */
export function buildSingleEvent(event: CalendarEvent): string {
  return buildCalendar({ name: event.title, events: [event] });
}

/**
 * Build a Google Calendar "Add event" URL. Browsers without a calendar
 * app installed can land here as a fallback for the .ics download.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = toIcsDate(event.startsAt);
  const end = toIcsDate(event.endsAt ?? plus30Min(event.startsAt));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build the headers + body for a Next.js route handler that serves
 * .ics. Centralized so both /api/calendar/feed and per-event downloads
 * use the same content-type + filename rules.
 */
export function asIcsResponse(
  body: string,
  filename = "leafjourney.ics",
): { headers: Record<string, string>; body: string } {
  return {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, max-age=0, must-revalidate",
    },
    body,
  };
}

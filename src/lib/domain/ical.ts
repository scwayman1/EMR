/**
 * ICS / iCalendar file generator (EMR-085)
 *
 * Pure-function ICS file builder. RFC 5545 compliant enough for Apple
 * Calendar, Google Calendar, Outlook. Outputs CRLF line endings as
 * required by the spec.
 *
 * No external dependency — keeps the bundle small and avoids dragging
 * in date-fns or another date library.
 */

export interface IcsEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  organizerName?: string;
  organizerEmail?: string;
}

/** Format a Date as ICS UTC datetime: 20260411T143000Z */
function formatIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

/** Escape ICS text per RFC 5545 §3.3.11 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/**
 * Fold long ICS lines per RFC 5545 §3.1: lines longer than 75 octets
 * must be wrapped with CRLF + space.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  // First chunk: 75 chars
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  // Continuation chunks: 74 chars (1 octet for the leading space)
  while (remaining.length > 0) {
    chunks.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join("\r\n");
}

/**
 * Build an ICS calendar containing the given events.
 */
export function buildIcs(
  events: IcsEvent[],
  options: { calendarName?: string; productId?: string } = {},
): string {
  const productId =
    options.productId ?? "-//Leafjourney//Patient Portal//EN";
  const calendarName = options.calendarName ?? "Leafjourney Appointments";
  const now = formatIcsDate(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${productId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${formatIcsDate(event.start)}`);
    lines.push(`DTEND:${formatIcsDate(event.end)}`);
    lines.push(foldLine(`SUMMARY:${escapeIcsText(event.summary)}`));
    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
    }
    if (event.location) {
      lines.push(foldLine(`LOCATION:${escapeIcsText(event.location)}`));
    }
    if (event.url) {
      lines.push(foldLine(`URL:${event.url}`));
    }
    if (event.organizerName && event.organizerEmail) {
      lines.push(
        foldLine(
          `ORGANIZER;CN=${escapeIcsText(event.organizerName)}:mailto:${event.organizerEmail}`,
        ),
      );
    }
    lines.push("STATUS:CONFIRMED");
    lines.push("SEQUENCE:0");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line endings
  return lines.join("\r\n") + "\r\n";
}

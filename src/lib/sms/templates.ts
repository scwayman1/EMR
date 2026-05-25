// SMS templates for appointment reminders.
//
// Templates are deterministic — no LLM dependency — so they're safe to
// run from a 15-minute cron tick without paying token cost per send.
// The agent layer can still draft warmer copy when desired; these
// templates are the fallback and what the day-offset reminders use.

export type ReminderOffset = "7day" | "2day" | "1day";

export interface ReminderTemplateInput {
  patientFirstName: string;
  providerName: string;
  appointmentAt: Date;
  /** "video" | "in_person" | "phone" — copy adapts to each. */
  modality: string;
  /** IANA timezone for formatting the appointment time. */
  timezone?: string;
  /** Optional short reschedule URL — added as a tail. */
  rescheduleUrl?: string;
}

const OFFSET_PHRASE: Record<ReminderOffset, string> = {
  "7day": "next week",
  "2day": "in 2 days",
  "1day": "tomorrow",
};

function formatWhen(at: Date, timezone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(at);
  } catch {
    return at.toISOString();
  }
}

function modalityCopy(modality: string): string {
  if (modality === "video") return "video visit";
  if (modality === "in_person") return "in-person visit";
  if (modality === "phone") return "phone visit";
  return "visit";
}

/**
 * Render the SMS body for an appointment reminder. The body is intentionally
 * short — SMS segments cost money and patients respond better to brief copy.
 */
export function renderAppointmentReminder(
  offset: ReminderOffset,
  input: ReminderTemplateInput,
): string {
  const when = formatWhen(input.appointmentAt, input.timezone);
  const phrase = OFFSET_PHRASE[offset];
  const visit = modalityCopy(input.modality);
  const provider = input.providerName.trim() || "your care team";
  const name = input.patientFirstName.trim() || "there";

  const base =
    offset === "1day"
      ? `Hi ${name}, this is a friendly reminder of your ${visit} with ${provider} tomorrow at ${when}.`
      : offset === "2day"
        ? `Hi ${name}, your ${visit} with ${provider} is ${phrase} (${when}).`
        : `Hi ${name}, you have a ${visit} with ${provider} ${phrase} on ${when}. We'll send another reminder closer to the date.`;

  const tail = input.rescheduleUrl
    ? ` Need to change it? ${input.rescheduleUrl}`
    : " Reply C to confirm or R to reschedule.";

  return `${base}${tail}`;
}

/**
 * Pick the reminder offset matching the current time-until-appointment.
 *
 * The scheduler ticks every 15 minutes; we fire a reminder when the
 * appointment is within that tick's window for one of the three target
 * day offsets. Window is [target - 15 min, target] so an appointment
 * exactly 7d/2d/1d out is always caught by the next tick.
 *
 * Returns null when the appointment isn't in any window — caller skips.
 */
export function pickReminderOffset(
  msUntilAppointment: number,
  tickIntervalMs: number = 15 * 60_000,
): ReminderOffset | null {
  const day = 24 * 60 * 60_000;
  const targets: Array<[ReminderOffset, number]> = [
    ["7day", 7 * day],
    ["2day", 2 * day],
    ["1day", 1 * day],
  ];
  for (const [offset, target] of targets) {
    if (
      msUntilAppointment <= target &&
      msUntilAppointment > target - tickIntervalMs
    ) {
      return offset;
    }
  }
  return null;
}

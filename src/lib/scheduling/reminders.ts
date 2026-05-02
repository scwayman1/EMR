/**
 * EMR-211 — Reminder orchestration.
 *
 * Composes the reminder timeline for a single appointment. Returns a list
 * of "ReminderJob" descriptors keyed by channel + send-at — these are
 * intended to be enqueued onto the AgentJob queue and dispatched by the
 * SMS/email/push workers that already exist in the comms track.
 *
 * Cadence (default):
 *   - T-7 days   → email (informational, "save the date")
 *   - T-48 hours → SMS or email (channel preference)
 *   - T-24 hours → SMS + push (with confirm/reschedule CTAs)
 *   - T-2 hours  → push only ("you're up at 10am")
 *
 * High no-show risk patients get an extra T-3d SMS and a T-30m live call
 * task (queued for the front desk). Confirmation responses cancel any
 * pending reminders downstream so we don't keep pinging confirmed patients.
 */
import { z } from "zod";
import { tierPlaybook, type RiskTier } from "./no-show-model";

export type ReminderChannel = "sms" | "email" | "push" | "voice_call";

export interface ReminderJob {
  /** Stable id derived from appointment id + offset, for idempotent enqueue. */
  jobKey: string;
  appointmentId: string;
  patientId: string;
  channel: ReminderChannel;
  /** When to actually send the reminder. */
  sendAt: Date;
  /** Hours before appointment start (for logging / dashboards). */
  offsetHours: number;
  /** Template id the worker will resolve at send time. */
  template: ReminderTemplate;
  /** Required action: just notify, or expect a confirm/reschedule reply. */
  expectsResponse: boolean;
  /** If a later reminder is suppressed by an earlier confirmation, mark it. */
  suppressedBy?: ReminderChannel;
}

export type ReminderTemplate =
  | "save_the_date"
  | "two_day_heads_up"
  | "day_before_confirm"
  | "morning_of"
  | "imminent_push"
  | "live_call_outreach";

export const ChannelPrefsSchema = z.object({
  smsOptIn: z.boolean(),
  emailOptIn: z.boolean(),
  pushOptIn: z.boolean(),
  /** Quiet hours — local timezone — we never send SMS/push during these. */
  quietHours: z.object({ startHour: z.number().min(0).max(23), endHour: z.number().min(0).max(23) }).nullable(),
  /** IANA tz, e.g. "America/New_York". */
  timezone: z.string(),
  /** Patient's stated preferred channel for confirmations. */
  preferredChannel: z.enum(["sms", "email", "push"]),
});
export type ChannelPrefs = z.infer<typeof ChannelPrefsSchema>;

export interface BuildReminderInput {
  appointmentId: string;
  patientId: string;
  startAt: Date;
  riskTier: RiskTier;
  prefs: ChannelPrefs;
  /** When the appointment was booked — clamps reminders that would fire in the past. */
  bookedAt: Date;
  /** True if patient already confirmed via any earlier touch — short-circuits day-of nags. */
  preConfirmed: boolean;
}

interface PlannedReminder {
  offsetHours: number;
  channels: ReminderChannel[];
  template: ReminderTemplate;
  expectsResponse: boolean;
}

const DEFAULT_PLAN: PlannedReminder[] = [
  {
    offsetHours: 24 * 7,
    channels: ["email"],
    template: "save_the_date",
    expectsResponse: false,
  },
  {
    offsetHours: 48,
    channels: ["sms", "email"],
    template: "two_day_heads_up",
    expectsResponse: true,
  },
  {
    offsetHours: 24,
    channels: ["sms", "push"],
    template: "day_before_confirm",
    expectsResponse: true,
  },
  {
    offsetHours: 2,
    channels: ["push"],
    template: "imminent_push",
    expectsResponse: false,
  },
];

const HIGH_RISK_ADDITIONS: PlannedReminder[] = [
  {
    offsetHours: 72,
    channels: ["sms"],
    template: "two_day_heads_up",
    expectsResponse: true,
  },
  {
    offsetHours: 0.5,
    channels: ["voice_call"],
    template: "live_call_outreach",
    expectsResponse: true,
  },
];

/**
 * Build the reminder timeline. Honors channel opt-ins, quiet hours, and
 * the no-show tier playbook (more touches for high-risk patients).
 */
export function buildReminderPlan(input: BuildReminderInput): ReminderJob[] {
  const playbook = tierPlaybook(input.riskTier);
  const plan = [...DEFAULT_PLAN];
  if (input.riskTier === "high") plan.push(...HIGH_RISK_ADDITIONS);

  // Trim to the playbook's reminder budget. Earlier reminders are most
  // valuable (save-the-date, 48h), so we keep them and drop redundant
  // imminent ones if the playbook says fewer touches.
  const budget = Math.max(playbook.remindersToSend + (input.riskTier === "high" ? 2 : 0), 1);
  const sortedByImportance = [...plan].sort((a, b) => importance(b) - importance(a));
  const allowed = new Set(sortedByImportance.slice(0, budget).map((p) => p.offsetHours));
  const filteredPlan = plan.filter((p) => allowed.has(p.offsetHours));

  const jobs: ReminderJob[] = [];
  for (const item of filteredPlan) {
    const sendAt = new Date(input.startAt.getTime() - item.offsetHours * 3_600_000);
    if (sendAt.getTime() < input.bookedAt.getTime()) continue;

    // If patient already confirmed, drop nag-style reminders.
    if (input.preConfirmed && (item.template === "day_before_confirm" || item.template === "two_day_heads_up")) {
      continue;
    }

    for (const channel of item.channels) {
      if (!channelPermitted(channel, input.prefs)) continue;

      const inQuiet = withinQuietHours(sendAt, input.prefs);
      const nudged = inQuiet && (channel === "sms" || channel === "push" || channel === "voice_call")
        ? shiftOutOfQuietHours(sendAt, input.prefs)
        : sendAt;

      jobs.push({
        jobKey: `${input.appointmentId}:${item.offsetHours}:${channel}`,
        appointmentId: input.appointmentId,
        patientId: input.patientId,
        channel,
        sendAt: nudged,
        offsetHours: item.offsetHours,
        template: item.template,
        expectsResponse: item.expectsResponse,
      });
    }
  }

  return dedupe(jobs);
}

/**
 * Cancel any reminders that haven't sent yet because the patient confirmed
 * (or the appointment was cancelled). Caller passes in the existing jobs;
 * we return the subset to suppress so the worker can no-op them.
 */
export function suppressFutureReminders(
  jobs: ReminderJob[],
  trigger: { confirmedAt: Date; channel: ReminderChannel },
): ReminderJob[] {
  return jobs
    .filter((j) => j.sendAt.getTime() > trigger.confirmedAt.getTime())
    .filter((j) => j.template !== "imminent_push") // morning-of push is informational
    .map((j) => ({ ...j, suppressedBy: trigger.channel }));
}

function channelPermitted(channel: ReminderChannel, prefs: ChannelPrefs): boolean {
  switch (channel) {
    case "sms": return prefs.smsOptIn;
    case "email": return prefs.emailOptIn;
    case "push": return prefs.pushOptIn;
    case "voice_call": return true; // operational override; front desk can always call
  }
}

function withinQuietHours(sendAt: Date, prefs: ChannelPrefs): boolean {
  if (!prefs.quietHours) return false;
  const localHour = localHourInTimezone(sendAt, prefs.timezone);
  const { startHour, endHour } = prefs.quietHours;
  if (startHour === endHour) return false;
  if (startHour < endHour) return localHour >= startHour && localHour < endHour;
  // wraps midnight (e.g. 22 → 7)
  return localHour >= startHour || localHour < endHour;
}

function shiftOutOfQuietHours(sendAt: Date, prefs: ChannelPrefs): Date {
  if (!prefs.quietHours) return sendAt;
  const out = new Date(sendAt);
  // Walk forward 1h at a time until we exit quiet hours. Bounded loop so
  // a misconfigured 24h "quiet" window can't infinite-loop.
  for (let i = 0; i < 24; i++) {
    if (!withinQuietHours(out, prefs)) return out;
    out.setHours(out.getHours() + 1);
  }
  return sendAt;
}

function localHourInTimezone(d: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(d);
  const hourPart = parts.find((p) => p.type === "hour");
  return hourPart ? Number(hourPart.value) : d.getHours();
}

function importance(p: PlannedReminder): number {
  // The 24h confirm and 48h heads-up are the most operationally valuable.
  if (p.offsetHours === 24) return 100;
  if (p.offsetHours === 48) return 90;
  if (p.offsetHours === 24 * 7) return 60;
  if (p.offsetHours === 72) return 70;
  if (p.offsetHours === 2) return 40;
  return 30;
}

function dedupe(jobs: ReminderJob[]): ReminderJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    if (seen.has(j.jobKey)) return false;
    seen.add(j.jobKey);
    return true;
  });
}

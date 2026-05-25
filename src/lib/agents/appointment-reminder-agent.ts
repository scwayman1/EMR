import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent, AgentContext } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import {
  pickReminderOffset,
  renderAppointmentReminder,
  type ReminderOffset,
} from "@/lib/sms/templates";
import { getSmsAdapter, normalizePhone } from "@/lib/sms/adapter";

// ---------------------------------------------------------------------------
// Appointment Reminder Agent
// ---------------------------------------------------------------------------
// Two modes:
//
// 1. Default ("draft") mode — reads upcoming appointments within N hours and
//    drafts reminder copy per appointment. Approval-gated: the human clicks
//    Send after reviewing.
//
// 2. SMS auto-send mode (sendSms: true) — used by the scheduler. For each
//    upcoming appointment whose time-until-appointment falls into the 7-day,
//    2-day, or 1-day tick window, render the appropriate template and dispatch
//    via the SMS adapter. Idempotency is enforced by checking AuditLog for a
//    matching `sms.appointment.reminder.sent` entry.
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
  hoursAhead: z.number().int().positive().max(24 * 14),
  sendSms: z.boolean().optional(),
});

const output = z.array(
  z.object({
    appointmentId: z.string(),
    patientMessage: z.string(),
    reminderType: z.enum(["7day", "2day", "1day", "24h", "1h", "15m"]),
    smsSent: z.boolean().optional(),
    smsMessageId: z.string().optional(),
  })
);

export type ShortReminderType = "24h" | "1h" | "15m";
export type AnyReminderType = ShortReminderType | ReminderOffset;

function shortReminderTypeFor(hoursUntil: number): ShortReminderType {
  if (hoursUntil <= 0.3) return "15m";
  if (hoursUntil <= 2) return "1h";
  return "24h";
}

/**
 * Pick the reminder type: prefers the day-offset windows (7d/2d/1d) used by
 * the SMS scheduler, falls back to short-window types (24h/1h/15m) used by
 * the manual draft flow.
 */
export function reminderTypeFor(
  msUntil: number,
  tickIntervalMs?: number,
): AnyReminderType {
  const day = pickReminderOffset(msUntil, tickIntervalMs);
  if (day) return day;
  return shortReminderTypeFor(msUntil / (60 * 60_000));
}

function formatLocal(date: Date): string {
  try {
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return date.toISOString();
  }
}

export const appointmentReminderAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "appointmentReminder",
  version: "1.1.0",
  description:
    "Drafts reminder message content for each upcoming appointment within the " +
    "given hours window. When `sendSms` is set, also dispatches the matching " +
    "7d/2d/1d SMS reminder via the SMS adapter (idempotent per appointment+type).",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.message.draft"],
  requiresApproval: true,

  async run({ patientId, hoursAhead, sendSms }, ctx) {
    ctx.assertCan("read.patient");

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
        startAt: { gte: now, lte: windowEnd },
        status: { in: ["requested", "confirmed"] },
      },
      include: { provider: { include: { user: true } } },
      orderBy: { startAt: "asc" },
    });

    const results: z.infer<typeof output> = [];

    for (const appt of appointments) {
      const apptAt = new Date(appt.startAt);
      const msUntil = apptAt.getTime() - now.getTime();
      const reminderType = reminderTypeFor(msUntil);
      const isDayOffset =
        reminderType === "7day" || reminderType === "2day" || reminderType === "1day";

      const providerName = appt.provider?.user
        ? `${appt.provider.user.firstName ?? ""} ${appt.provider.user.lastName ?? ""}`.trim()
        : "your provider";
      const when = formatLocal(apptAt);
      const modality = appt.modality ?? "visit";

      // For day-offset reminders we use the deterministic SMS template —
      // it is the message that will actually be sent to the patient.
      let message: string;
      if (isDayOffset) {
        message = renderAppointmentReminder(reminderType as ReminderOffset, {
          patientFirstName: patient.firstName,
          providerName,
          appointmentAt: apptAt,
          modality,
        });
      } else {
        message = await draftShortReminder({
          ctx,
          reminderType: reminderType as ShortReminderType,
          patientFirstName: patient.firstName,
          when,
          modality,
          providerName,
        });
      }

      let smsSent = false;
      let smsMessageId: string | undefined;

      if (sendSms && isDayOffset && patient.phone) {
        const phone = normalizePhone(patient.phone);
        if (!phone) {
          ctx.log("warn", "Skipping SMS — phone not normalizable", {
            appointmentId: appt.id,
          });
        } else {
          const alreadySent = await hasReminderBeenSent(appt.id, reminderType);
          if (alreadySent) {
            ctx.log("info", "Skipping SMS — already sent", {
              appointmentId: appt.id,
              reminderType,
            });
          } else {
            const adapter = getSmsAdapter();
            const res = await adapter.send({
              to: phone,
              body: message,
              context: {
                appointmentId: appt.id,
                reminderType,
                patientId,
              },
            });
            smsSent = res.ok;
            smsMessageId = res.messageId;
            if (res.ok) {
              await writeAgentAudit(
                "appointmentReminder",
                "1.1.0",
                patient.organizationId,
                "sms.appointment.reminder.sent",
                { type: "Appointment", id: appt.id },
                {
                  reminderType,
                  adapter: res.adapter,
                  messageId: res.messageId,
                },
              );
            } else {
              ctx.log("warn", "SMS send failed", {
                appointmentId: appt.id,
                error: res.error,
              });
            }
          }
        }
      }

      results.push({
        appointmentId: appt.id,
        patientMessage: message,
        reminderType,
        smsSent,
        smsMessageId,
      });
    }

    await writeAgentAudit(
      "appointmentReminder",
      "1.1.0",
      patient.organizationId,
      sendSms ? "appointment.reminders.sent" : "appointment.reminders.drafted",
      { type: "Patient", id: patientId },
      {
        count: results.length,
        hoursAhead,
        smsSent: results.filter((r) => r.smsSent).length,
      },
    );

    ctx.log("info", "Appointment reminders processed", {
      count: results.length,
      hoursAhead,
      smsSent: results.filter((r) => r.smsSent).length,
    });

    return results;
  },
};

interface DraftArgs {
  ctx: AgentContext;
  reminderType: ShortReminderType;
  patientFirstName: string;
  when: string;
  modality: string;
  providerName: string;
}

async function draftShortReminder(args: DraftArgs): Promise<string> {
  const { ctx, reminderType, patientFirstName, when, modality, providerName } = args;
  const prompt = `You are a warm care coordinator at Leafjourney. Draft a short reminder message for a ${reminderType} appointment reminder.

Patient first name: ${patientFirstName}
Appointment time: ${when}
Modality: ${modality}
Provider: ${providerName || "your care team"}

Return ONLY valid JSON:
{ "message": "the full reminder message, 2-3 short sentences. Friendly, no jargon. Include the time and modality. For 15m reminders be more urgent." }`;

  try {
    const raw = await ctx.model.complete(prompt, {
      maxTokens: 200,
      temperature: 0.5,
    });
    const jm =
      raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (jm) {
      const parsed = JSON.parse(jm[1] || jm[0]);
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    }
  } catch (err) {
    ctx.log("warn", "Reminder LLM failed — falling back", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const leadIn =
    reminderType === "15m"
      ? `Starting soon: your ${modality} visit`
      : reminderType === "1h"
        ? `Reminder: your ${modality} visit is in about 1 hour`
        : `Reminder: your ${modality} visit is tomorrow`;
  return `Hi ${patientFirstName} — ${leadIn} (${when}) with ${providerName || "your care team"}. Reply here if you need to reschedule. See you soon!`;
}

async function hasReminderBeenSent(
  appointmentId: string,
  reminderType: ReminderOffset,
): Promise<boolean> {
  // The same appointment can receive 7day, 2day, AND 1day reminders —
  // only treat as duplicate when the reminderType in metadata matches.
  // We pull all reminder rows for this appointment (capped) and scan in JS
  // because Prisma's JSON filtering varies by provider.
  const rows = await prisma.auditLog.findMany({
    where: {
      action: "sms.appointment.reminder.sent",
      subjectType: "Appointment",
      subjectId: appointmentId,
    },
    select: { metadata: true },
    take: 10,
  });
  return rows.some((r) => {
    const meta = r.metadata as { reminderType?: string } | null;
    return meta?.reminderType === reminderType;
  });
}

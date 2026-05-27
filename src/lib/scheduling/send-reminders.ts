// Scans upcoming appointments and dispatches SMS reminders that are
// due at the current scheduler tick. Pure side-effect helper called
// from src/workers/scheduler.ts every 15 minutes.

import { prisma } from "@/lib/db/prisma";
import { getSmsAdapter, normalizePhone } from "@/lib/sms/adapter";
import {
  pickReminderOffset,
  renderAppointmentReminder,
  type ReminderOffset,
} from "@/lib/sms/templates";
import { logger } from "@/lib/observability/log";

export interface SendDueRemindersInput {
  /** Current time, injected for testability. */
  now: Date;
  /** Scheduler tick interval. Defaults to 15 min. */
  tickIntervalMs?: number;
}

export interface SendDueRemindersResult {
  /** Number of reminders successfully sent. */
  sent: number;
  /** Number of appointments inspected but skipped (no phone, already sent, etc). */
  skipped: number;
  /** Per-appointment outcomes for observability + tests. */
  details: ReminderOutcome[];
}

export interface ReminderOutcome {
  appointmentId: string;
  reminderType: ReminderOffset | null;
  result: "sent" | "skipped:no-phone" | "skipped:already-sent" | "skipped:out-of-window" | "failed";
  error?: string;
  adapter?: "twilio" | "mock";
}

export async function sendDueAppointmentReminders(
  input: SendDueRemindersInput,
): Promise<SendDueRemindersResult> {
  const now = input.now;
  const tick = input.tickIntervalMs ?? 15 * 60_000;
  const day = 24 * 60 * 60_000;
  // Pull every confirmed/requested appointment in the next 7d+1h so the
  // 7-day window is always covered.
  const windowEnd = new Date(now.getTime() + 7 * day + 60 * 60_000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["requested", "confirmed"] },
      startAt: { gt: now, lte: windowEnd },
    },
    include: {
      patient: { select: { id: true, firstName: true, phone: true, organizationId: true } },
      provider: { include: { user: true } },
    },
  });

  const details: ReminderOutcome[] = [];
  let sent = 0;
  let skipped = 0;

  for (const appt of appointments) {
    const msUntil = appt.startAt.getTime() - now.getTime();
    const offset = pickReminderOffset(msUntil, tick);
    if (!offset) {
      details.push({
        appointmentId: appt.id,
        reminderType: null,
        result: "skipped:out-of-window",
      });
      skipped += 1;
      continue;
    }

    if (!appt.patient.phone) {
      details.push({
        appointmentId: appt.id,
        reminderType: offset,
        result: "skipped:no-phone",
      });
      skipped += 1;
      continue;
    }
    const phone = normalizePhone(appt.patient.phone);
    if (!phone) {
      details.push({
        appointmentId: appt.id,
        reminderType: offset,
        result: "skipped:no-phone",
      });
      skipped += 1;
      continue;
    }

    if (await alreadySent(appt.id, offset)) {
      details.push({
        appointmentId: appt.id,
        reminderType: offset,
        result: "skipped:already-sent",
      });
      skipped += 1;
      continue;
    }

    const providerName = appt.provider?.user
      ? `${appt.provider.title ?? "Provider"} ${appt.provider.user.firstName} ${appt.provider.user.lastName}`.trim()
      : "your care team";

    const body = renderAppointmentReminder(offset, {
      patientFirstName: appt.patient.firstName,
      providerName,
      appointmentAt: appt.startAt,
      modality: appt.modality,
    });

    const adapter = getSmsAdapter();
    const res = await adapter.send({
      to: phone,
      body,
      context: {
        appointmentId: appt.id,
        patientId: appt.patient.id,
        reminderType: offset,
      },
    });

    if (!res.ok) {
      details.push({
        appointmentId: appt.id,
        reminderType: offset,
        result: "failed",
        error: res.error,
        adapter: res.adapter,
      });
      logger.warn({
        event: "scheduler.sms.reminder.failed",
        appointmentId: appt.id,
        reminderType: offset,
        error: res.error,
      });
      continue;
    }

    await prisma.auditLog.create({
      data: {
        organizationId: appt.patient.organizationId,
        actorAgent: "scheduler:appointmentReminder@1.0.0",
        action: "sms.appointment.reminder.sent",
        subjectType: "Appointment",
        subjectId: appt.id,
        metadata: {
          reminderType: offset,
          messageId: res.messageId,
          adapter: res.adapter,
        } as any,
      },
    });

    details.push({
      appointmentId: appt.id,
      reminderType: offset,
      result: "sent",
      adapter: res.adapter,
    });
    sent += 1;
  }

  return { sent, skipped, details };
}

async function alreadySent(
  appointmentId: string,
  reminderType: ReminderOffset,
): Promise<boolean> {
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

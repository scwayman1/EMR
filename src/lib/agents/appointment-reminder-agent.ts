import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Appointment Reminder Agent
// ---------------------------------------------------------------------------
// Reads upcoming appointments within N hours and generates reminder message
// content per appointment. Does NOT send — approval-gated. The human clicks
// Send after reviewing.
// ---------------------------------------------------------------------------

const input = z.object({
  patientId: z.string(),
  hoursAhead: z.number().int().positive().max(24 * 14),
});

const output = z.array(
  z.object({
    appointmentId: z.string(),
    patientMessage: z.string(),
    reminderType: z.enum(["24h", "1h", "15m"]),
  })
);

function reminderTypeFor(hoursUntil: number): "24h" | "1h" | "15m" {
  if (hoursUntil <= 0.3) return "15m";
  if (hoursUntil <= 2) return "1h";
  return "24h";
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
  version: "1.0.0",
  description:
    "Drafts reminder message content for each upcoming appointment within the " +
    "given hours window. Approval-gated — does not send.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.message.draft"],
  requiresApproval: true,

  async run({ patientId, hoursAhead }, ctx) {
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
      const hoursUntil =
        (new Date(appt.startAt).getTime() - now.getTime()) / (60 * 60 * 1000);
      const reminderType = reminderTypeFor(hoursUntil);

      const providerName = appt.provider?.user
        ? `${appt.provider.user.firstName ?? ""} ${appt.provider.user.lastName ?? ""}`.trim()
        : "your provider";
      const when = formatLocal(new Date(appt.startAt));
      const modality = appt.modality ?? "visit";

      const prompt = `You are a warm care coordinator at Leafjourney. Draft a short reminder message for a ${reminderType} appointment reminder.

Patient first name: ${patient.firstName}
Appointment time: ${when}
Modality: ${modality}
Provider: ${providerName || "your care team"}

Return ONLY valid JSON:
{ "message": "the full reminder message, 2-3 short sentences. Friendly, no jargon. Include the time and modality. For 15m reminders be more urgent." }`;

      let message: string | null = null;
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
            message = parsed.message.trim();
          }
        }
      } catch (err) {
        ctx.log("warn", "Reminder LLM failed — falling back", {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (!message) {
        // Deterministic template
        const leadIn =
          reminderType === "15m"
            ? `Starting soon: your ${modality} visit`
            : reminderType === "1h"
              ? `Reminder: your ${modality} visit is in about 1 hour`
              : `Reminder: your ${modality} visit is tomorrow`;
        message = `Hi ${patient.firstName} — ${leadIn} (${when}) with ${providerName || "your care team"}. Reply here if you need to reschedule. See you soon!`;
      }

      results.push({
        appointmentId: appt.id,
        patientMessage: message,
        reminderType,
      });
    }

    await writeAgentAudit(
      "appointmentReminder",
      "1.0.0",
      patient.organizationId,
      "appointment.reminders.drafted",
      { type: "Patient", id: patientId },
      { count: results.length, hoursAhead }
    );

    ctx.log("info", "Appointment reminders drafted", {
      count: results.length,
      hoursAhead,
    });

    return results;
  },
};

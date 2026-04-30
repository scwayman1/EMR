"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

const rescheduleSchema = z.object({
  appointmentId: z.string(),
  newStartIso: z.string(),
});

/**
 * EMR-182: drag-to-reschedule. The client drops an appointment onto a
 * new 30-min square; this action moves the start (and end, preserving
 * the duration) to that slot. Org-scoped via the patient record.
 */
export async function rescheduleAppointmentAction(
  payload: z.infer<typeof rescheduleSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = rescheduleSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Invalid drop payload." };

  const appt = await prisma.appointment.findFirst({
    where: {
      id: parsed.data.appointmentId,
      patient: { organizationId: user.organizationId! },
    },
  });
  if (!appt) return { ok: false, error: "Appointment not found." };

  const newStart = new Date(parsed.data.newStartIso);
  if (Number.isNaN(newStart.getTime())) {
    return { ok: false, error: "Invalid target time." };
  }
  const durationMs = appt.endAt.getTime() - appt.startAt.getTime();
  const newEnd = new Date(newStart.getTime() + durationMs);

  // Conflict check — prevent stacking two appointments on the same
  // provider in the same window. We allow back-to-back exactly (no
  // gap), which is why the comparisons are strict.
  if (appt.providerId) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        providerId: appt.providerId,
        id: { not: appt.id },
        startAt: { lt: newEnd },
        endAt: { gt: newStart },
      },
    });
    if (conflict) {
      return {
        ok: false,
        error: "That slot conflicts with another appointment for this provider.",
      };
    }
  }

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { startAt: newStart, endAt: newEnd },
  });

  revalidatePath("/clinic/schedule");
  return { ok: true };
}

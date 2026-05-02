"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

const PatientIdSchema = z.object({ patientId: z.string() });

/**
 * EMR-210 — fire a "you've got a slot" outreach to one waitlisted patient.
 *
 * The real outreach (SMS/email) is queued by the comms track. Here we:
 *   - Confirm the patient is opted in.
 *   - Stamp Patient.intakeAnswers.waitlist.lastNotifiedAt + bump attempt.
 *   - Return how many *other* offers are also live in the same stagger
 *     window (so the operator knows the offer set fan-out).
 */
export async function offerSlotAction(
  input: z.infer<typeof PatientIdSchema>,
): Promise<{ ok: true; batchSize: number } | { ok: false; error: string }> {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) return { ok: false, error: "No organization on session." };
  const parsed = PatientIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId: orgId, deletedAt: null },
    select: { id: true, intakeAnswers: true },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  const currentAnswers = (patient.intakeAnswers ?? {}) as Record<string, unknown>;
  const wl = (currentAnswers.waitlist ?? {}) as Record<string, unknown>;
  if (!wl.optIn) return { ok: false, error: "Patient is not opted into the waitlist." };

  const now = new Date().toISOString();
  const updatedWaitlist = {
    ...wl,
    lastNotifiedAt: now,
    attemptCount: (typeof wl.attemptCount === "number" ? wl.attemptCount : 0) + 1,
  };
  await prisma.patient.update({
    where: { id: patient.id },
    data: { intakeAnswers: { ...currentAnswers, waitlist: updatedWaitlist } },
  });

  // Compute the current stagger batch — patients notified in the last 10
  // minutes are part of the same fan-out wave.
  const tenMinAgo = new Date(Date.now() - 10 * 60_000);
  const candidates = await prisma.patient.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { intakeAnswers: true },
  });
  const batchSize = candidates.filter((c) => {
    const ans = (c.intakeAnswers ?? {}) as Record<string, unknown>;
    const w = (ans.waitlist ?? {}) as Record<string, unknown>;
    if (!w.optIn || typeof w.lastNotifiedAt !== "string") return false;
    return new Date(w.lastNotifiedAt) >= tenMinAgo;
  }).length;

  revalidatePath("/ops/waitlist");
  return { ok: true, batchSize };
}

export async function removeFromWaitlistAction(
  input: z.infer<typeof PatientIdSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) return { ok: false, error: "No organization on session." };
  const parsed = PatientIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId: orgId, deletedAt: null },
    select: { id: true, intakeAnswers: true },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  const currentAnswers = (patient.intakeAnswers ?? {}) as Record<string, unknown>;
  const wl = (currentAnswers.waitlist ?? {}) as Record<string, unknown>;
  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      intakeAnswers: {
        ...currentAnswers,
        waitlist: { ...wl, optIn: false, removedAt: new Date().toISOString() },
      },
    },
  });

  revalidatePath("/ops/waitlist");
  return { ok: true };
}

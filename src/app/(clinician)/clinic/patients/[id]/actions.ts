"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";

/**
 * Start a visit: find or create an in-progress encounter for today,
 * dispatch the scribe draft event, attempt a quick inline run with a
 * timeout, and redirect to notes immediately.
 */
export async function startVisit(patientId: string) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });
  if (!patient) {
    redirect(`/clinic/patients/${patientId}?tab=notes&error=not_found`);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let encounter = await prisma.encounter.findFirst({
    where: {
      patientId,
      organizationId: user.organizationId!,
      status: "in_progress",
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });

  if (!encounter) {
    encounter = await prisma.encounter.create({
      data: {
        organizationId: user.organizationId!,
        patientId,
        status: "in_progress",
        modality: "in_person",
        reason: "Visit",
        startedAt: new Date(),
        scheduledFor: new Date(),
      },
    });
  }

  // Dispatch the scribe event — this enqueues the job
  await dispatch({
    name: "encounter.note.draft.requested",
    encounterId: encounter.id,
    requestedBy: user.id,
  });

  // Try to run the agent inline with a 12-second timeout.
  // If it completes, the draft is ready when the page loads.
  // If it times out, the job stays in the queue for the background worker.
  try {
    await Promise.race([
      runTick("inline-visit", 2),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 12000)
      ),
    ]);
  } catch (err) {
    // Timeout or error — the job is still in the queue.
    // The clinician will see "No notes yet" briefly, then the draft
    // appears when the background worker picks it up or on page refresh.
    console.error("[startVisit] inline run:", err instanceof Error ? err.message : err);
  }

  revalidatePath(`/clinic/patients/${patientId}`);
  redirect(`/clinic/patients/${patientId}?tab=notes`);
}

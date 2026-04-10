"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";

/**
 * Start a visit: find or create an in-progress encounter for today,
 * dispatch the scribe draft event, run the agent inline (even in prod
 * — the clinician is waiting for the draft), and redirect to notes.
 */
export async function startVisit(patientId: string) {
  const user = await requireUser();

  // Verify the patient belongs to this org
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });
  if (!patient) {
    // Instead of throwing (which gives no UI feedback), redirect with error
    redirect(`/clinic/patients/${patientId}?tab=notes&error=not_found`);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Find or create today's encounter
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

  // Dispatch the scribe event
  await dispatch({
    name: "encounter.note.draft.requested",
    encounterId: encounter.id,
    requestedBy: user.id,
  });

  // Run the agent inline — even in production. The clinician is actively
  // waiting for the draft, so async queue polling (10s) is too slow.
  // The Scribe Agent typically completes in 2-8s with a real LLM.
  try {
    await runTick("inline-visit", 2);
  } catch (err) {
    // If the inline run fails, the job stays in the queue and the worker
    // will pick it up. The clinician sees "No notes yet" briefly, then
    // the draft appears on next page load.
    console.error("[startVisit] inline runTick failed:", err);
  }

  revalidatePath(`/clinic/patients/${patientId}`);
  redirect(`/clinic/patients/${patientId}?tab=notes`);
}

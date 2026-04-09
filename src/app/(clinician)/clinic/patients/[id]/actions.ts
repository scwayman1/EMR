"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";

/**
 * Start a visit: find or create an in-progress encounter for today,
 * dispatch the scribe draft event, and redirect to the notes tab.
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
  if (!patient) throw new Error("Patient not found");

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

  // In dev, run the queue inline so the draft appears immediately
  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 2);
  }

  revalidatePath(`/clinic/patients/${patientId}`);
  redirect(`/clinic/patients/${patientId}?tab=notes`);
}

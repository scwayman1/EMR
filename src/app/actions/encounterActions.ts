"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";

/**
 * Patient confirms an upcoming encounter from the portal dashboard.
 *
 * We store confirmation as a JSON flag inside `briefingContext` since the
 * Encounter schema's `status` enum doesn't have a "confirmed" variant.
 * This preserves the status state machine while still recording intent.
 */
export async function confirmEncounter(encounterId: string) {
  const user = await requireRole("patient");

  // Verify this encounter belongs to the authenticated patient
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return { success: false, error: "Patient record not found." };
  }

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: encounterId,
      patientId: patient.id,
      status: "scheduled",
    },
  });

  if (!encounter) {
    return { success: false, error: "Encounter not found or not in scheduled state." };
  }

  // Store patient confirmation in briefingContext metadata
  const existingContext = (encounter.briefingContext as Record<string, unknown>) ?? {};

  await prisma.encounter.update({
    where: { id: encounterId },
    data: {
      briefingContext: {
        ...existingContext,
        patientConfirmedAt: new Date().toISOString(),
      },
    },
  });

  // Write an audit log
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      organizationId: encounter.organizationId,
      action: "encounter.patient_confirmed",
      subjectType: "Encounter",
      subjectId: encounterId,
      metadata: { confirmedAt: new Date().toISOString() },
    },
  });

  revalidatePath("/portal");
  return { success: true };
}

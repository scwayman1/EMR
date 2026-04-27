"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { requestMedicationPaAppeal } from "@/lib/domain/medication-prior-auth";

// ---------------------------------------------------------------------------
// Clinician-side server actions for Medication Prior Auth + AI Appeal (EMR-076)
// ---------------------------------------------------------------------------

export interface AiAppealActionResult {
  ok: boolean;
  jobIds?: string[];
  error?: string;
}

export async function triggerAiAppealAction(
  patientId: string,
  priorAuthId: string,
): Promise<AiAppealActionResult> {
  const user = await requireUser();

  // Authorize: PA must belong to this patient + same org as the user.
  const pa = await prisma.medicationPriorAuth.findUnique({
    where: { id: priorAuthId },
    select: { id: true, organizationId: true, patientId: true },
  });
  if (!pa || pa.patientId !== patientId || pa.organizationId !== user.organizationId) {
    return { ok: false, error: "Not authorized for this prior authorization" };
  }

  const result = await requestMedicationPaAppeal({
    priorAuthId,
    requestedById: user.id,
  });

  if (result.ok) {
    revalidatePath(`/clinic/patients/${patientId}/prior-auths`);
  }
  return result;
}

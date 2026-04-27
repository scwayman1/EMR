"use server";

import { prisma } from "@/lib/db/prisma";
import { dispatch } from "@/lib/orchestration/dispatch";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Domain helpers for Medication Prior Authorization (EMR-076)
// ---------------------------------------------------------------------------

export interface RequestAppealInput {
  priorAuthId: string;
  requestedById: string;
}

export interface RequestAppealResult {
  ok: boolean;
  jobIds?: string[];
  error?: string;
}

/**
 * Triggered by the clinician's "AI Appeal" button on a denied medication PA.
 * Validates state, dispatches `medication.pa.appeal.requested`, and returns
 * the AgentJob id(s) so the UI can poll/subscribe for completion.
 */
export async function requestMedicationPaAppeal(
  input: RequestAppealInput,
): Promise<RequestAppealResult> {
  const pa = await prisma.medicationPriorAuth.findUnique({
    where: { id: input.priorAuthId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      patientId: true,
      payerName: true,
      denialReason: true,
      appealStatus: true,
    },
  });
  if (!pa) return { ok: false, error: "Prior authorization not found" };
  if (pa.status !== "denied") {
    return { ok: false, error: "Only denied prior authorizations can be appealed" };
  }
  if (pa.appealStatus === "queued" || pa.appealStatus === "drafted") {
    return { ok: false, error: "An appeal is already in progress for this PA" };
  }

  await prisma.medicationPriorAuth.update({
    where: { id: pa.id },
    data: { appealStatus: "queued" },
  });

  const jobIds = await dispatch({
    name: "medication.pa.appeal.requested",
    priorAuthId: pa.id,
    organizationId: pa.organizationId,
    requestedById: input.requestedById,
  });

  return { ok: true, jobIds };
}

export type MedicationPriorAuthWithMed = Prisma.MedicationPriorAuthGetPayload<{
  include: { medication: true };
}>;

/** Lists denied / appealed PAs for a patient — used by the clinician UI. */
export async function listMedicationPriorAuths(
  patientId: string,
): Promise<MedicationPriorAuthWithMed[]> {
  return prisma.medicationPriorAuth.findMany({
    where: { patientId },
    include: { medication: true },
    orderBy: { updatedAt: "desc" },
  });
}

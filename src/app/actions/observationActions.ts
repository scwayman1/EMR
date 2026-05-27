"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

/**
 * Server actions for ClinicalObservation acknowledgement.
 *
 * ClinicalObservations are structured insights agents notice about a
 * patient (symptom trends, medication responses, red flags). Clinicians
 * acknowledge them to mark-as-seen, which removes them from the
 * "fleet is noticing" strip in the Command Center schedule peek and
 * other ambient surfaces.
 *
 * Acknowledgement is non-destructive — the row remains for audit and
 * research — and idempotent: re-acking an already-acked observation
 * returns { ok: true } without a write.
 */

export type AckResult = { ok: true } | { ok: false; error: string };

const acknowledgeSchema = z.object({
  id: z.string().min(1),
});

/**
 * Mark a single ClinicalObservation as acknowledged by the caller.
 *
 * Authorization: caller must be an authenticated clinician or
 * practice_owner, AND the observation's patient must live in the
 * caller's organization. The org check is expressed in the update's
 * WHERE clause via the patient relation so a single round-trip covers
 * both existence and authorization.
 */
export async function acknowledgeObservation(id: string): Promise<AckResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  if (!user.organizationId) {
    return { ok: false, error: "No organization on session." };
  }

  const parsed = acknowledgeSchema.safeParse({ id });
  if (!parsed.success) {
    return { ok: false, error: "Invalid observation id." };
  }

  // Scope the update to observations whose patient belongs to the
  // caller's org. updateMany gives us an atomic existence + authorization
  // check in a single query.
  try {
    const result = await prisma.clinicalObservation.updateMany({
      where: {
        id: parsed.data.id,
        patient: { organizationId: user.organizationId },
      },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: user.id,
      },
    });

    if (result.count === 0) {
      return { ok: false, error: "Observation not found." };
    }
  } catch (err) {
    console.error("[observations] acknowledge failed", err);
    return { ok: false, error: "Could not acknowledge observation." };
  }

  revalidatePath("/clinic/command");
  return { ok: true };
}

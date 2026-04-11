"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// Collect payment — records a patient payment against open balance
// ---------------------------------------------------------------------------

const collectSchema = z.object({
  patientId: z.string(),
  amountCents: z.coerce.number().int().positive(),
  method: z.enum(["card", "ach", "cash", "check"]),
  reference: z.string().optional(),
  claimId: z.string().optional(),
  notes: z.string().optional(),
});

export type CollectResult =
  | { ok: true; paymentId: string }
  | { ok: false; error: string };

export async function collectPayment(
  _prev: CollectResult | null,
  formData: FormData,
): Promise<CollectResult> {
  const user = await requireUser();

  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner" || r === "operator")) {
    return { ok: false, error: "Unauthorized" };
  }

  const parsed = collectSchema.safeParse({
    patientId: formData.get("patientId"),
    amountCents: formData.get("amountCents"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    claimId: formData.get("claimId") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Invalid payment data" };
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: {
      id: parsed.data.patientId,
      organizationId: user.organizationId!,
    },
  });
  if (!patient) return { ok: false, error: "Patient not found" };

  // Find the claim to apply payment to — use oldest unpaid claim if not specified
  let targetClaimId = parsed.data.claimId;
  if (!targetClaimId) {
    const oldestUnpaid = await prisma.claim.findFirst({
      where: {
        patientId: parsed.data.patientId,
        patientRespCents: { gt: 0 },
        status: { in: ["pending", "partial", "paid"] },
      },
      orderBy: { serviceDate: "asc" },
    });
    targetClaimId = oldestUnpaid?.id;
  }

  if (!targetClaimId) {
    return { ok: false, error: "No open balance to apply payment to" };
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        claimId: targetClaimId,
        source: "patient",
        amountCents: parsed.data.amountCents,
        reference: parsed.data.reference ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    // Log financial event
    await prisma.financialEvent.create({
      data: {
        organizationId: user.organizationId!,
        patientId: parsed.data.patientId,
        claimId: targetClaimId,
        paymentId: payment.id,
        type: "patient_payment",
        amountCents: parsed.data.amountCents,
        description: `Patient payment ${parsed.data.amountCents / 100} via ${parsed.data.method}`,
        metadata: { method: parsed.data.method, reference: parsed.data.reference },
        createdByUserId: user.id,
      },
    });

    // Update claim paid amount
    await prisma.claim.update({
      where: { id: targetClaimId },
      data: {
        paidAmountCents: { increment: parsed.data.amountCents },
      },
    });

    revalidatePath(`/clinic/patients/${parsed.data.patientId}`);
    revalidatePath(`/ops/billing`);
    return { ok: true, paymentId: payment.id };
  } catch (err) {
    console.error("[collectPayment]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Payment failed",
    };
  }
}

// ---------------------------------------------------------------------------
// Record copay collection at check-in
// ---------------------------------------------------------------------------

export async function collectCopay(
  patientId: string,
  amountCents: number,
  method: "card" | "cash" | "check" | "ach",
): Promise<CollectResult> {
  const user = await requireUser();

  try {
    // Create two events: assessed + collected
    await prisma.financialEvent.createMany({
      data: [
        {
          organizationId: user.organizationId!,
          patientId,
          type: "copay_assessed",
          amountCents,
          description: "Copay assessed at check-in",
        },
        {
          organizationId: user.organizationId!,
          patientId,
          type: "copay_collected",
          amountCents,
          description: `Copay collected (${method})`,
          metadata: { method },
          createdByUserId: user.id,
        },
      ],
    });

    revalidatePath(`/clinic/patients/${patientId}`);
    return { ok: true, paymentId: "copay" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Copay collection failed",
    };
  }
}

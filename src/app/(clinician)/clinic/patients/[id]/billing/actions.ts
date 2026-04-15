"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { resolvePaymentGateway } from "@/lib/payments";

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
  storedMethodToken: z.string().optional(),
});

export type CollectResult =
  | { ok: true; paymentId: string; gatewayIntentId?: string }
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
    storedMethodToken: formData.get("storedMethodToken") || undefined,
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
        status: { in: ["accepted", "adjudicated", "partial", "paid"] },
      },
      orderBy: { serviceDate: "asc" },
    });
    targetClaimId = oldestUnpaid?.id;
  }

  if (!targetClaimId) {
    return { ok: false, error: "No open balance to apply payment to" };
  }

  // ── Route through the payment gateway ────────────────────────
  const gateway = resolvePaymentGateway();
  const clientReferenceId = `pmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let gatewayIntentId: string | undefined;
  let gatewayLast4: string | undefined;
  let gatewayBrand: string | undefined;

  try {
    let intent;

    if (parsed.data.storedMethodToken) {
      // Card on file flow
      intent = await gateway.chargeStoredMethod({
        token: parsed.data.storedMethodToken,
        amountCents: parsed.data.amountCents,
        clientReferenceId,
        description: `Payment for patient ${patient.firstName} ${patient.lastName}`,
        patientId: patient.id,
      });
    } else {
      // New payment intent (card/ACH/cash/check)
      intent = await gateway.createPaymentIntent({
        amountCents: parsed.data.amountCents,
        method: parsed.data.method,
        clientReferenceId,
        description: `Payment for patient ${patient.firstName} ${patient.lastName}`,
        patientId: patient.id,
        metadata: {
          claimId: targetClaimId,
          collectedByUserId: user.id,
        },
      });
    }

    if (intent.status === "failed") {
      return {
        ok: false,
        error: intent.errorMessage ?? "Payment declined by processor",
      };
    }

    gatewayIntentId = intent.id;
    gatewayLast4 = intent.last4;
    gatewayBrand = intent.brand;
  } catch (err) {
    console.error("[collectPayment] gateway error:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Payment gateway error: ${err.message}`
          : "Payment gateway error",
    };
  }

  // ── Persist to ledger ─────────────────────────────────────────
  try {
    const payment = await prisma.payment.create({
      data: {
        claimId: targetClaimId,
        source: "patient",
        amountCents: parsed.data.amountCents,
        reference: gatewayIntentId ?? parsed.data.reference ?? null,
        notes: parsed.data.notes ?? null,
      },
    });

    await prisma.financialEvent.create({
      data: {
        organizationId: user.organizationId!,
        patientId: parsed.data.patientId,
        claimId: targetClaimId,
        paymentId: payment.id,
        type: "patient_payment",
        amountCents: parsed.data.amountCents,
        description: `Patient payment ${(parsed.data.amountCents / 100).toFixed(2)} via ${parsed.data.method}${gatewayBrand && gatewayLast4 ? ` (${gatewayBrand} •${gatewayLast4})` : ""}`,
        metadata: {
          method: parsed.data.method,
          reference: parsed.data.reference,
          gateway: gateway.name,
          gatewayIntentId,
          last4: gatewayLast4,
          brand: gatewayBrand,
          clientReferenceId,
        },
        createdByUserId: user.id,
      },
    });

    await prisma.claim.update({
      where: { id: targetClaimId },
      data: {
        paidAmountCents: { increment: parsed.data.amountCents },
      },
    });

    revalidatePath(`/clinic/patients/${parsed.data.patientId}`);
    revalidatePath(`/ops/billing`);
    return { ok: true, paymentId: payment.id, gatewayIntentId };
  } catch (err) {
    console.error("[collectPayment] persistence error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Payment persistence failed",
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

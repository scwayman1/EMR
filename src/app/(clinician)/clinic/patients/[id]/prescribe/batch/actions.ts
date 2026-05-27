"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { checkInteractions } from "@/lib/domain/drug-interactions";
import { dispatch } from "@/lib/orchestration/dispatch";

const itemSchema = z.object({
  productId: z.string(),
  volumePerDose: z.coerce.number().positive(),
  volumeUnit: z.string().min(1),
  frequencyPerDay: z.coerce.number().int().min(1).max(12),
  daysSupply: z.coerce.number().int().min(1).max(365),
  refills: z.coerce.number().int().min(0).max(12),
  timingInstructions: z.string().max(500).optional(),
});

const batchSchema = z.object({
  patientId: z.string(),
  items: z.array(itemSchema).min(1).max(8),
  doubleCheckAcknowledged: z.literal("true"),
});

export type BatchPrescribeResult =
  | { ok: true; createdRegimenIds: string[] }
  | { ok: false; error: string };

export async function createBatchPrescriptionsAction(
  payload: z.infer<typeof batchSchema>,
): Promise<BatchPrescribeResult> {
  const user = await requireUser();

  const parsed = batchSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "Invalid prescription cart." };
  }
  const { patientId, items } = parsed.data;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId!, deletedAt: null },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  // Resolve all products in one query so cross-cart safety can compare
  // the union of cannabinoids in the cart against the patient med list.
  const productIds = items.map((i) => i.productId);
  const products = await prisma.cannabisProduct.findMany({
    where: { id: { in: productIds }, organizationId: user.organizationId!, active: true },
  });
  if (products.length !== productIds.length) {
    return { ok: false, error: "One or more products are missing or inactive." };
  }

  // Cross-cart safety check: union all cannabinoids the cart adds, run
  // a single interaction sweep against the existing patient med list.
  // The form-level double-check has already been acknowledged by the
  // clinician — we re-run server-side because the cart may have
  // changed between render and submit.
  const cannabinoidUnion = new Set<string>();
  for (const p of products) {
    if (p.thcConcentration && p.thcConcentration > 0) cannabinoidUnion.add("THC");
    if (p.cbdConcentration && p.cbdConcentration > 0) cannabinoidUnion.add("CBD");
    if (p.cbnConcentration && p.cbnConcentration > 0) cannabinoidUnion.add("CBN");
    if (p.cbgConcentration && p.cbgConcentration > 0) cannabinoidUnion.add("CBG");
  }
  const patientMeds = await prisma.patientMedication.findMany({
    where: { patientId, active: true },
  });
  const interactions = checkInteractions(
    patientMeds.map((m) => m.name),
    Array.from(cannabinoidUnion),
  );
  const reds = interactions.filter((i) => i.severity === "red");
  if (reds.length > 0) {
    return {
      ok: false,
      error:
        "Red-severity interaction in cart: " +
        reds.map((r) => `${r.drug}↔${r.cannabinoid}`).join(", ") +
        ". Resolve before submitting.",
    };
  }

  // Build all regimens in a transaction so the cart is atomic — either
  // every Rx is created or none are. Audit-log the batch as one entry.
  const productById = new Map(products.map((p) => [p.id, p]));
  const created: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const product = productById.get(item.productId)!;
      const thcMgPerDose = product.thcConcentration
        ? product.thcConcentration * item.volumePerDose
        : null;
      const cbdMgPerDose = product.cbdConcentration
        ? product.cbdConcentration * item.volumePerDose
        : null;
      const regimen = await tx.dosingRegimen.create({
        data: {
          patientId,
          productId: product.id,
          prescribedById: user.id,
          volumePerDose: item.volumePerDose,
          volumeUnit: item.volumeUnit,
          frequencyPerDay: item.frequencyPerDay,
          timingInstructions: item.timingInstructions || null,
          calculatedThcMgPerDose: thcMgPerDose,
          calculatedCbdMgPerDose: cbdMgPerDose,
          calculatedThcMgPerDay:
            thcMgPerDose !== null ? thcMgPerDose * item.frequencyPerDay : null,
          calculatedCbdMgPerDay:
            cbdMgPerDose !== null ? cbdMgPerDose * item.frequencyPerDay : null,
          patientInstructions: `Take ${item.volumePerDose} ${item.volumeUnit} ${item.frequencyPerDay}x daily.`,
          clinicianNotes: JSON.stringify({
            batch: true,
            doubleCheckAcknowledged: true,
            daysSupply: item.daysSupply,
            refills: item.refills,
          }),
          active: true,
        },
      });
      created.push(regimen.id);
    }

    await tx.auditLog.create({
      data: {
        organizationId: user.organizationId!,
        actorUserId: user.id,
        action: "prescription.batch.signed",
        subjectType: "Patient",
        subjectId: patientId,
        metadata: {
          regimenIds: created,
          interactionsConsidered: interactions,
        } as any,
      },
    });
  });

  // Fan out the safety agent for each new regimen — same hand-off
  // pattern as single-med prescribing, just looped.
  for (const regimenId of created) {
    await dispatch({
      name: "dosing.regimen.created",
      regimenId,
      patientId,
      productId: products[0].id, // safety agent re-loads its own product set
      organizationId: user.organizationId!,
      prescribedById: user.id,
    });
  }

  revalidatePath(`/clinic/patients/${patientId}`);
  redirect(`/clinic/patients/${patientId}?tab=rx`);
}

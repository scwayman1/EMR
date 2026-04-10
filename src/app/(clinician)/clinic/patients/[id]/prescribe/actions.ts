"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

const schema = z.object({
  patientId: z.string(),
  productId: z.string(),
  volumePerDose: z.coerce.number().positive(),
  volumeUnit: z.string().min(1),
  frequencyPerDay: z.coerce.number().int().min(1).max(12),
  timingInstructions: z.string().max(500).optional(),
  patientInstructions: z.string().max(2000).optional(),
  clinicianNotes: z.string().max(2000).optional(),
});

export type PrescribeResult = { ok: true } | { ok: false; error: string };

export async function createPrescriptionAction(
  _prev: PrescribeResult | null,
  formData: FormData
): Promise<PrescribeResult> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    patientId: formData.get("patientId"),
    productId: formData.get("productId"),
    volumePerDose: formData.get("volumePerDose"),
    volumeUnit: formData.get("volumeUnit"),
    frequencyPerDay: formData.get("frequencyPerDay"),
    timingInstructions: formData.get("timingInstructions") || undefined,
    patientInstructions: formData.get("patientInstructions") || undefined,
    clinicianNotes: formData.get("clinicianNotes") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Please fill all required fields with valid values." };
  }

  const { patientId, productId, volumePerDose, volumeUnit, frequencyPerDay, timingInstructions, patientInstructions, clinicianNotes } = parsed.data;

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId!, deletedAt: null },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  // Load the product to auto-calculate mg
  const product = await prisma.cannabisProduct.findFirst({
    where: { id: productId, organizationId: user.organizationId!, active: true },
  });
  if (!product) return { ok: false, error: "Product not found or inactive." };

  // Auto-calculate mg per dose and per day
  let thcMgPerDose: number | null = null;
  let cbdMgPerDose: number | null = null;

  if (product.concentrationUnit === "mg/mL" || product.concentrationUnit === "mg/unit") {
    thcMgPerDose = product.thcConcentration ? product.thcConcentration * volumePerDose : null;
    cbdMgPerDose = product.cbdConcentration ? product.cbdConcentration * volumePerDose : null;
  }

  const thcMgPerDay = thcMgPerDose !== null ? thcMgPerDose * frequencyPerDay : null;
  const cbdMgPerDay = cbdMgPerDose !== null ? cbdMgPerDose * frequencyPerDay : null;

  // Auto-generate patient instructions if not provided
  const autoInstructions = patientInstructions || generateInstructions(
    product.name, volumePerDose, volumeUnit, frequencyPerDay,
    thcMgPerDose, cbdMgPerDose, timingInstructions
  );

  await prisma.dosingRegimen.create({
    data: {
      patientId,
      productId,
      prescribedById: user.id,
      volumePerDose,
      volumeUnit,
      frequencyPerDay,
      timingInstructions: timingInstructions || null,
      calculatedThcMgPerDose: thcMgPerDose,
      calculatedCbdMgPerDose: cbdMgPerDose,
      calculatedThcMgPerDay: thcMgPerDay,
      calculatedCbdMgPerDay: cbdMgPerDay,
      patientInstructions: autoInstructions,
      clinicianNotes: clinicianNotes || null,
      active: true,
    },
  });

  revalidatePath(`/clinic/patients/${patientId}`);
  redirect(`/clinic/patients/${patientId}?tab=rx`);
}

function generateInstructions(
  productName: string,
  volume: number,
  unit: string,
  frequency: number,
  thcMg: number | null,
  cbdMg: number | null,
  timing: string | undefined
): string {
  const freqText = frequency === 1 ? "once daily" : frequency === 2 ? "twice daily" : `${frequency} times daily`;
  const mgParts: string[] = [];
  if (thcMg !== null && thcMg > 0) mgParts.push(`${thcMg.toFixed(1)} mg THC`);
  if (cbdMg !== null && cbdMg > 0) mgParts.push(`${cbdMg.toFixed(1)} mg CBD`);
  const mgText = mgParts.length > 0 ? ` (${mgParts.join(" + ")} per dose)` : "";
  const timingText = timing ? `. ${timing}` : "";

  return `Take ${volume} ${unit} of ${productName} ${freqText}${mgText}${timingText}.`;
}

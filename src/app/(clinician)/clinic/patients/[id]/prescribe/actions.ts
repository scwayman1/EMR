"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { checkInteractions } from "@/lib/domain/drug-interactions";

const schema = z.object({
  patientId: z.string(),
  productId: z.string().optional(),
  customProductName: z.string().max(200).optional(),
  productType: z.string().min(1),
  volumePerDose: z.coerce.number().positive(),
  volumeUnit: z.string().min(1),
  frequencyPerDay: z.coerce.number().int().min(1).max(12),
  daysSupply: z.coerce.number().int().min(1).max(365),
  quantity: z.coerce.number().positive(),
  refills: z.coerce.number().int().min(0).max(12),
  timingInstructions: z.string().max(500).optional(),
  diagnosisCodes: z.string().optional(), // JSON-encoded array of {code, label}
  noteToPatient: z.string().max(2000).optional(),
  noteToPharmacy: z.string().max(2000).optional(),
  interactionAcknowledged: z.string().optional(), // "true" if acknowledged
  // EMR-088: contraindication override fields
  contraindicationAcknowledged: z.string().optional(),
  contraindicationOverrideReason: z.string().max(2000).optional(),
  contraindicationIds: z.string().optional(), // JSON array of ids
});

export type PrescribeResult = { ok: true } | { ok: false; error: string };

export async function createPrescriptionAction(
  _prev: PrescribeResult | null,
  formData: FormData
): Promise<PrescribeResult> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    patientId: formData.get("patientId"),
    productId: formData.get("productId") || undefined,
    customProductName: formData.get("customProductName") || undefined,
    productType: formData.get("productType"),
    volumePerDose: formData.get("volumePerDose"),
    volumeUnit: formData.get("volumeUnit"),
    frequencyPerDay: formData.get("frequencyPerDay"),
    daysSupply: formData.get("daysSupply"),
    quantity: formData.get("quantity"),
    refills: formData.get("refills"),
    timingInstructions: formData.get("timingInstructions") || undefined,
    diagnosisCodes: formData.get("diagnosisCodes") || undefined,
    noteToPatient: formData.get("noteToPatient") || undefined,
    noteToPharmacy: formData.get("noteToPharmacy") || undefined,
    interactionAcknowledged: formData.get("interactionAcknowledged") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "Please fill all required fields with valid values." };
  }

  const {
    patientId,
    productId,
    customProductName,
    productType,
    volumePerDose,
    volumeUnit,
    frequencyPerDay,
    daysSupply,
    quantity,
    refills,
    timingInstructions,
    diagnosisCodes,
    noteToPatient,
    noteToPharmacy,
    interactionAcknowledged,
  } = parsed.data;

  // Must have either a product from formulary or a custom name
  if (!productId && !customProductName) {
    return { ok: false, error: "Please select a product or enter a custom medication name." };
  }

  // Verify patient belongs to org
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId!, deletedAt: null },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  // Load the product — required for formulary selections, resolved for custom entries
  let product = null;
  let resolvedProductId = productId;

  if (productId) {
    product = await prisma.cannabisProduct.findFirst({
      where: { id: productId, organizationId: user.organizationId!, active: true },
    });
    if (!product) return { ok: false, error: "Product not found or inactive." };
  } else if (customProductName) {
    // For custom/manual entries, create an ad-hoc product record so the FK is satisfied
    product = await prisma.cannabisProduct.create({
      data: {
        organizationId: user.organizationId!,
        name: customProductName,
        productType: (["oil", "tincture", "capsule", "flower", "vape_cartridge", "edible", "topical", "suppository", "spray", "other"].includes(productType ?? "") ? productType : "other") as any,
        route: "oral",
        concentrationUnit: "mg/unit",
        active: true,
      },
    });
    resolvedProductId = product.id;
  }

  // Check for drug interactions server-side if product is from formulary
  if (product) {
    const patientMeds = await prisma.patientMedication.findMany({
      where: { patientId, active: true },
    });

    if (patientMeds.length > 0) {
      const cannabinoids: string[] = [];
      if (product.thcConcentration && product.thcConcentration > 0) cannabinoids.push("THC");
      if (product.cbdConcentration && product.cbdConcentration > 0) cannabinoids.push("CBD");
      if (product.cbnConcentration && product.cbnConcentration > 0) cannabinoids.push("CBN");
      if (product.cbgConcentration && product.cbgConcentration > 0) cannabinoids.push("CBG");

      const medNames = patientMeds.map((m) => m.name);
      const interactions = checkInteractions(medNames, cannabinoids);
      const hasWarnings = interactions.some((i) => i.severity === "red" || i.severity === "yellow");

      if (hasWarnings && interactionAcknowledged !== "true") {
        return {
          ok: false,
          error: "Drug interactions detected. You must acknowledge the interaction warnings before prescribing.",
        };
      }
    }
  }

  // Auto-calculate mg per dose and per day
  let thcMgPerDose: number | null = null;
  let cbdMgPerDose: number | null = null;

  if (product) {
    if (product.concentrationUnit === "mg/mL" || product.concentrationUnit === "mg/unit") {
      thcMgPerDose = product.thcConcentration ? product.thcConcentration * volumePerDose : null;
      cbdMgPerDose = product.cbdConcentration ? product.cbdConcentration * volumePerDose : null;
    }
  }

  const thcMgPerDay = thcMgPerDose !== null ? thcMgPerDose * frequencyPerDay : null;
  const cbdMgPerDay = cbdMgPerDose !== null ? cbdMgPerDose * frequencyPerDay : null;

  // Parse diagnosis codes with validation
  const diagnosisSchema = z.array(z.object({ code: z.string(), label: z.string() }));
  let parsedDiagnoses: { code: string; label: string }[] = [];
  if (diagnosisCodes) {
    try {
      const raw = JSON.parse(diagnosisCodes);
      const result = diagnosisSchema.safeParse(raw);
      parsedDiagnoses = result.success ? result.data : [];
    } catch {
      parsedDiagnoses = [];
    }
  }

  // Build structured clinician notes with metadata
  const structuredNotes = JSON.stringify({
    noteToPharmacy: noteToPharmacy || null,
    diagnosisCodes: parsedDiagnoses,
    daysSupply,
    quantity,
    refills,
    productType,
    customProductName: customProductName || null,
    interactionAcknowledged: interactionAcknowledged === "true",
  });

  // Auto-generate patient instructions if not provided
  const productName = product ? product.name : customProductName || "medication";
  const autoInstructions =
    noteToPatient ||
    generateInstructions(
      productName,
      volumePerDose,
      volumeUnit,
      frequencyPerDay,
      thcMgPerDose,
      cbdMgPerDose,
      timingInstructions
    );

  // EMR-088: persist contraindication override if present
  let contraindicationOverride: any = undefined;
  if (parsed.data.contraindicationAcknowledged === "true") {
    const reason = parsed.data.contraindicationOverrideReason?.trim() ?? "";
    if (reason.length < 20) {
      return {
        ok: false,
        error:
          "Contraindication override requires at least 20 characters of clinical reasoning.",
      };
    }
    let ids: string[] = [];
    try {
      const raw = JSON.parse(parsed.data.contraindicationIds ?? "[]");
      const result = z.array(z.string()).safeParse(raw);
      ids = result.success ? result.data : [];
    } catch {
      ids = [];
    }
    contraindicationOverride = {
      contraindicationIds: ids,
      reason,
      overriddenByUserId: user.id,
      overriddenAt: new Date().toISOString(),
    };
  }

  try {
    const regimen = await prisma.dosingRegimen.create({
      data: {
        patientId,
        productId: resolvedProductId!,
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
        clinicianNotes: structuredNotes,
        active: true,
        contraindicationOverride,
      },
    });

    // Audit log the override if present — clinical safety requires this
    if (contraindicationOverride) {
      await prisma.auditLog.create({
        data: {
          organizationId: user.organizationId!,
          actorUserId: user.id,
          action: "cannabis.contraindication.override",
          subjectType: "DosingRegimen",
          subjectId: regimen.id,
          metadata: contraindicationOverride,
        },
      });
    }
  } catch (err) {
    console.error("[prescribe] failed to create regimen:", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Failed to save prescription: ${err.message}`
          : "Failed to save prescription. Please try again.",
    };
  }

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
  const freqText =
    frequency === 1
      ? "once daily"
      : frequency === 2
        ? "twice daily"
        : `${frequency} times daily`;
  const mgParts: string[] = [];
  if (thcMg !== null && thcMg > 0) mgParts.push(`${thcMg.toFixed(1)} mg THC`);
  if (cbdMg !== null && cbdMg > 0) mgParts.push(`${cbdMg.toFixed(1)} mg CBD`);
  const mgText = mgParts.length > 0 ? ` (${mgParts.join(" + ")} per dose)` : "";
  const timingText = timing ? `. ${timing}` : "";

  return `Take ${volume} ${unit} of ${productName} ${freqText}${mgText}${timingText}.`;
}

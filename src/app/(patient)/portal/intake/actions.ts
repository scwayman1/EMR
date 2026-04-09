"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";

const schema = z.object({
  presentingConcerns: z.string().max(2000).optional(),
  treatmentGoals: z.string().max(2000).optional(),
  priorUse: z.boolean(),
  formats: z.string().max(500).optional(),
  reportedBenefits: z.string().max(500).optional(),
});

export type IntakeResult = { ok: true } | { ok: false; error: string };

export async function saveIntakeAction(
  _prev: IntakeResult | null,
  formData: FormData
): Promise<IntakeResult> {
  const user = await requireRole("patient");

  const parsed = schema.safeParse({
    presentingConcerns: (formData.get("presentingConcerns") as string) ?? "",
    treatmentGoals: (formData.get("treatmentGoals") as string) ?? "",
    priorUse: formData.get("priorUse") === "on",
    formats: (formData.get("formats") as string) ?? "",
    reportedBenefits: (formData.get("reportedBenefits") as string) ?? "",
  });

  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const cannabisHistory = {
    priorUse: parsed.data.priorUse,
    formats:
      parsed.data.formats?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
    reportedBenefits:
      parsed.data.reportedBenefits
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [],
  };

  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      presentingConcerns: parsed.data.presentingConcerns || null,
      treatmentGoals: parsed.data.treatmentGoals || null,
      cannabisHistory: cannabisHistory as any,
      status: patient.status === "prospect" ? "active" : patient.status,
    },
  });

  // Fire a domain event — the Intake Agent will regenerate the chart summary.
  await dispatch({
    name: "patient.intake.updated",
    patientId: patient.id,
    organizationId: patient.organizationId,
  });

  revalidatePath("/portal");
  revalidatePath("/portal/intake");

  return { ok: true };
}

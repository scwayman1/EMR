"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { EMAR_AUDIT_ACTION } from "@/lib/domain/emar";

const schema = z.object({
  patientId: z.string(),
  patientMedicationId: z.string().optional(),
  cannabisRegimenId: z.string().optional(),
  medicationLabel: z.string().min(1).max(200),
  amount: z.coerce.number().positive(),
  unit: z.string().min(1).max(40),
  route: z.string().min(1).max(40),
  indication: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export async function logAdministrationAction(
  input: z.infer<typeof schema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid administration entry." };

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId: user.organizationId!, deletedAt: null },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId!,
      actorUserId: user.id,
      action: EMAR_AUDIT_ACTION,
      subjectType: "Patient",
      subjectId: parsed.data.patientId,
      metadata: {
        ...parsed.data,
        administeredAtIso: new Date().toISOString(),
      } as any,
    },
  });

  revalidatePath(`/clinic/patients/${parsed.data.patientId}/emar`);
  return { ok: true };
}

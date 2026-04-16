"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { OutcomeMetric } from "@prisma/client";

const Schema = z.object({
  metric: z.nativeEnum(OutcomeMetric),
  value: z.coerce.number().min(0).max(10),
  note: z.string().max(500).optional(),
});

export type LogResult =
  | { ok: true }
  | { ok: false; error: string };

export async function logOutcomeAction(
  _prev: LogResult | null,
  formData: FormData,
): Promise<LogResult> {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const parsed = Schema.safeParse({
    metric: formData.get("metric"),
    value: formData.get("value"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.errors[0]?.message ?? "Invalid input.",
    };
  }

  await prisma.outcomeLog.create({
    data: {
      patientId: patient.id,
      metric: parsed.data.metric,
      value: parsed.data.value,
      note: parsed.data.note,
    },
  });

  revalidatePath("/portal");
  revalidatePath("/portal/outcomes");
  redirect("/portal/outcomes");
}

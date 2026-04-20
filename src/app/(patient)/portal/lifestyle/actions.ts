"use server";

// Server actions for the Lifestyle page. Currently scoped to the weekly
// outcomes submission — upserts on [patientId, weekStartDate] so that a
// patient who resubmits within the same week overwrites their prior entry
// (the form intentionally allows edits until Sunday night).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { getCurrentWeekStart } from "@/lib/domain/weekly-outcomes";

const weeklyOutcomeSchema = z.object({
  painScore: z.coerce.number().int().min(1).max(10),
  sleepScore: z.coerce.number().int().min(1).max(10),
  anxietyScore: z.coerce.number().int().min(1).max(10),
  moodScore: z.coerce.number().int().min(1).max(10),
});

export type WeeklyOutcomeInput = z.infer<typeof weeklyOutcomeSchema>;

export type SubmitWeeklyOutcomeResult =
  | { ok: true; weekStartDate: string }
  | { ok: false; error: string };

export async function submitWeeklyOutcome(
  input: WeeklyOutcomeInput,
): Promise<SubmitWeeklyOutcomeResult> {
  const user = await requireRole("patient");

  const parsed = weeklyOutcomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Scores must be whole numbers between 1 and 10." };
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient) {
    return { ok: false, error: "No patient profile found." };
  }

  const weekStartDate = getCurrentWeekStart(new Date());

  await prisma.weeklyOutcome.upsert({
    where: {
      patientId_weekStartDate: {
        patientId: patient.id,
        weekStartDate,
      },
    },
    create: {
      patientId: patient.id,
      organizationId: patient.organizationId,
      weekStartDate,
      painScore: parsed.data.painScore,
      sleepScore: parsed.data.sleepScore,
      anxietyScore: parsed.data.anxietyScore,
      moodScore: parsed.data.moodScore,
    },
    update: {
      painScore: parsed.data.painScore,
      sleepScore: parsed.data.sleepScore,
      anxietyScore: parsed.data.anxietyScore,
      moodScore: parsed.data.moodScore,
      submittedAt: new Date(),
    },
  });

  revalidatePath("/portal/lifestyle");
  revalidatePath("/portal/outcomes");
  revalidatePath("/portal/weekly-recap");

  return {
    ok: true,
    weekStartDate: weekStartDate.toISOString(),
  };
}

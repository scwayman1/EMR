"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";

/**
 * Post-dose follow-up check-in action.
 *
 * After a patient logs a dose, they can opt to set a timer (30m / 1h / 2h / 4h)
 * to be reminded to check back in on how the dose felt. When that timer fires
 * the client renders an emoji modal and POSTs the chosen rating here.
 *
 * The OutcomeMetric enum doesn't have a dedicated `post_dose_feeling` value,
 * so we record the data point under the existing `mood` metric and stash the
 * structured marker (regimen + raw 1-5 emoji rating) inside `note` for later
 * reconstruction. This keeps the data queryable / exportable for research
 * (per the Patel directive) without requiring a schema migration.
 */

const followUpSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  productName: z.string().trim().min(1).max(200),
  regimenId: z.string().trim().max(64).optional().nullable(),
  delayMinutes: z.coerce.number().int().min(1).max(720).optional().nullable(),
});

export type FollowUpResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createFollowUpLog(input: {
  rating: number;
  productName: string;
  regimenId?: string | null;
  delayMinutes?: number | null;
}): Promise<FollowUpResult> {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid follow-up rating." };
  }

  const { rating, productName, regimenId, delayMinutes } = parsed.data;

  // Convert 1-5 emoji rating to a 0-10 mood-style value so it lines up
  // with the rest of the OutcomeLog series.
  // 1=terrible -> 1, 2=bad -> 3, 3=neutral -> 5, 4=good -> 7, 5=great -> 9
  const normalized = rating * 2 - 1;

  const noteParts = [
    "[post_dose_feeling]",
    `product=${productName}`,
    regimenId ? `regimenId=${regimenId}` : null,
    `emoji=${rating}`,
    delayMinutes ? `delay=${delayMinutes}m` : null,
  ].filter(Boolean);

  await prisma.outcomeLog.create({
    data: {
      patientId: patient.id,
      metric: "mood",
      value: normalized,
      note: noteParts.join(" "),
    },
  });

  revalidatePath("/portal/log-dose");
  revalidatePath("/portal/outcomes");
  revalidatePath("/portal/efficacy");
  revalidatePath("/portal/weekly-recap");

  return { ok: true };
}

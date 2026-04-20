"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser, requireRole } from "@/lib/auth/session";

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

/**
 * Post-dose emoji check-in.
 *
 * Writes one `EmojiOutcome` row scoped to the current user's
 * organization. Returns `{ ok: true }` on success or a human-readable
 * error. Never throws for expected validation / auth problems so the
 * client can render inline feedback.
 */

const emojiOutcomeSchema = z.object({
  feeling: z.enum([
    "much_better",
    "better",
    "same",
    "worse",
    "much_worse",
  ]),
  reliefLevel: z.coerce.number().int().min(1).max(10),
  productId: z.string().trim().max(64).optional().nullable(),
  takenAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
});

export type EmojiOutcomeInput = z.input<typeof emojiOutcomeSchema>;

export type EmojiOutcomeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function logEmojiOutcome(
  input: EmojiOutcomeInput,
): Promise<EmojiOutcomeResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!user.roles.includes("patient")) {
    return { ok: false, error: "Only patients can log dose check-ins." };
  }
  if (!user.organizationId) {
    return { ok: false, error: "No organization on account." };
  }

  const parsed = emojiOutcomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid check-in payload." };
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };
  // Defensive: make sure the patient row belongs to the same org as the
  // caller's active membership before we persist anything.
  if (patient.organizationId !== user.organizationId) {
    return { ok: false, error: "Organization mismatch." };
  }

  const takenAt = parsed.data.takenAt
    ? new Date(parsed.data.takenAt)
    : new Date();

  const row = await prisma.emojiOutcome.create({
    data: {
      patientId: patient.id,
      organizationId: user.organizationId,
      productId: parsed.data.productId ?? null,
      feeling: parsed.data.feeling,
      reliefLevel: parsed.data.reliefLevel,
      takenAt,
    },
    select: { id: true },
  });

  revalidatePath("/portal/log-dose");
  revalidatePath("/portal/outcomes");
  revalidatePath("/portal/efficacy");

  return { ok: true, id: row.id };
}

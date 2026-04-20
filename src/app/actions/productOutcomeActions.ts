"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PRODUCT_FEELINGS } from "@/lib/domain/product-outcomes";

/**
 * Server action for per-product outcome logging (Dr. Patel Directive).
 *
 * Every cannabis product a patient uses gets its own simple outcome log
 * (emoji + 1-10 effectiveness + side-effects) after each use. This action
 * validates input, scopes the write to the caller's org + patient profile,
 * and invalidates the surfaces that render the ranked product list.
 */

const FEELINGS_TUPLE = PRODUCT_FEELINGS as readonly [
  "great",
  "good",
  "ok",
  "bad",
  "awful",
];

const logProductOutcomeSchema = z.object({
  productId: z.string().min(1, "productId required"),
  feeling: z.enum(FEELINGS_TUPLE),
  effectivenessScore: z.coerce.number().int().min(1).max(10),
  sideEffects: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
});

export type LogProductOutcomeInput = z.input<typeof logProductOutcomeSchema>;

export type LogProductOutcomeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function logProductOutcome(
  input: LogProductOutcomeInput,
): Promise<LogProductOutcomeResult> {
  let user;
  try {
    user = await requireRole("patient");
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  if (!user.organizationId) {
    return { ok: false, error: "No organization on session." };
  }

  const parsed = logProductOutcomeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid outcome input." };
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient || patient.organizationId !== user.organizationId) {
    return { ok: false, error: "No patient profile found in your org." };
  }

  // Make sure the product belongs to the caller's organization so a patient
  // can't log outcomes against another clinic's products.
  const product = await prisma.product.findFirst({
    where: {
      id: parsed.data.productId,
      organizationId: user.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, error: "Product not available." };
  }

  // Dedupe side effects while preserving order.
  const seen = new Set<string>();
  const sideEffects: string[] = [];
  for (const raw of parsed.data.sideEffects) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sideEffects.push(v);
  }

  try {
    const row = await prisma.productOutcome.create({
      data: {
        patientId: patient.id,
        organizationId: user.organizationId,
        productId: product.id,
        feeling: parsed.data.feeling,
        effectivenessScore: parsed.data.effectivenessScore,
        sideEffects,
      },
      select: { id: true },
    });

    revalidatePath("/portal");
    revalidatePath("/portal/outcomes");
    revalidatePath("/portal/my-story");

    return { ok: true, id: row.id };
  } catch (err) {
    console.error("[productOutcomeActions] logProductOutcome failed", err);
    return { ok: false, error: "Could not log outcome." };
  }
}

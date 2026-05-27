"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  buildSubscribeStub,
  calculateRoi,
  RoiInputSchema,
  type RoiResult,
} from "@/lib/billing/subscription";

export type ComputeRoiResult =
  | { ok: true; result: RoiResult }
  | { ok: false; error: string };

export async function computeRoiAction(
  input: unknown,
): Promise<ComputeRoiResult> {
  await requireUser();
  try {
    const result = calculateRoi(input);
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof z.ZodError
          ? err.issues.map((i) => i.message).join("; ")
          : err instanceof Error
            ? err.message
            : "Could not calculate ROI",
    };
  }
}

const CheckoutSchema = z.object({
  tierId: z.enum(["starter", "growth", "scale", "enterprise"]),
  billingCycle: z.enum(["monthly", "annual"]),
  providerCount: z.number().int().min(1).max(500),
});

export type StartCheckoutResult =
  | { ok: true; checkoutUrl: string; expectedAnnualUsd: number; message: string }
  | { ok: false; error: string };

export async function startCheckoutAction(
  raw: unknown,
): Promise<StartCheckoutResult> {
  const user = await requireUser();
  const parsed = CheckoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  if (parsed.data.tierId === "enterprise") {
    return { ok: false, error: "Enterprise tier requires a sales conversation — contact sales@leafjourney.com." };
  }
  // Validate the input against the same shape used by the ROI math so a
  // future Stripe call doesn't have to re-parse.
  RoiInputSchema.pick({ tierId: true, billingCycle: true, providerCount: true });

  const stub = buildSubscribeStub({
    organizationId: user.organizationId ?? "demo",
    tierId: parsed.data.tierId,
    billingCycle: parsed.data.billingCycle,
    providerCount: parsed.data.providerCount,
  });
  return stub;
}

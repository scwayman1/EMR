import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  intent: z.enum(["retention", "reactivation", "first_purchase", "restock"]),
});

const output = z.object({
  patientId: z.string(),
  offer: z
    .object({
      label: z.string(),
      productIds: z.array(z.string()),
      discountPct: z.number().min(0).max(50),
      expiresAt: z.string(),
    })
    .nullable(),
});

/**
 * Promo Generator Agent
 * ---------------------
 * Generates targeted promos per patient cohort/intent. Respects
 * cannabis-marketing constraints — no medical claims, no outcome
 * promises.
 *
 * Status: stub (EMR-17 / Agent-night). Returns `offer: null` by default;
 * future version will pull cohort + product data.
 */
export const promoGeneratorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "promoGenerator",
  version: "0.1.0",
  description: "Generates targeted marketplace promos per patient intent.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ patientId }, ctx) {
    ctx.log("info", "promoGenerator stub", { patientId });
    return { patientId, offer: null };
  },
};

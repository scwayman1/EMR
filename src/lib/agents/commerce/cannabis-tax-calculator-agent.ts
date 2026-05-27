import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  orderId: z.string(),
  destinationState: z.string().length(2),
});

const output = z.object({
  orderId: z.string(),
  destinationState: z.string(),
  breakdown: z.array(
    z.object({
      label: z.string(),
      amount: z.number(),
    }),
  ),
  totalTax: z.number(),
});

/**
 * Cannabis Tax Calculator Agent
 * -----------------------------
 * Computes state + local cannabis excise + retail sales tax per order.
 * Rules vary wildly by state; this is the single source of truth the
 * checkout flow must call before charge.
 *
 * Status: stub (EMR-17 / Agent-night). Returns zero tax until the
 * state-rules table ships. Fulfillment MUST NOT rely on this to be
 * correct yet.
 */
export const cannabisTaxCalculatorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "cannabisTaxCalculator",
  version: "0.1.0",
  description: "Computes cannabis excise + retail tax per order destination.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ orderId, destinationState }, ctx) {
    ctx.log("warn", "cannabisTaxCalculator stub — returns 0; must not be used in production", {
      orderId,
      destinationState,
    });
    return { orderId, destinationState, breakdown: [], totalTax: 0 };
  },
};

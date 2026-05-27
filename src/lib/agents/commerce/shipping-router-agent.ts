import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  orderId: z.string(),
  destinationZip: z.string(),
});

const output = z.object({
  orderId: z.string(),
  carrier: z.enum(["usps", "ups", "fedex", "local_courier", "unassigned"]),
  estimatedDays: z.number().int().positive(),
  rationale: z.string(),
});

/**
 * Shipping Router Agent
 * ---------------------
 * Picks a fulfillment partner per order based on destination, product
 * type (cold-chain, hazmat, cannabinoid content), and partner SLAs.
 *
 * Status: stub (EMR-17 / Agent-night). Always returns `unassigned`
 * today — partner integration matrix is TODO.
 */
export const shippingRouterAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "shippingRouter",
  version: "0.1.0",
  description: "Picks a fulfillment carrier per order destination + product profile.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ orderId }, ctx) {
    ctx.log("info", "shippingRouter stub", { orderId });
    return {
      orderId,
      carrier: "unassigned" as const,
      estimatedDays: 5,
      rationale: "Stub — carrier matrix pending.",
    };
  },
};

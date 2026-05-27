import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ orderId: z.string() });

const output = z.object({
  orderId: z.string(),
  returnProbability: z.number().min(0).max(1),
  drivers: z.array(z.string()),
});

/**
 * Return Risk Scorer Agent
 * ------------------------
 * Predicts probability of return/refund for an order pre-ship. Signals:
 * product category base rate, size/variant changes, prior return history,
 * review sentiment on the specific product.
 *
 * Status: stub (EMR-17 / Agent-night). Returns uniform 0.1 prior until
 * historical data populates the model.
 */
export const returnRiskScorerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "returnRiskScorer",
  version: "0.1.0",
  description: "Predicts return probability for an order before fulfillment.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ orderId }, ctx) {
    ctx.log("info", "returnRiskScorer stub", { orderId });
    return { orderId, returnProbability: 0.1, drivers: [] };
  },
};

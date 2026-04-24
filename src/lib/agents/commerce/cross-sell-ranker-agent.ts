import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  productId: z.string(),
  limit: z.number().int().positive().max(20),
});

const output = z.object({
  anchorProductId: z.string(),
  crossSells: z.array(
    z.object({
      productId: z.string(),
      liftScore: z.number(),
      reason: z.string(),
    }),
  ),
});

/**
 * Cross-Sell Ranker Agent
 * -----------------------
 * Produces the "frequently bought with" list for a product detail page.
 * Mines co-occurrence from `OrderItem` within a rolling window.
 *
 * Status: stub (EMR-17 / Agent-night). Empty list until order volume is
 * sufficient; downstream UI should hide the section on empty.
 */
export const crossSellRankerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "crossSellRanker",
  version: "0.1.0",
  description: "'Frequently bought with' ranking from OrderItem co-occurrence.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ productId }, ctx) {
    ctx.log("info", "crossSellRanker stub invoked", { productId });
    return { anchorProductId: productId, crossSells: [] };
  },
};

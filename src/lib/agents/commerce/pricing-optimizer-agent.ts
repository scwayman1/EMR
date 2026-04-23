import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ productId: z.string() });

const output = z.object({
  productId: z.string(),
  currentPrice: z.number(),
  suggestedPrice: z.number().nullable(),
  direction: z.enum(["hold", "raise", "lower"]),
  rationale: z.string(),
});

/**
 * Pricing Optimizer Agent
 * -----------------------
 * Suggests price adjustments based on conversion rate, inventory depth,
 * competitor pricing (future), and stock velocity.
 *
 * Status: stub (EMR-17 / Agent-night). Always returns "hold" — pricing
 * moves are gated behind human approval per marketplace policy.
 */
export const pricingOptimizerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "pricingOptimizer",
  version: "0.1.0",
  description: "Suggests product price adjustments from demand + inventory signals.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ productId }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const p = await prisma.product.findUnique({ where: { id: productId }, select: { price: true } });
    const currentPrice = p?.price ?? 0;
    ctx.log("info", "pricingOptimizer stub", { productId });
    return {
      productId,
      currentPrice,
      suggestedPrice: null,
      direction: "hold" as const,
      rationale: "Stub: insufficient signal volume — holding price.",
    };
  },
};

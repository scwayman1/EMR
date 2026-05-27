import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  variantId: z.string(),
  horizonDays: z.number().int().positive().max(90),
});

const output = z.object({
  variantId: z.string(),
  horizonDays: z.number(),
  dailyVelocity: z.number(),
  projectedStockOutAt: z.string().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
});

/**
 * Restock Predictor Agent
 * -----------------------
 * Forecasts per-variant stock-out dates from recent `OrderItem` velocity.
 * Pairs with `waitlistNotifier` and `inventoryAlert` (existing).
 *
 * Status: stub (EMR-17 / Agent-night). Returns zero velocity until order
 * volume accumulates; downstream UI should render "insufficient data" on
 * `confidence: low`.
 */
export const restockPredictorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "restockPredictor",
  version: "0.1.0",
  description: "Forecasts per-variant stock-out dates from order velocity.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ variantId, horizonDays }, ctx) {
    ctx.log("info", "restockPredictor stub", { variantId, horizonDays });
    return {
      variantId,
      horizonDays,
      dailyVelocity: 0,
      projectedStockOutAt: null,
      confidence: "low" as const,
    };
  },
};

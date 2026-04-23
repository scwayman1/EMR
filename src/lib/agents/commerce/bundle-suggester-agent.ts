import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string().optional(),
  anchorProductId: z.string().optional(),
  limit: z.number().int().positive().max(10),
});

const output = z.object({
  bundles: z.array(
    z.object({
      label: z.string(),
      productIds: z.array(z.string()),
      rationale: z.string(),
    }),
  ),
});

/**
 * Bundle Suggester Agent
 * ----------------------
 * Proposes 2-3 product bundles (e.g. "Sleep stack", "Post-workout recovery")
 * from co-consumption patterns in `OrderItem` + clinician-pick overlap on
 * `symptoms`/`goals`.
 *
 * Status: stub (EMR-17 / Agent-night). Full implementation requires order
 * volume we don't yet have; returns an empty bundle list until then.
 */
export const bundleSuggesterAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "bundleSuggester",
  version: "0.1.0",
  description: "Suggests themed product bundles from co-consumption data.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run(_input, ctx) {
    ctx.log("info", "bundleSuggester stub — awaiting order volume for co-purchase signal");
    return { bundles: [] };
  },
};

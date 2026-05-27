import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  conditionLabel: z.string(),
  lookbackDays: z.number().int().positive().max(1825),
});

const output = z.object({
  conditionLabel: z.string(),
  suggestedProtocols: z.array(
    z.object({
      name: z.string(),
      thcCbdRatio: z.string().nullable(),
      route: z.string().nullable(),
      evidenceCohortSize: z.number(),
      medianImprovement: z.number().nullable(),
      caveat: z.string().optional(),
    }),
  ),
});

/**
 * Protocol Recommender Agent
 * --------------------------
 * Data-driven protocol suggestions from outcome clusters. Mines the top
 * regimens (by patient count + median improvement) for a given condition
 * and returns them as ranked candidates.
 *
 * Status: stub (EMR-269 / Research fleet). Clustering pending; returns
 * empty list today. Output shape stable so UI can wire.
 */
export const protocolRecommenderAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "protocolRecommender",
  version: "0.1.0",
  description: "Recommends regimen protocols per condition from outcome clusters.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ conditionLabel }, ctx) {
    ctx.log("info", "protocolRecommender stub", { conditionLabel });
    return { conditionLabel, suggestedProtocols: [] };
  },
};

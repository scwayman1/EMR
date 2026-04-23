import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  limit: z.number().int().positive().max(50),
});

const output = z.object({
  recommendations: z.array(
    z.object({
      productId: z.string(),
      slug: z.string(),
      score: z.number(),
      reasons: z.array(z.string()),
    }),
  ),
  generatedAt: z.string(),
});

/**
 * Product Recommender Agent
 * -------------------------
 * Per-patient marketplace recommendations. Delegates the scoring to the
 * outcome-weighted ranking engine (EMR-230) so the moat logic stays in one
 * place and is independently testable.
 *
 * Status: stub (EMR-17 / Agent-night 2026-04-23). Wired to the ranking
 * engine; will gain personalization layers (collaborative filtering,
 * cohort-based nudges) as data accumulates.
 */
export const productRecommenderAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "productRecommender",
  version: "0.1.0",
  description: "Per-patient marketplace recommendations, outcome-weighted.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ patientId, limit }, ctx) {
    const { rankProductsForPatient } = await import(
      "@/lib/marketplace/ranking"
    );
    const ranked = await rankProductsForPatient(patientId, { limit });
    ctx.log("info", "productRecommender produced ranking", {
      count: ranked.length,
    });
    return {
      recommendations: ranked.map((r) => ({
        productId: r.product.id,
        slug: r.product.slug,
        score: r.score,
        reasons: r.reasons,
      })),
      generatedAt: new Date().toISOString(),
    };
  },
};

import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  brand: z.string(),
  lookbackDays: z.number().int().positive().max(365),
});

const output = z.object({
  brand: z.string(),
  lookbackDays: z.number(),
  score: z.number().min(0).max(100),
  metrics: z.object({
    onTimeShipmentRate: z.number().min(0).max(1).nullable(),
    returnRate: z.number().min(0).max(1).nullable(),
    complaintRate: z.number().min(0).max(1).nullable(),
    avgReviewRating: z.number().min(0).max(5).nullable(),
  }),
});

/**
 * Vendor Performance Scorer Agent
 * -------------------------------
 * Scores product brands on fulfillment quality, return rate, complaint
 * rate, and aggregate review rating. Feeds the vendor portal dashboard.
 *
 * Status: stub (EMR-17 / Agent-night). Emits null metrics until we have
 * shipment + complaint tables; avg review rating is queryable today.
 */
export const vendorPerformanceScorerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "vendorPerformanceScorer",
  version: "0.1.0",
  description: "Scores marketplace brands on fulfillment + review performance.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ brand, lookbackDays }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const products = await prisma.product.findMany({
      where: { brand, deletedAt: null },
      select: { averageRating: true, reviewCount: true },
    });
    const totalReviews = products.reduce((s, p) => s + p.reviewCount, 0);
    const avg =
      totalReviews > 0
        ? products.reduce((s, p) => s + p.averageRating * p.reviewCount, 0) / totalReviews
        : null;
    ctx.log("info", "vendorPerformanceScorer stub scored brand", { brand });
    return {
      brand,
      lookbackDays,
      score: avg != null ? Math.round(avg * 20) : 0,
      metrics: {
        onTimeShipmentRate: null,
        returnRate: null,
        complaintRate: null,
        avgReviewRating: avg,
      },
    };
  },
};

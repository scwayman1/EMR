import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ organizationId: z.string() });

const output = z.object({
  anomalies: z.array(
    z.object({
      productId: z.string(),
      kind: z.enum([
        "compare_at_lower_than_price",
        "price_zero",
        "price_excessive_markdown",
        "variant_price_below_cost",
        "variant_price_above_base",
      ]),
      severity: z.enum(["low", "medium", "high"]),
      detail: z.string(),
    }),
  ),
});

/**
 * Pricing Anomaly Agent
 * ---------------------
 * Sweeps marketplace `Product` + `ProductVariant` rows for likely pricing
 * errors: `compareAtPrice < price`, zero price, implausibly deep markdowns.
 *
 * Status: stub (EMR-17 / Agent-night). Runs two high-signal checks today
 * so the catalog ops surface has something to flag.
 */
export const pricingAnomalyAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "pricingAnomaly",
  version: "0.1.0",
  description: "Flags marketplace pricing anomalies (inverted compareAt, zero, etc).",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ organizationId }, ctx) {
    const { prisma } = await import("@/lib/db/prisma");
    const products = await prisma.product.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, price: true, compareAtPrice: true },
    });
    const anomalies: z.infer<typeof output>["anomalies"] = [];
    for (const p of products) {
      if (p.price === 0) anomalies.push({ productId: p.id, kind: "price_zero", severity: "high", detail: "price is 0" });
      if (p.compareAtPrice != null && p.compareAtPrice < p.price)
        anomalies.push({
          productId: p.id,
          kind: "compare_at_lower_than_price",
          severity: "medium",
          detail: `compareAt ${p.compareAtPrice} < price ${p.price}`,
        });
    }
    ctx.log("info", "pricingAnomaly swept catalog", { count: anomalies.length });
    return { anomalies };
  },
};

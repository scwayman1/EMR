import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ productId: z.string() });

const output = z.object({
  productId: z.string(),
  currentCategoryIds: z.array(z.string()),
  suggestedAddCategoryIds: z.array(z.string()),
  suggestedRemoveCategoryIds: z.array(z.string()),
  rationale: z.string().optional(),
});

/**
 * Category Curator Agent
 * ----------------------
 * Suggests category additions and removals per product based on its
 * `symptoms`, `goals`, `format`, and `clinicianPick` flags.
 *
 * Status: stub (EMR-17 / Agent-night). Returns empty suggestions; full
 * mapping matrix is TODO.
 */
export const categoryCuratorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "categoryCurator",
  version: "0.1.0",
  description: "Suggests marketplace category additions and removals per product.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ productId }, ctx) {
    ctx.log("info", "categoryCurator stub", { productId });
    return {
      productId,
      currentCategoryIds: [],
      suggestedAddCategoryIds: [],
      suggestedRemoveCategoryIds: [],
    };
  },
};

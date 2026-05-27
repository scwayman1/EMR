import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string().optional(),
  query: z.string(),
  candidateProductIds: z.array(z.string()),
});

const output = z.object({
  rankedProductIds: z.array(z.string()),
  reasoning: z.string().optional(),
});

/**
 * Search Personalizer Agent
 * -------------------------
 * Reranks marketplace search results using the patient's active regimen,
 * recent outcome logs, and memory tags. Falls through to input order if no
 * patient context is available.
 *
 * Status: stub (EMR-17 / Agent-night). Pass-through today; real reranker
 * will consume the EMR-230 ranking engine.
 */
export const searchPersonalizerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "searchPersonalizer",
  version: "0.1.0",
  description: "Reranks marketplace search results against patient context.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ candidateProductIds }, ctx) {
    ctx.log("info", "searchPersonalizer stub — pass-through ordering");
    return { rankedProductIds: candidateProductIds };
  },
};

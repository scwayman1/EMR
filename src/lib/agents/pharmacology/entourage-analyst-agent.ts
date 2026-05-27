import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  indication: z.string(),
  preferFullSpectrum: z.boolean().optional(),
});

const output = z.object({
  preference: z.enum(["full_spectrum", "broad_spectrum", "isolate", "no_preference"]),
  rationale: z.string(),
  caveats: z.array(z.string()),
});

/**
 * Entourage Analyst
 * -----------------
 * Status: stub (EMR-272). Returns `no_preference` until the full-spectrum
 * vs isolate decision table lands with EMR-146.
 */
export const entourageAnalystAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "entourageAnalyst",
  version: "0.1.0",
  description:
    "Advises full-spectrum vs broad-spectrum vs isolate for a given indication.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ indication }, ctx) {
    ctx.log("info", "entourageAnalyst stub", { indication });
    return {
      preference: "no_preference" as const,
      rationale:
        "Stub — full/broad/isolate decision table pending EMR-146 ingest.",
      caveats: [],
    };
  },
};

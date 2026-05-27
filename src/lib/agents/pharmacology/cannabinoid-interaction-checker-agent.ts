import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  cannabinoids: z.array(
    z.object({
      name: z.enum(["THC", "CBD", "CBN", "CBG", "CBC", "THCV", "THCA", "CBDA"]),
      mgPerDose: z.number().min(0),
    }),
  ),
});

const output = z.object({
  flags: z.array(
    z.object({
      severity: z.enum(["info", "caution", "warning"]),
      summary: z.string(),
      involvedCannabinoids: z.array(z.string()),
    }),
  ),
});

/**
 * Cannabinoid Interaction Checker
 * -------------------------------
 * Status: stub (EMR-272 / Pharmacology fleet). Real matrix lands with the
 * Health Canada ingest in EMR-146. Today returns an empty flag list.
 */
export const cannabinoidInteractionCheckerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "cannabinoidInteractionChecker",
  version: "0.1.0",
  description:
    "Flags interactions within a multi-cannabinoid formulation at clinical dose.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ cannabinoids }, ctx) {
    ctx.log("info", "cannabinoidInteractionChecker stub", {
      cannabinoidCount: cannabinoids.length,
    });
    return { flags: [] };
  },
};

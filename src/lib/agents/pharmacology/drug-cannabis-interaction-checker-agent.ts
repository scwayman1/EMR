import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientMedications: z.array(z.string()),
  cannabinoids: z.array(
    z.object({
      name: z.enum(["THC", "CBD", "CBN", "CBG"]),
      mgPerDay: z.number().min(0),
    }),
  ),
});

const output = z.object({
  flags: z.array(
    z.object({
      severity: z.enum(["info", "caution", "warning", "contraindicated"]),
      medication: z.string(),
      cannabinoid: z.string(),
      mechanism: z.string(),
      recommendation: z.string(),
    }),
  ),
});

/**
 * Drug × Cannabis Interaction Checker
 * -----------------------------------
 * Status: stub (EMR-272). The high-value interactions (warfarin, SSRIs,
 * CYP3A4 inhibitors, immunosuppressants, certain antiepileptics) will be
 * encoded against the EMR-146 Health Canada + Epidiolex reference once
 * ingested. Returns empty flags today. Approval-gated.
 */
export const drugCannabisInteractionCheckerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "drugCannabisInteractionChecker",
  version: "0.1.0",
  description:
    "Flags interactions between patient medications and cannabinoid therapy.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ patientMedications, cannabinoids }, ctx) {
    ctx.log("info", "drugCannabisInteractionChecker stub", {
      medCount: patientMedications.length,
      cannabinoidCount: cannabinoids.length,
    });
    return { flags: [] };
  },
};

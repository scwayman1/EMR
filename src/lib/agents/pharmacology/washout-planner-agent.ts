import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  fromProductId: z.string(),
  toProductId: z.string(),
});

const output = z.object({
  patientId: z.string(),
  recommendedWashoutDays: z.number().int().min(0).nullable(),
  rationale: z.string(),
  warnings: z.array(z.string()),
});

/**
 * Washout Planner
 * ---------------
 * Status: stub (EMR-272). Schedules the cannabinoid washout when a patient
 * switches formulations; returns null days + caveat today.
 */
export const washoutPlannerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "washoutPlanner",
  version: "0.1.0",
  description:
    "Plans cannabinoid washout when a patient switches formulations.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ patientId, fromProductId, toProductId }, ctx) {
    ctx.log("info", "washoutPlanner stub", { patientId, fromProductId, toProductId });
    return {
      patientId,
      recommendedWashoutDays: null,
      rationale: "Stub — washout guidance pending EMR-146.",
      warnings: [],
    };
  },
};

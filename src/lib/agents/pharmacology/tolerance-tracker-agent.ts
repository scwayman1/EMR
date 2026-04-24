import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  cannabinoid: z.enum(["THC", "CBD", "CBN", "CBG"]),
  windowDays: z.number().int().positive().max(180),
});

const output = z.object({
  patientId: z.string(),
  toleranceTrend: z.enum(["stable", "rising", "declining", "insufficient_data"]),
  confidenceLevel: z.enum(["low", "medium", "high"]),
  recommendation: z.string(),
});

/**
 * Tolerance Tracker
 * -----------------
 * Status: stub (EMR-272). Rolling-window `DoseLog` analysis against
 * `OutcomeLog` trend lands next. Returns `insufficient_data` today.
 */
export const toleranceTrackerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "toleranceTracker",
  version: "0.1.0",
  description:
    "Detects developing tolerance across a patient's recent DoseLog + OutcomeLog.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ patientId, cannabinoid }, ctx) {
    ctx.log("info", "toleranceTracker stub", { patientId, cannabinoid });
    return {
      patientId,
      toleranceTrend: "insufficient_data" as const,
      confidenceLevel: "low" as const,
      recommendation:
        "Stub — rolling-window tolerance analysis pending.",
    };
  },
};

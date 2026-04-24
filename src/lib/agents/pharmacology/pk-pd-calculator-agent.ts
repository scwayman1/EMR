import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  cannabinoid: z.enum(["THC", "CBD", "CBN", "CBG"]),
  mgDose: z.number().positive(),
  route: z.enum(["sublingual", "oral", "inhaled", "topical", "transdermal"]),
  patientWeightKg: z.number().positive().optional(),
});

const output = z.object({
  estimatedBioavailabilityPct: z.number().nullable(),
  estimatedCmaxNgPerMl: z.number().nullable(),
  estimatedTmaxMinutes: z.number().nullable(),
  estimatedHalfLifeHours: z.number().nullable(),
  caveat: z.string(),
});

/**
 * PK/PD Calculator
 * ----------------
 * Status: stub (EMR-272). Returns null values with caveat; the real
 * parameter tables land with EMR-146.
 */
export const pkPdCalculatorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "pkPdCalculator",
  version: "0.1.0",
  description: "Estimates PK/PD parameters for a cannabinoid + route + dose.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ cannabinoid, route, mgDose }, ctx) {
    ctx.log("info", "pkPdCalculator stub", { cannabinoid, route, mgDose });
    return {
      estimatedBioavailabilityPct: null,
      estimatedCmaxNgPerMl: null,
      estimatedTmaxMinutes: null,
      estimatedHalfLifeHours: null,
      caveat: "Stub — PK/PD tables pending EMR-146.",
    };
  },
};

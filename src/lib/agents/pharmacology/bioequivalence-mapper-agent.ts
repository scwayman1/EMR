import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  cannabinoid: z.enum(["THC", "CBD", "CBN", "CBG"]),
  mgDose: z.number().positive(),
  fromRoute: z.enum(["sublingual", "oral", "inhaled", "topical", "transdermal"]),
  toRoute: z.enum(["sublingual", "oral", "inhaled", "topical", "transdermal"]),
});

const output = z.object({
  convertedMg: z.number().nullable(),
  conversionFactor: z.number().nullable(),
  caveat: z.string(),
});

/**
 * Bioequivalence Mapper
 * ---------------------
 * Status: stub (EMR-272). Dose-equivalence across routes requires the
 * EMR-146 PK tables; returns null conversion today with a clear caveat.
 */
export const bioequivalenceMapperAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "bioequivalenceMapper",
  version: "0.1.0",
  description:
    "Converts a cannabinoid dose between routes of administration.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ cannabinoid, fromRoute, toRoute }, ctx) {
    ctx.log("info", "bioequivalenceMapper stub", { cannabinoid, fromRoute, toRoute });
    return {
      convertedMg: null,
      conversionFactor: null,
      caveat: "Stub — route-to-route conversion table pending EMR-146.",
    };
  },
};

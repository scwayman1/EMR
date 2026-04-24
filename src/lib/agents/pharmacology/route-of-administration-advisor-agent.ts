import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  indication: z.string(),
  onsetNeed: z.enum(["immediate", "minutes", "hours"]),
  durationNeed: z.enum(["short", "moderate", "extended"]),
  patientPreference: z
    .enum(["sublingual", "oral", "inhaled", "topical", "transdermal"])
    .optional(),
});

const output = z.object({
  recommendation: z.enum([
    "sublingual",
    "oral",
    "inhaled",
    "topical",
    "transdermal",
    "unspecified",
  ]),
  rationale: z.string(),
  alternatives: z.array(z.string()),
});

/**
 * Route of Administration Advisor
 * -------------------------------
 * Status: stub (EMR-272). Decision matrix pending EMR-146 ingest; returns
 * `unspecified` today with a clear rationale note.
 */
export const routeOfAdministrationAdvisorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "routeOfAdministrationAdvisor",
  version: "0.1.0",
  description:
    "Recommends a route of administration given indication + onset + duration needs.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ indication }, ctx) {
    ctx.log("info", "routeOfAdministrationAdvisor stub", { indication });
    return {
      recommendation: "unspecified" as const,
      rationale: "Stub — decision matrix lands with EMR-146 Health Canada ingest.",
      alternatives: [],
    };
  },
};

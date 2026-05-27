import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  cohortLabel: z.string(),
  cohortSize: z.number(),
  primaryConditions: z.array(z.string()),
  primaryProducts: z.array(z.string()).optional(),
});

const output = z.object({
  matches: z.array(
    z.object({
      partnerKind: z.enum(["academic", "industry", "patient_advocacy", "regulator"]),
      partnerName: z.string(),
      fitScore: z.number().min(0).max(100),
      rfpOrContact: z.string(),
      rationale: z.string(),
    }),
  ),
  searchedAt: z.string(),
});

/**
 * Research Partner Matcher Agent
 * ------------------------------
 * Matches cohorts against a curated registry of academic labs,
 * pharma RFPs, patient-advocacy groups, and regulator observational
 * programs looking for real-world data. The registry is separate data
 * (seeded by ops) and updated quarterly.
 *
 * Status: stub (EMR-269 / Research fleet). Empty matches until the
 * registry ships. Output shape stable.
 */
export const researchPartnerMatcherAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "researchPartnerMatcher",
  version: "0.1.0",
  description: "Matches a cohort profile against academic, pharma, and regulator partner RFPs.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ cohortLabel, cohortSize }, ctx) {
    ctx.log("info", "researchPartnerMatcher stub", { cohortLabel, cohortSize });
    return {
      matches: [],
      searchedAt: new Date().toISOString(),
    };
  },
};

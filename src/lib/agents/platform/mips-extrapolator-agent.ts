import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";
import {
  extrapolate,
  mipsCohortInputSchema,
  type MipsExtrapolationResult,
} from "@/lib/platform/mips";

/**
 * EMR-042 — MIPS extrapolator agent.
 *
 * Receives a cohort snapshot (already aggregated from chart, dose log,
 * eligibility and referrals data) and runs the rule engine. The agent
 * itself is intentionally thin — the math lives in `lib/platform/mips`
 * so it stays testable without spinning up the agent harness.
 *
 * Approval policy: never. The output is informational; only QPP
 * submission requires human sign-off, which lives outside this agent.
 */

const input = mipsCohortInputSchema;

const output = z.object({
  reportingPeriodStart: z.string(),
  reportingPeriodEnd: z.string(),
  totalPatients: z.number(),
  measures: z.array(
    z.object({
      measureId: z.string(),
      category: z.string(),
      title: z.string(),
      numerator: z.number(),
      denominator: z.number(),
      performance: z.number(),
      scorePoints: z.number(),
      blockers: z.array(z.string()),
    }),
  ),
  categories: z.array(
    z.object({
      category: z.string(),
      scorePoints: z.number(),
      scorePossible: z.number(),
      weightedScore: z.number(),
    }),
  ),
  compositeScore: z.number(),
  categoryWeights: z.record(z.number()),
});

export const mipsExtrapolatorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "mipsExtrapolator",
  version: "0.1.0",
  description:
    "Extrapolates MIPS / MACRA quality measure performance from a patient cohort snapshot.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run(cohort, ctx) {
    const result: MipsExtrapolationResult = extrapolate(cohort);
    ctx.log("info", "mipsExtrapolator computed composite", {
      compositeScore: result.compositeScore,
      patients: result.totalPatients,
      reportingPeriod: `${result.reportingPeriodStart}..${result.reportingPeriodEnd}`,
    });
    return result;
  },
};

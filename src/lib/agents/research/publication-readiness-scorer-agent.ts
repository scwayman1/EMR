import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  cohortPatientIds: z.array(z.string()),
  targetJournal: z.string().optional(),
});

const output = z.object({
  score: z.number().min(0).max(100),
  passedChecks: z.array(z.string()),
  gaps: z.array(
    z.object({
      check: z.string(),
      severity: z.enum(["blocker", "warning", "advisory"]),
      detail: z.string(),
    }),
  ),
  readinessLevel: z.enum(["case_report", "observational", "journal", "not_ready"]),
});

/**
 * Publication Readiness Scorer Agent
 * ----------------------------------
 * Scores a cohort for publication readiness. Checks sample size,
 * follow-up duration, control group presence, outcome measure
 * validity (e.g. PROMIS), missing-data rates, consent coverage.
 *
 * Status: stub (EMR-269 / Research fleet). Emits `not_ready` + empty
 * checks today. Real heuristic bundle follows the MCL (Medical Cannabis
 * Library) publication criteria.
 */
export const publicationReadinessScorerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "publicationReadinessScorer",
  version: "0.1.0",
  description: "Scores a cohort's readiness for academic publication.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ cohortPatientIds }, ctx) {
    ctx.log("info", "publicationReadinessScorer stub", {
      size: cohortPatientIds.length,
    });
    return {
      score: 0,
      passedChecks: [],
      gaps: [],
      readinessLevel: "not_ready" as const,
    };
  },
};

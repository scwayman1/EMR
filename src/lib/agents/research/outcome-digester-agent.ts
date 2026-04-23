import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  cohortLabel: z.string(),
  patientIds: z.array(z.string()),
  periodDays: z.number().int().positive().max(3650),
});

const output = z.object({
  cohortLabel: z.string(),
  size: z.number(),
  periodDays: z.number(),
  narrative: z.string(),
  highlightMetrics: z.array(
    z.object({
      metric: z.string(),
      mean: z.number(),
      changeVsBaseline: z.number().nullable(),
    }),
  ),
});

/**
 * Outcome Digester Agent
 * ----------------------
 * Narrative rollup of a cohort's outcomes over a period. Feeds monthly
 * digests, investor updates, and partner-performance reviews.
 *
 * Status: stub (EMR-269 / Research fleet). Emits a placeholder narrative
 * today; LLM-written summaries are TODO. Structured `highlightMetrics`
 * shape is stable so downstream dashboards can wire now.
 */
export const outcomeDigesterAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "outcomeDigester",
  version: "0.1.0",
  description: "Narrative summary of cohort outcomes across a time window.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ cohortLabel, patientIds, periodDays }, ctx) {
    ctx.log("info", "outcomeDigester stub", { cohortLabel, size: patientIds.length });
    return {
      cohortLabel,
      size: patientIds.length,
      periodDays,
      narrative: `Stub digest for cohort ${cohortLabel} over the last ${periodDays} days. Full narrative pending LLM wiring.`,
      highlightMetrics: [],
    };
  },
};

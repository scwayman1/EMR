import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const cohortRef = z.object({
  memoryTag: z.string().optional(),
  label: z.string(),
});

const input = z.object({
  organizationId: z.string(),
  cohortA: cohortRef,
  cohortB: cohortRef,
  metric: z.enum([
    "pain",
    "sleep",
    "anxiety",
    "mood",
    "nausea",
    "appetite",
    "energy",
    "adherence",
    "side_effects",
  ]),
  lookbackDays: z.number().int().positive().max(3650),
});

const output = z.object({
  metric: z.string(),
  a: z.object({ label: z.string(), mean: z.number().nullable(), n: z.number() }),
  b: z.object({ label: z.string(), mean: z.number().nullable(), n: z.number() }),
  delta: z.number().nullable(),
  pValueEstimate: z.number().nullable(),
  interpretation: z.string(),
});

/**
 * Efficacy Comparator Agent
 * -------------------------
 * Head-to-head outcome comparison between two cohorts on a single metric.
 * Pairs with `cohortBuilder` — you build two cohorts, then compare them.
 *
 * Status: stub (EMR-269 / Research fleet). Returns empty shape until the
 * statistical plumbing is wired; downstream UIs should hide the section
 * when `pValueEstimate` is null.
 */
export const efficacyComparatorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "efficacyComparator",
  version: "0.1.0",
  description:
    "Head-to-head comparison of two cohorts on a single outcome metric.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ cohortA, cohortB, metric }, ctx) {
    ctx.log("info", "efficacyComparator stub", { metric });
    return {
      metric,
      a: { label: cohortA.label, mean: null, n: 0 },
      b: { label: cohortB.label, mean: null, n: 0 },
      delta: null,
      pValueEstimate: null,
      interpretation: "Stub — statistical comparison not yet implemented.",
    };
  },
};

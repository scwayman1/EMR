import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  organizationId: z.string(),
  productId: z.string().optional(),
  cohortPatientIds: z.array(z.string()).optional(),
  windowDays: z.number().int().positive().max(365),
});

const output = z.object({
  windowDays: z.number(),
  cohortSize: z.number(),
  flags: z.array(
    z.object({
      severity: z.enum(["info", "notable", "concern", "urgent"]),
      pattern: z.string(),
      affectedPatientIds: z.array(z.string()),
      firstObservedAt: z.string().nullable(),
    }),
  ),
});

/**
 * Adverse Event Scanner Agent
 * ---------------------------
 * Sweeps `ClinicalObservation` rows tagged `side_effect` or `red_flag`
 * across a cohort or product and flags unusual clustering (e.g. same
 * side effect reported by >5% of a cohort within 14 days).
 *
 * Status: stub (EMR-269 / Research fleet). Empty flag list today; real
 * heuristic clustering is TODO.
 */
export const adverseEventScannerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "adverseEventScanner",
  version: "0.1.0",
  description: "Flags unusual adverse-event clusters across a cohort or product.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ windowDays, cohortPatientIds }, ctx) {
    ctx.log("info", "adverseEventScanner stub", {
      windowDays,
      cohortSize: cohortPatientIds?.length ?? 0,
    });
    return {
      windowDays,
      cohortSize: cohortPatientIds?.length ?? 0,
      flags: [],
    };
  },
};

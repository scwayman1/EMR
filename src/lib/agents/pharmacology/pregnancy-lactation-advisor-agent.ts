import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  stage: z.enum([
    "preconception",
    "pregnancy_t1",
    "pregnancy_t2",
    "pregnancy_t3",
    "lactation",
    "none",
  ]),
});

const output = z.object({
  patientId: z.string(),
  stage: z.string(),
  guidance: z.string(),
  caveats: z.array(z.string()),
});

/**
 * Pregnancy / Lactation Advisor
 * -----------------------------
 * Status: stub (EMR-272). Returns a conservative default advisory —
 * detailed stage-specific guidance lands with EMR-146. Approval-gated
 * because perinatal framing is high-stakes.
 */
export const pregnancyLactationAdvisorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "pregnancyLactationAdvisor",
  version: "0.1.0",
  description:
    "Cautious framing for cannabinoid use across pregnancy and lactation.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ patientId, stage }, ctx) {
    ctx.log("info", "pregnancyLactationAdvisor stub", { patientId, stage });
    return {
      patientId,
      stage,
      guidance:
        "Stub — consult current Health Canada and ACOG guidance. Default is conservative avoidance.",
      caveats: [
        "Detailed stage-specific framing lands with EMR-146 ingest.",
      ],
    };
  },
};

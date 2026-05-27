import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";
import {
  PLAYBOOK,
  STAGE_ORDER,
  nextStage,
  scoreClaim,
} from "@/lib/platform/billing-orchestrator";

/**
 * EMR-045 — Insurance billing AI orchestrator agent.
 *
 * Lives above the 19-agent revenue-cycle fleet. Given a claim (or a set
 * of doc signals), the orchestrator returns:
 *
 *  - Where the claim is in the playbook
 *  - Which agent should pick it up next
 *  - A maximization score + recommendations to lift the allowed amount
 *  - Recommended hand-off events for the workflow runner to dispatch
 *
 * The orchestrator does not move the claim itself — it tells the runner
 * what to do, and the runner enacts it. That keeps every state change
 * audited through the existing AgentJob path.
 */

const docSignalsSchema = z.object({
  diagnosesSupportingComplexity: z.number(),
  emLevelSupportedByDocumentation: z.boolean(),
  timeBasedDocumentationPresent: z.boolean(),
  modifiersAttached: z.number(),
  modifiersRecommended: z.number(),
  socialDeterminantsCaptured: z.boolean(),
  priorAuthValid: z.boolean(),
  isSelfPay: z.boolean(),
});

const input = z.object({
  claimId: z.string(),
  currentStage: z.enum(STAGE_ORDER as [string, ...string[]]),
  docSignals: docSignalsSchema,
});

const output = z.object({
  claimId: z.string(),
  currentStage: z.string(),
  nextStage: z.string().nullable(),
  primaryAgent: z.string(),
  consumes: z.array(z.string()),
  produces: z.array(z.string()),
  handoffsTo: z.array(z.string()),
  maximizationScore: z.number(),
  upliftPotentialPercent: z.number(),
  recommendations: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      detail: z.string(),
      routeTo: z.string(),
    }),
  ),
  recommendedEvents: z.array(z.string()),
});

export const insuranceBillingOrchestratorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "insuranceBillingOrchestrator",
  version: "0.1.0",
  description:
    "Routes a claim through the revenue-cycle fleet and scores it for documentation maximization.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ claimId, currentStage, docSignals }, ctx) {
    const playbook = PLAYBOOK.find((p) => p.stage === currentStage);
    if (!playbook) {
      throw new Error(`Unknown claim stage: ${currentStage}`);
    }

    const max = scoreClaim(docSignals);
    const next = nextStage(currentStage as any);

    // Recommended events — produce-events the runner should dispatch
    // assuming the stage will succeed. The runner debounces if the agent
    // for this stage is already busy.
    const recommendedEvents = playbook.produces;

    ctx.log("info", "insuranceBillingOrchestrator advanced claim", {
      claimId,
      from: currentStage,
      to: next,
      score: max.score,
      recommendations: max.recommendations.length,
    });

    return {
      claimId,
      currentStage,
      nextStage: next,
      primaryAgent: playbook.primaryAgent,
      consumes: playbook.consumes,
      produces: playbook.produces,
      handoffsTo: playbook.handoffsTo,
      maximizationScore: max.score,
      upliftPotentialPercent: max.upliftPotentialPercent,
      recommendations: max.recommendations,
      recommendedEvents,
    };
  },
};

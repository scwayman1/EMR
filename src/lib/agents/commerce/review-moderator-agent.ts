import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ reviewId: z.string() });

const output = z.object({
  reviewId: z.string(),
  flag: z.enum(["ok", "spam", "fake", "off_topic", "harmful"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});

/**
 * Review Moderator Agent
 * ----------------------
 * Scans `ProductReview.body` for spam, astroturfing, and harmful claims
 * (e.g. medical advice beyond wellness positioning). Flags rather than
 * deletes — moderation workflow is human-gated.
 *
 * Status: stub (EMR-17 / Agent-night). Returns `ok` for all inputs; full
 * heuristic + LLM scoring is TODO.
 */
export const reviewModeratorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "reviewModerator",
  version: "0.1.0",
  description: "Flags product reviews for spam, fake content, or harmful claims.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ reviewId }, ctx) {
    ctx.log("info", "reviewModerator stub", { reviewId });
    return { reviewId, flag: "ok" as const, confidence: 0.1 };
  },
};

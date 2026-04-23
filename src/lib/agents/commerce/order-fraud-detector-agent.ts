import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ orderId: z.string() });

const output = z.object({
  orderId: z.string(),
  riskScore: z.number().min(0).max(100),
  signals: z.array(z.string()),
  action: z.enum(["allow", "review", "block"]),
});

/**
 * Order Fraud Detector Agent
 * --------------------------
 * Scores a new order for fraud risk. Signals: unusual total vs. patient
 * baseline, shipping/billing address mismatch, high-velocity new account,
 * known-fraudster lookup.
 *
 * Status: stub (EMR-17 / Agent-night). Conservative default — always
 * "allow" with score 0 until signal library lands.
 */
export const orderFraudDetectorAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "orderFraudDetector",
  version: "0.1.0",
  description: "Scores new orders for fraud risk before fulfillment.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ orderId }, ctx) {
    ctx.log("info", "orderFraudDetector stub", { orderId });
    return { orderId, riskScore: 0, signals: [], action: "allow" as const };
  },
};

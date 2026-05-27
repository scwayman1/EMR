import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  orderId: z.string(),
});

const output = z.object({
  orderId: z.string(),
  allowed: z.boolean(),
  blockers: z.array(
    z.enum([
      "missing_medical_auth",
      "state_purchase_limit_exceeded",
      "unlicensed_shipping_state",
      "missing_age_verification",
      "thc_dosage_exceeds_state_cap",
    ]),
  ),
  notes: z.string().optional(),
});

/**
 * Cannabis Compliance Gate Agent
 * ------------------------------
 * Hard gate before fulfillment. Verifies medical authorization,
 * state-level purchase and THC caps, and age verification. A single
 * blocker returns `allowed: false`.
 *
 * Status: stub (EMR-17 / Agent-night). Permissive default — always
 * allows until the state-rules data lands. MUST be tightened before
 * any real fulfillment flow.
 */
export const cannabisComplianceGateAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "cannabisComplianceGate",
  version: "0.1.0",
  description: "Compliance gate verifying medical auth, state caps, and age before fulfillment.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ orderId }, ctx) {
    ctx.log("warn", "cannabisComplianceGate stub — permissive default, MUST harden before fulfillment", {
      orderId,
    });
    return { orderId, allowed: true, blockers: [], notes: "Stub — no rules enforced yet." };
  },
};

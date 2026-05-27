import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({ variantId: z.string() });

const output = z.object({
  variantId: z.string(),
  notifiedPatientIds: z.array(z.string()),
  skippedReason: z.string().optional(),
});

/**
 * Waitlist Notifier Agent
 * -----------------------
 * When a variant transitions from out-of-stock to in-stock, notifies
 * patients who opted into the restock waitlist for that variant.
 *
 * Status: stub (EMR-17 / Agent-night). Waitlist model + opt-in flow are
 * TODO; returns empty list today.
 */
export const waitlistNotifierAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "waitlistNotifier",
  version: "0.1.0",
  description: "Notifies patients waitlisted on a variant once it's back in stock.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: false,

  async run({ variantId }, ctx) {
    ctx.log("info", "waitlistNotifier stub — waitlist model not yet built", { variantId });
    return { variantId, notifiedPatientIds: [], skippedReason: "waitlist model pending" };
  },
};

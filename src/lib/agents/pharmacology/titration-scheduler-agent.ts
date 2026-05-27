import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

const input = z.object({
  patientId: z.string(),
  startingMgPerDay: z.number().positive(),
  targetMgPerDay: z.number().positive(),
  direction: z.enum(["up", "down"]),
  stepPct: z.number().min(5).max(50).optional(),
});

const output = z.object({
  patientId: z.string(),
  steps: z.array(
    z.object({
      weekIndex: z.number(),
      mgPerDay: z.number(),
      holdDays: z.number(),
      note: z.string().optional(),
    }),
  ),
  assumptions: z.array(z.string()),
});

/**
 * Titration Scheduler
 * -------------------
 * Status: stub (EMR-272). Real scheduler will respect tolerance-tracker
 * signals + product-specific PK constraints once EMR-146 ingest lands.
 * Returns an empty ladder today.
 */
export const titrationSchedulerAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "titrationScheduler",
  version: "0.1.0",
  description:
    "Generates an up/down-titration ladder between starting and target dose.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ patientId, direction }, ctx) {
    ctx.log("info", "titrationScheduler stub", { patientId, direction });
    return {
      patientId,
      steps: [],
      assumptions: [
        "Stub — real ladder generation pending EMR-146 PK tables.",
      ],
    };
  },
};

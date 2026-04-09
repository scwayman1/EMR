import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({ patientId: z.string() });
const output = z.object({
  actions: z.array(z.object({ type: z.string(), scheduledFor: z.string() })),
});

/**
 * Scheduling Agent
 * ----------------
 * Creates follow-up reminder tasks after a visit. Real SMS/email delivery
 * is deferred; V1 writes Tasks that the operator dashboard can surface.
 */
export const schedulingAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "scheduling",
  version: "1.0.0",
  description: "Creates scheduling reminders and visit prep tasks.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.task"],
  requiresApproval: false,

  async run({ patientId }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const dueAt = new Date(Date.now() + 14 * 86400000);

    ctx.assertCan("write.task");
    await prisma.task.create({
      data: {
        organizationId: patient.organizationId,
        patientId,
        title: "Offer 2-week follow-up visit",
        assigneeRole: "operator",
        dueAt,
      },
    });

    await writeAgentAudit(
      "scheduling",
      "1.0.0",
      patient.organizationId,
      "scheduling.reminder.created",
      { type: "Patient", id: patientId },
      { dueAt: dueAt.toISOString() }
    );

    return {
      actions: [{ type: "followup.offer", scheduledFor: dueAt.toISOString() }],
    };
  },
};

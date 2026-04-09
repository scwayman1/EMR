import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

const input = z.object({
  patientId: z.string(),
  intent: z.string(),
});

const output = z.object({
  draftMessageId: z.string(),
  draftBody: z.string(),
  tone: z.enum(["warm", "formal", "direct"]),
});

const TEMPLATES: Record<string, (name: string) => string> = {
  follow_up: (name) =>
    `Hi ${name}, checking in on how things have been going since your last visit. When you have a minute, could you share how your symptoms have been this week? We're here whenever you need us.`,
  intake_nudge: (name) =>
    `Hi ${name}, we noticed your intake is almost complete. Finishing up takes just a few minutes and helps your care team prepare for your visit.`,
  appointment_confirm: (name) =>
    `Hi ${name}, this is a reminder of your upcoming visit. Please reply here if you need to reschedule — we'll make it easy.`,
};

/**
 * Messaging Assistant Agent
 * -------------------------
 * Drafts routine outbound messages. Never sends — all output is stored as
 * a draft Message and requires human sign-off in Mission Control.
 */
export const messagingAssistantAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "messagingAssistant",
  version: "1.0.0",
  description: "Drafts routine outbound patient messages for human approval.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.patient", "write.message.draft"],
  requiresApproval: true,

  async run({ patientId, intent }, ctx) {
    ctx.assertCan("read.patient");
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error(`Patient not found: ${patientId}`);

    const template = TEMPLATES[intent] ?? TEMPLATES.follow_up;
    const body = template(patient.firstName);

    // Upsert the thread.
    const thread = await prisma.messageThread.findFirst({
      where: { patientId },
      orderBy: { lastMessageAt: "desc" },
    });

    const threadId =
      thread?.id ??
      (
        await prisma.messageThread.create({
          data: {
            patientId,
            subject: "Care team",
          },
        })
      ).id;

    ctx.assertCan("write.message.draft");
    const message = await prisma.message.create({
      data: {
        threadId,
        body,
        senderAgent: "agent:messagingAssistant@1.0.0",
        aiDrafted: true,
        status: "draft",
      },
    });

    await writeAgentAudit(
      "messagingAssistant",
      "1.0.0",
      patient.organizationId,
      "message.drafted",
      { type: "Message", id: message.id },
      { intent, threadId }
    );

    ctx.log("info", "Message draft created", { messageId: message.id, intent });

    return { draftMessageId: message.id, draftBody: body, tone: "warm" };
  },
};

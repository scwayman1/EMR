"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";

/**
 * When a patient sends a message, we dispatch `message.received` so the
 * correspondenceNurse workflow can triage the thread and draft a reply
 * for the physician to approve. That dispatch is wrapped in try/catch:
 * under no circumstances does an agent failure block the patient from
 * getting their message through. The Constitution (Art. VI §1) requires
 * clinical features to fail gracefully — a dead agent queue must not
 * silence a patient.
 */
async function triggerNurseTriage(
  messageId: string,
  threadId: string,
  patientId: string,
  organizationId: string,
) {
  try {
    await dispatch({
      name: "message.received",
      messageId,
      threadId,
      patientId,
      organizationId,
    });
    // In dev, run the agent queue inline so the draft appears in /clinic/approvals
    // the moment the clinician refreshes — no worker heartbeat required.
    if (process.env.NODE_ENV !== "production") {
      await runTick("inline-dev", 4);
    }
  } catch (err) {
    console.warn("[portal/messages] failed to dispatch message.received", {
      messageId,
      threadId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------- Reply to an existing thread ----------

const replySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export type ReplyResult = { ok: true } | { ok: false; error: string };

export async function sendReplyAction(
  _prev: ReplyResult | null,
  formData: FormData
): Promise<ReplyResult> {
  const user = await requireRole("patient");

  const parsed = replySchema.safeParse({
    threadId: formData.get("threadId") as string,
    body: (formData.get("body") as string)?.trim(),
  });

  if (!parsed.success) return { ok: false, error: "Please enter a message." };

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  // Verify thread belongs to this patient
  const thread = await prisma.messageThread.findFirst({
    where: { id: parsed.data.threadId, patientId: patient.id },
  });
  if (!thread) return { ok: false, error: "Thread not found." };

  const now = new Date();

  // Create the row, then update the thread timestamp. We capture the
  // created message's id from the transaction so we can hand it to the
  // agent dispatch.
  const [createdMessage] = await prisma.$transaction([
    prisma.message.create({
      data: {
        threadId: parsed.data.threadId,
        senderUserId: user.id,
        status: "sent",
        body: parsed.data.body,
        sentAt: now,
      },
    }),
    prisma.messageThread.update({
      where: { id: parsed.data.threadId },
      data: { lastMessageAt: now },
    }),
  ]);

  // Fire the agent trigger AFTER the transaction commits so the agent
  // can read the row. Never inside the transaction.
  await triggerNurseTriage(
    createdMessage.id,
    parsed.data.threadId,
    patient.id,
    patient.organizationId,
  );

  revalidatePath("/portal/messages");
  return { ok: true };
}

// ---------- Create a new thread ----------

const newThreadSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
});

export type NewThreadResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

export async function createThreadAction(
  _prev: NewThreadResult | null,
  formData: FormData
): Promise<NewThreadResult> {
  const user = await requireRole("patient");

  const parsed = newThreadSchema.safeParse({
    subject: (formData.get("subject") as string)?.trim(),
    body: (formData.get("body") as string)?.trim(),
  });

  if (!parsed.success)
    return { ok: false, error: "Subject and message are required." };

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const now = new Date();

  // Create thread + initial message in a single write, then include the
  // message back so we have its id for the agent dispatch.
  const thread = await prisma.messageThread.create({
    data: {
      patientId: patient.id,
      subject: parsed.data.subject,
      lastMessageAt: now,
      messages: {
        create: {
          senderUserId: user.id,
          status: "sent",
          body: parsed.data.body,
          sentAt: now,
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const initialMessage = thread.messages[0];
  if (initialMessage) {
    await triggerNurseTriage(
      initialMessage.id,
      thread.id,
      patient.id,
      patient.organizationId,
    );
  }

  revalidatePath("/portal/messages");
  redirect(`/portal/messages?thread=${thread.id}`);
}

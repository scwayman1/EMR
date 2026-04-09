"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";

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

  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) return { ok: false, error: "No patient profile found." };

  // Verify thread belongs to this patient
  const thread = await prisma.messageThread.findFirst({
    where: { id: parsed.data.threadId, patientId: patient.id },
  });
  if (!thread) return { ok: false, error: "Thread not found." };

  const now = new Date();

  await prisma.$transaction([
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

  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const now = new Date();

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
  });

  revalidatePath("/portal/messages");
  redirect(`/portal/messages?thread=${thread.id}`);
}

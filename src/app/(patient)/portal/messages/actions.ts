"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import type { ReplyResult } from "@/components/messaging/ReplyForm";
import type { NewThreadResult } from "@/components/messaging/NewThreadForm";

const ReplySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
});

export async function sendPatientReplyAction(
  threadId: string,
  _prev: ReplyResult | null,
  formData: FormData,
): Promise<ReplyResult> {
  const user = await requireRole("patient");

  const parsed = ReplySchema.safeParse({
    threadId,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please write a message." };
  }

  // Verify the thread belongs to this patient.
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, patient: { userId: user.id } },
    select: { id: true },
  });
  if (!thread) return { ok: false, error: "Thread not found." };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        threadId: thread.id,
        senderUserId: user.id,
        status: "sent",
        body: parsed.data.body,
        sentAt: now,
      },
    }),
    prisma.messageThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: now },
    }),
  ]);

  revalidatePath("/portal/messages");
  revalidatePath(`/portal/messages/${thread.id}`);
  return { ok: true };
}

const NewThreadSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export async function createPatientThreadAction(
  _prev: NewThreadResult | null,
  formData: FormData,
): Promise<NewThreadResult> {
  const user = await requireRole("patient");

  const parsed = NewThreadSchema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Both subject and message are required." };
  }

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
  redirect(`/portal/messages/${thread.id}`);
}

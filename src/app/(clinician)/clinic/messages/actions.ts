"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import type { ReplyResult } from "@/components/messaging/ReplyForm";
import type { NewThreadResult } from "@/components/messaging/NewThreadForm";

const ReplySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().trim().min(1).max(5000),
});

export async function sendClinicianReplyAction(
  threadId: string,
  _prev: ReplyResult | null,
  formData: FormData,
): Promise<ReplyResult> {
  const user = await requireUser();
  if (!user.organizationId) return { ok: false, error: "No organization." };

  const parsed = ReplySchema.safeParse({
    threadId,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please write a message." };
  }

  // Verify the thread is for a patient in this clinician's org.
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, patient: { organizationId: user.organizationId } },
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

  revalidatePath("/clinic/messages");
  revalidatePath(`/clinic/messages/${thread.id}`);
  return { ok: true };
}

const NewThreadSchema = z.object({
  patientId: z.string().min(1),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export async function createClinicianThreadAction(
  _prev: NewThreadResult | null,
  formData: FormData,
): Promise<NewThreadResult> {
  const user = await requireUser();
  if (!user.organizationId) return { ok: false, error: "No organization." };

  const parsed = NewThreadSchema.safeParse({
    patientId: formData.get("patientId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Subject and message are both required." };
  }

  // Verify the patient belongs to this clinician's org.
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

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

  revalidatePath("/clinic/messages");
  revalidatePath(`/clinic/patients/${patient.id}`);
  redirect(`/clinic/messages/${thread.id}`);
}

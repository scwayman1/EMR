"use server";

// EMR-033 — Provider-to-Provider secure portal server actions.
//
// All bodies are persisted as ciphertext via `message-crypto`; the
// page never sees the raw envelope. Org-scoping is enforced on every
// call so a clinician can never reach another tenant's threads.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { encryptMessageBody } from "@/lib/communications/message-crypto";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ---------- Create thread ----------

const createThreadSchema = z.object({
  subject: z.string().min(1).max(200),
  recipientUserIds: z.array(z.string().min(1)).min(1).max(20),
  patientId: z.string().optional().nullable(),
  initialBody: z.string().min(1).max(5000),
});

export async function createProviderThread(formData: FormData): Promise<
  ActionResult<{ threadId: string }>
> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No organization context." };
  }
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Only providers can use this portal." };
  }

  const recipientIds = (formData.getAll("recipientUserIds") as string[]).filter(
    Boolean,
  );
  const parsed = createThreadSchema.safeParse({
    subject: (formData.get("subject") as string)?.trim(),
    recipientUserIds: recipientIds,
    patientId: (formData.get("patientId") as string) || null,
    initialBody: (formData.get("initialBody") as string)?.trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please complete every field." };
  }

  // Verify every recipient is a provider in this same organization.
  const validProviders = await prisma.provider.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      userId: { in: parsed.data.recipientUserIds },
    },
    select: { userId: true },
  });
  if (validProviders.length !== parsed.data.recipientUserIds.length) {
    return {
      ok: false,
      error: "One or more recipients aren't providers in your organization.",
    };
  }

  // Optional patient must also be in the same org.
  if (parsed.data.patientId) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: parsed.data.patientId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!patient) {
      return { ok: false, error: "Patient not found in your organization." };
    }
  }

  const cipher = encryptMessageBody(parsed.data.initialBody);
  const participantIds = Array.from(
    new Set([user.id, ...parsed.data.recipientUserIds]),
  );

  const thread = await prisma.providerMessageThread.create({
    data: {
      organizationId: user.organizationId,
      subject: parsed.data.subject,
      patientId: parsed.data.patientId ?? null,
      createdById: user.id,
      lastMessageAt: new Date(),
      participants: {
        create: participantIds.map((userId) => ({
          userId,
          lastReadAt: userId === user.id ? new Date() : null,
        })),
      },
      messages: {
        create: {
          senderUserId: user.id,
          bodyCipher: cipher,
          bodyLength: parsed.data.initialBody.length,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath("/clinic/providers/messages");
  return { ok: true, data: { threadId: thread.id } };
}

// ---------- Send reply ----------

const replySchema = z.object({
  threadId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export async function sendProviderReply(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No organization context." };
  }

  const parsed = replySchema.safeParse({
    threadId: formData.get("threadId") as string,
    body: (formData.get("body") as string)?.trim(),
  });
  if (!parsed.success) return { ok: false, error: "Please enter a message." };

  // Confirm sender is a participant in a thread that belongs to their org.
  const participation = await prisma.providerThreadParticipant.findUnique({
    where: {
      threadId_userId: { threadId: parsed.data.threadId, userId: user.id },
    },
    include: {
      thread: { select: { organizationId: true } },
    },
  });
  if (
    !participation ||
    participation.thread.organizationId !== user.organizationId
  ) {
    return { ok: false, error: "Conversation not found." };
  }

  const now = new Date();
  const cipher = encryptMessageBody(parsed.data.body);

  await prisma.$transaction([
    prisma.providerMessage.create({
      data: {
        threadId: parsed.data.threadId,
        senderUserId: user.id,
        bodyCipher: cipher,
        bodyLength: parsed.data.body.length,
      },
    }),
    prisma.providerMessageThread.update({
      where: { id: parsed.data.threadId },
      data: { lastMessageAt: now },
    }),
    prisma.providerThreadParticipant.update({
      where: {
        threadId_userId: { threadId: parsed.data.threadId, userId: user.id },
      },
      data: { lastReadAt: now },
    }),
  ]);

  revalidatePath("/clinic/providers/messages");
  return { ok: true, data: undefined };
}

// ---------- Mark thread read ----------

export async function markProviderThreadRead(threadId: string): Promise<void> {
  const user = await requireUser();
  if (!user.organizationId) return;

  const participation = await prisma.providerThreadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId: user.id } },
    include: { thread: { select: { organizationId: true } } },
  });
  if (
    !participation ||
    participation.thread.organizationId !== user.organizationId
  ) {
    return;
  }
  await prisma.providerThreadParticipant.update({
    where: { threadId_userId: { threadId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });
}

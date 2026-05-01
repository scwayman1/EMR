// EMR-034 / EMR-037 — server actions + helpers for call logging.
//
// In production this module would dispatch the call via Twilio /
// WebRTC; in dev it just records the CallLog entry and returns the
// session id so the UI can render an in-progress call card. The same
// flow drives both the patient inbox and the provider portal.

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { redactToPertinentSummary } from "./transcription";
import type { CallStatus, CommChannel } from "@prisma/client";

const launchSchema = z.object({
  channel: z.enum(["phone", "video"]),
  // Exactly one of these must be supplied.
  patientId: z.string().optional().nullable(),
  providerUserId: z.string().optional().nullable(),
  externalNumber: z.string().optional().nullable(),
  messageThreadId: z.string().optional().nullable(),
  providerMessageThreadId: z.string().optional().nullable(),
});

export type LaunchCallResult =
  | { ok: true; callId: string }
  | { ok: false; error: string };

export async function launchCallAction(
  formData: FormData,
): Promise<LaunchCallResult> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No organization context." };
  }
  const parsed = launchSchema.safeParse({
    channel: formData.get("channel") as CommChannel,
    patientId: (formData.get("patientId") as string) || null,
    providerUserId: (formData.get("providerUserId") as string) || null,
    externalNumber: (formData.get("externalNumber") as string) || null,
    messageThreadId: (formData.get("messageThreadId") as string) || null,
    providerMessageThreadId:
      (formData.get("providerMessageThreadId") as string) || null,
  });
  if (!parsed.success) return { ok: false, error: "Invalid call request." };

  const targets = [
    parsed.data.patientId,
    parsed.data.providerUserId,
    parsed.data.externalNumber,
  ].filter(Boolean);
  if (targets.length !== 1) {
    return {
      ok: false,
      error: "Specify exactly one target (patient, provider, or number).",
    };
  }

  // Same-org enforcement for patient + provider targets.
  if (parsed.data.patientId) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: parsed.data.patientId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (!patient) return { ok: false, error: "Patient not in your org." };
  }
  if (parsed.data.providerUserId) {
    const provider = await prisma.provider.findFirst({
      where: {
        organizationId: user.organizationId,
        userId: parsed.data.providerUserId,
      },
      select: { id: true },
    });
    if (!provider) return { ok: false, error: "Provider not in your org." };
  }

  // Same-org enforcement for thread linkage (prevent cross-tenant FK injection).
  let safeMessageThreadId: string | null = null;
  if (parsed.data.messageThreadId) {
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: parsed.data.messageThreadId,
        patient: { organizationId: user.organizationId },
      },
      select: { id: true },
    });
    if (thread) safeMessageThreadId = thread.id;
  }
  let safeProviderMessageThreadId: string | null = null;
  if (parsed.data.providerMessageThreadId) {
    const pThread = await prisma.providerMessageThread.findFirst({
      where: {
        id: parsed.data.providerMessageThreadId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (pThread) safeProviderMessageThreadId = pThread.id;
  }

  const call = await prisma.callLog.create({
    data: {
      organizationId: user.organizationId,
      channel: parsed.data.channel,
      direction: "outbound",
      status: "in_progress",
      initiatorUserId: user.id,
      patientId: parsed.data.patientId ?? null,
      providerUserId: parsed.data.providerUserId ?? null,
      externalNumber: parsed.data.externalNumber ?? null,
      messageThreadId: safeMessageThreadId,
      providerMessageThreadId: safeProviderMessageThreadId,
      // In real life this would be the Twilio room/conference SID.
      externalSessionId: `dev-session-${Date.now()}`,
    },
    select: { id: true },
  });

  revalidatePath("/clinic/messages");
  revalidatePath("/clinic/providers/messages");
  revalidatePath("/clinic/communications");
  return { ok: true, callId: call.id };
}

// ---------- End call ----------

const endSchema = z.object({
  callId: z.string().min(1),
  status: z.enum(["completed", "missed", "failed", "cancelled"]),
  durationSeconds: z.coerce.number().int().min(0).max(60 * 60 * 8),
  // Optional raw transcript text — only the redacted summary is persisted.
  rawTranscript: z.string().max(20_000).optional(),
});

export type EndCallResult = { ok: true } | { ok: false; error: string };

export async function endCallAction(
  formData: FormData,
): Promise<EndCallResult> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No organization context." };
  }
  const parsed = endSchema.safeParse({
    callId: formData.get("callId") as string,
    status: formData.get("status") as CallStatus,
    durationSeconds: formData.get("durationSeconds"),
    rawTranscript: (formData.get("rawTranscript") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid call payload." };

  const call = await prisma.callLog.findFirst({
    where: { id: parsed.data.callId, organizationId: user.organizationId },
    select: { id: true, channel: true, organizationId: true },
  });
  if (!call) return { ok: false, error: "Call not found." };

  await prisma.callLog.update({
    where: { id: call.id },
    data: {
      status: parsed.data.status,
      endedAt: new Date(),
      durationSeconds: parsed.data.durationSeconds,
    },
  });

  // EMR-037 / EMR-146 — only persist the redacted summary, not raw PHI.
  if (
    parsed.data.rawTranscript &&
    parsed.data.status === "completed" &&
    parsed.data.rawTranscript.trim().length > 0
  ) {
    const { pertinentSummary, clinicalBullets, redactedCategories } =
      redactToPertinentSummary(parsed.data.rawTranscript);
    await prisma.callTranscript.create({
      data: {
        callLogId: call.id,
        organizationId: call.organizationId,
        pertinentSummary,
        clinicalBullets,
        redactedCategories,
      },
    });
  }

  revalidatePath("/clinic/messages");
  revalidatePath("/clinic/providers/messages");
  revalidatePath("/clinic/communications");
  revalidatePath("/clinic/communications/transcripts");
  return { ok: true };
}

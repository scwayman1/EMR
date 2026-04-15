"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  recordFeedback,
  computeEditDelta,
} from "@/lib/agents/memory/agent-feedback";

/**
 * Parse a `senderAgent` field like "correspondenceNurse:1.0.0" into its
 * component parts. Returns null if the field is missing or unparseable, in
 * which case the caller should skip writing feedback — we'd rather drop a
 * feedback row than attribute it to the wrong agent.
 */
function parseSenderAgent(
  senderAgent: string | null | undefined,
): { agentName: string; agentVersion?: string } | null {
  if (!senderAgent) return null;
  const [agentName, agentVersion] = senderAgent.split(":");
  if (!agentName) return null;
  return { agentName, agentVersion: agentVersion || undefined };
}

/**
 * Server actions for the clinician Approvals inbox.
 *
 * Every approval-gated agent output that lands in this inbox ultimately goes
 * through one of these actions. The current pass focuses on message drafts
 * (Nurse Nora), but the pattern generalizes: approve / edit-and-approve /
 * reject, each with a concrete side effect.
 *
 * Constitutional note: per Article V §3, when a clinician overrides an
 * agent (by editing or rejecting) the override is recorded permanently.
 * The `editReason` free text parameter exists for that reason.
 */

export type ApprovalResult = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Approve a message draft — sends it AS IS. No edits.
// ---------------------------------------------------------------------------

const approveDraftSchema = z.object({
  messageId: z.string().min(1),
});

export async function approveMessageDraft(
  _prev: ApprovalResult | null,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  const parsed = approveDraftSchema.safeParse({
    messageId: formData.get("messageId") as string,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  // Verify the draft belongs to this organization
  const draft = await prisma.message.findFirst({
    where: {
      id: parsed.data.messageId,
      status: "draft",
      thread: { patient: { organizationId: user.organizationId! } },
    },
    include: { thread: true },
  });
  if (!draft) return { ok: false, error: "Draft not found or already sent." };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.update({
      where: { id: draft.id },
      data: {
        status: "sent",
        sentAt: now,
        // Attribute to the approving clinician; agent authorship is preserved
        // via the existing `senderAgent` + `aiDrafted` fields on the row.
        senderUserId: user.id,
      },
    }),
    prisma.messageThread.update({
      where: { id: draft.threadId },
      data: { lastMessageAt: now },
    }),
  ]);

  // Learning loop: record the clean approval. Best-effort — never block.
  try {
    const agent = parseSenderAgent(draft.senderAgent);
    if (agent) {
      await recordFeedback({
        agentName: agent.agentName,
        agentVersion: agent.agentVersion,
        organizationId: user.organizationId ?? null,
        messageId: draft.id,
        action: "approved",
        reviewerId: user.id,
      });
    }
  } catch (err) {
    console.warn("[approvals] recordFeedback(approved) failed", err);
  }

  revalidatePath("/clinic/approvals");
  revalidatePath(`/clinic/patients/${draft.thread.patientId}`);
  revalidatePath("/clinic/messages");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Edit-and-approve — clinician tweaked the draft, then sent it.
// ---------------------------------------------------------------------------

const editApproveSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export async function editAndApproveMessageDraft(
  _prev: ApprovalResult | null,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  const parsed = editApproveSchema.safeParse({
    messageId: formData.get("messageId") as string,
    body: (formData.get("body") as string)?.trim(),
  });
  if (!parsed.success)
    return { ok: false, error: "Please provide a message body." };

  const draft = await prisma.message.findFirst({
    where: {
      id: parsed.data.messageId,
      status: "draft",
      thread: { patient: { organizationId: user.organizationId! } },
    },
    include: { thread: true },
  });
  if (!draft) return { ok: false, error: "Draft not found or already sent." };

  // Capture original body BEFORE the update — we need it to compute the
  // edit delta for the learning loop after the transaction commits.
  const originalBody = draft.body;

  const now = new Date();
  await prisma.$transaction([
    prisma.message.update({
      where: { id: draft.id },
      data: {
        body: parsed.data.body,
        status: "sent",
        sentAt: now,
        senderUserId: user.id,
      },
    }),
    prisma.messageThread.update({
      where: { id: draft.threadId },
      data: { lastMessageAt: now },
    }),
  ]);

  // Learning loop: record the edit-then-approve with a diff. Best-effort.
  try {
    const agent = parseSenderAgent(draft.senderAgent);
    if (agent) {
      await recordFeedback({
        agentName: agent.agentName,
        agentVersion: agent.agentVersion,
        organizationId: user.organizationId ?? null,
        messageId: draft.id,
        action: "approved_with_edits",
        reviewerId: user.id,
        editDelta: computeEditDelta(originalBody, parsed.data.body),
      });
    }
  } catch (err) {
    console.warn(
      "[approvals] recordFeedback(approved_with_edits) failed",
      err,
    );
  }

  revalidatePath("/clinic/approvals");
  revalidatePath(`/clinic/patients/${draft.thread.patientId}`);
  revalidatePath("/clinic/messages");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reject a draft — discards it. The thread stays, the draft disappears.
// ---------------------------------------------------------------------------

const rejectDraftSchema = z.object({
  messageId: z.string().min(1),
});

export async function rejectMessageDraft(
  _prev: ApprovalResult | null,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  const parsed = rejectDraftSchema.safeParse({
    messageId: formData.get("messageId") as string,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const draft = await prisma.message.findFirst({
    where: {
      id: parsed.data.messageId,
      status: "draft",
      thread: { patient: { organizationId: user.organizationId! } },
    },
    include: { thread: true },
  });
  if (!draft) return { ok: false, error: "Draft not found or already sent." };

  await prisma.message.delete({ where: { id: draft.id } });

  // Learning loop: record the rejection. Best-effort — a failure here must
  // not prevent the discard from being reported as successful to the UI.
  // Note: messageId is intentionally NOT passed here because the row has
  // just been deleted; the FK would dangle. We keep the agent attribution
  // (agentName/version) so the rejection still counts against the agent.
  try {
    const agent = parseSenderAgent(draft.senderAgent);
    if (agent) {
      await recordFeedback({
        agentName: agent.agentName,
        agentVersion: agent.agentVersion,
        organizationId: user.organizationId ?? null,
        action: "rejected",
        reviewerId: user.id,
      });
    }
  } catch (err) {
    console.warn("[approvals] recordFeedback(rejected) failed", err);
  }

  revalidatePath("/clinic/approvals");
  revalidatePath(`/clinic/patients/${draft.thread.patientId}`);
  revalidatePath("/clinic/messages");
  return { ok: true };
}

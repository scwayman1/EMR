"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { summarizeLabResult } from "@/lib/agents/lab-summarizer-agent";
import { prisma } from "@/lib/db/prisma";

// MALLIK-006 — Lab Review server actions

export type LabDraftsResult =
  | {
      ok: true;
      outreachId: string;
      patientDraft: string;
      maDraft: string;
      physicianNote: string;
    }
  | { ok: false; error: string };

/**
 * "Looks good" — generate AI-drafted outreach text for a reviewed lab.
 * The clinician sees the three drafts in the overlay, edits if needed,
 * then approves (signs) in a separate action.
 */
export async function draftLabOutreachAction(
  labResultId: string
): Promise<LabDraftsResult> {
  const user = await requireUser();

  // Authorize — the lab must belong to the clinician's org.
  const lab = await prisma.labResult.findUnique({
    where: { id: labResultId },
    select: { organizationId: true, signedAt: true, abnormalFlag: true },
  });
  if (!lab) return { ok: false, error: "Lab not found." };
  if (lab.organizationId !== user.organizationId) {
    return { ok: false, error: "Forbidden." };
  }
  if (lab.signedAt) {
    return { ok: false, error: "This lab is already signed." };
  }

  try {
    const drafts = await summarizeLabResult(labResultId);
    revalidatePath("/clinic/labs-review");
    return { ok: true, ...drafts };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to draft outreach. Please try again.",
    };
  }
}

/**
 * Save edits the clinician made to any of the three drafts. Called on blur
 * so the overlay always has the latest text even if the clinician closes it
 * without signing.
 */
export async function updateLabOutreachAction(
  outreachId: string,
  patch: { patientDraft?: string; maDraft?: string; physicianNote?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const out = await prisma.labOutreach.findUnique({
    where: { id: outreachId },
    include: { labResult: { select: { organizationId: true } } },
  });
  if (!out) return { ok: false, error: "Outreach not found." };
  if (out.labResult.organizationId !== user.organizationId) {
    return { ok: false, error: "Forbidden." };
  }
  await prisma.labOutreach.update({
    where: { id: outreachId },
    data: {
      ...(patch.patientDraft !== undefined ? { patientDraft: patch.patientDraft } : {}),
      ...(patch.maDraft !== undefined ? { maDraft: patch.maDraft } : {}),
      ...(patch.physicianNote !== undefined ? { physicianNote: patch.physicianNote } : {}),
    },
  });
  return { ok: true };
}

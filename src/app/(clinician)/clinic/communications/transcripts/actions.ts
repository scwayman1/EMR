"use server";

// EMR-146 — clinician review of AI call transcripts.
//
// A transcript lands in `pending_review` after the AI redaction pass.
// A clinician then approves (and optionally attaches to an encounter)
// or rejects (drops it from the chart entirely). All transitions are
// scoped to the caller's organization.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

const reviewSchema = z.object({
  transcriptId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  reviewerNote: z.string().max(1000).optional(),
  attachToEncounterId: z.string().optional().nullable(),
});

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function reviewTranscriptAction(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No organization context." };
  }
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Only providers can review transcripts." };
  }

  const parsed = reviewSchema.safeParse({
    transcriptId: formData.get("transcriptId"),
    decision: formData.get("decision"),
    reviewerNote: (formData.get("reviewerNote") as string) || undefined,
    attachToEncounterId:
      (formData.get("attachToEncounterId") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Invalid review submission." };
  }

  const transcript = await prisma.callTranscript.findFirst({
    where: {
      id: parsed.data.transcriptId,
      organizationId: user.organizationId,
      status: "pending_review",
    },
    select: { id: true },
  });
  if (!transcript) {
    return { ok: false, error: "Transcript not found or already reviewed." };
  }

  await prisma.callTranscript.update({
    where: { id: transcript.id },
    data: {
      status: parsed.data.decision === "approve" ? "approved" : "rejected",
      reviewedByUserId: user.id,
      reviewedAt: new Date(),
      reviewerNote: parsed.data.reviewerNote ?? null,
      attachedToEncounterId:
        parsed.data.decision === "approve"
          ? parsed.data.attachToEncounterId ?? null
          : null,
    },
  });

  revalidatePath("/clinic/communications");
  revalidatePath("/clinic/communications/transcripts");
  return { ok: true };
}

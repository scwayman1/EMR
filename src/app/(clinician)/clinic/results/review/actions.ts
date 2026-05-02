"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  buildPatientNotification,
  buildSignoffAuditPayload,
  SignoffInputSchema,
  validateSignoff,
  type SignoffQueueItem,
} from "@/lib/clinical/result-signoff";

export type SignResultActionResult =
  | { ok: true; signedAt: string }
  | { ok: false; error: string };

export async function signResultAction(
  raw: unknown,
): Promise<SignResultActionResult> {
  const user = await requireUser();
  const parsed = SignoffInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const input = parsed.data;

  const lab = await prisma.labResult.findUnique({
    where: { id: input.resultId },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!lab) {
    return { ok: false, error: "Result not found." };
  }

  const validation = validateSignoff(input, {
    resultId: lab.id,
    patientId: lab.patientId,
    organizationId: lab.organizationId,
    abnormalFlag: lab.abnormalFlag,
    alreadySigned: lab.signedAt !== null,
    clinicianOrgId: user.organizationId ?? "__none__",
  });
  if (!validation.ok) {
    return { ok: false, error: validation.errors.join(" ") };
  }

  const queueItem: SignoffQueueItem = {
    id: lab.id,
    kind: "lab",
    patientId: lab.patientId,
    patientName: `${lab.patient.firstName} ${lab.patient.lastName}`,
    panelName: lab.panelName,
    receivedAt: lab.receivedAt,
    abnormalFlag: lab.abnormalFlag,
    signedAt: lab.signedAt,
    aiSummary: null,
  };

  const signedAt = new Date();
  const audit = buildSignoffAuditPayload({ input, item: queueItem, signedAt });
  const notification = buildPatientNotification(queueItem, input);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.labResult.update({
        where: { id: lab.id },
        data: {
          signedAt,
          signedById: user.id,
          reviewOutcome: input.outcome,
        },
      });

      if (notification) {
        const thread = await tx.messageThread.create({
          data: {
            patientId: lab.patientId,
            subject: notification.subject,
            triageCategory: "result_review",
          },
        });
        await tx.message.create({
          data: {
            threadId: thread.id,
            senderUserId: user.id,
            status: "sent",
            body: notification.body,
            aiDrafted: false,
            sentAt: signedAt,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: lab.organizationId,
          actorUserId: user.id,
          action: "result.signed",
          subjectType: "LabResult",
          subjectId: lab.id,
          metadata: audit as unknown as object,
        },
      });
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to sign result.",
    };
  }

  revalidatePath("/clinic/results/review");
  revalidatePath(`/clinic/patients/${lab.patientId}`);
  return { ok: true, signedAt: signedAt.toISOString() };
}

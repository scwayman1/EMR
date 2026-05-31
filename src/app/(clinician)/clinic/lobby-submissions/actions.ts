"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { assertChartAccess, requirePermission } from "@/lib/rbac/permissions";
import { dispatch } from "@/lib/orchestration/dispatch";
import { logger } from "@/lib/observability/log";
import {
  parseIntakePayload,
  parseConsentPayload,
  patientUpdateFromIntake,
} from "@/lib/check-in/lobby-submission-review";

// Staff review of staged kiosk-lobby submissions (EMR-915). This is the loop
// closer: patient-entered intake/consent sits as `pending` until a staff member
// with chart access ACCEPTS it into the record (or rejects it). Nothing the
// patient submitted touches the chart without this human step.

export interface PendingSubmission {
  id: string;
  patientId: string;
  patientName: string;
  kind: string;
  createdAt: string;
}

/** Org-scoped list of pending submissions for the review queue. */
export async function listPendingLobbySubmissions(): Promise<PendingSubmission[]> {
  const user = await requireUser();
  requirePermission(user, "patient.demographics.edit");
  const orgId = user.organizationId;
  if (!orgId) return [];

  const rows = await prisma.kioskLobbySubmission.findMany({
    where: { organizationId: orgId, status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  if (rows.length === 0) return [];

  const patients = await prisma.patient.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.patientId))] }, organizationId: orgId },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]));

  return rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    patientName: nameById.get(r.patientId) ?? "Unknown patient",
    kind: r.kind,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Accept a staged submission into the chart. Gated by chart access +
 * demographics.edit. Atomic: claims the pending row and performs the chart
 * write in one transaction, so a double-click or race can't double-apply.
 */
export async function acceptLobbySubmission(submissionId: string): Promise<ReviewResult> {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) return { ok: false, error: "No organization in session." };

  const sub = await prisma.kioskLobbySubmission.findFirst({
    where: { id: submissionId, organizationId: orgId, status: "pending" },
  });
  if (!sub) return { ok: false, error: "This submission was already reviewed." };

  // Chart-access + permission gate, scoped to the submission's patient.
  await assertChartAccess(user, sub.patientId);
  requirePermission(user, "patient.demographics.edit");

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the row first; if we don't win, abort the whole transaction.
      const claimed = await tx.kioskLobbySubmission.updateMany({
        where: { id: sub.id, status: "pending" },
        data: { status: "accepted", reviewedByUserId: user.id, reviewedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("ALREADY_REVIEWED");

      if (sub.kind === "intake") {
        const payload = parseIntakePayload(sub.payload);
        if (!payload) throw new Error("BAD_PAYLOAD");
        const update = patientUpdateFromIntake(payload);
        if (Object.keys(update).length > 0) {
          await tx.patient.update({
            where: { id: sub.patientId },
            data: update as Prisma.PatientUpdateInput,
          });
        }
      } else if (sub.kind === "consent") {
        const payload = parseConsentPayload(sub.payload);
        if (!payload) throw new Error("BAD_PAYLOAD");
        await tx.signedConsent.create({
          data: {
            patientId: sub.patientId,
            templateId: payload.templateId,
            templateName: payload.templateName,
            version: payload.version,
            responses: payload.responses as Prisma.InputJsonValue,
            signatureData: payload.signatureData ?? null,
          },
        });
      } else {
        throw new Error("UNKNOWN_KIND");
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "ALREADY_REVIEWED") return { ok: false, error: "This submission was already reviewed." };
    if (msg === "BAD_PAYLOAD") return { ok: false, error: "This submission couldn't be read. Please reject it." };
    logger.error({ event: "kiosk.lobby.submission.accept_failed", submissionId });
    return { ok: false, error: "Couldn't accept this submission. Please try again." };
  }

  // Intake changes feed the chart-summary regeneration, same as portal intake.
  if (sub.kind === "intake") {
    await dispatch({ name: "patient.intake.updated", patientId: sub.patientId, organizationId: orgId });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      actorUserId: user.id,
      action: "kiosk.lobby.submission.accepted",
      subjectType: "Patient",
      subjectId: sub.patientId,
      metadata: { kind: sub.kind, submissionId: sub.id },
    },
  });

  revalidatePath("/clinic/lobby-submissions");
  return { ok: true };
}

/** Reject a staged submission (it never touches the chart). Audited. */
export async function rejectLobbySubmission(
  submissionId: string,
  reason?: string,
): Promise<ReviewResult> {
  const user = await requireUser();
  const orgId = user.organizationId;
  if (!orgId) return { ok: false, error: "No organization in session." };

  const sub = await prisma.kioskLobbySubmission.findFirst({
    where: { id: submissionId, organizationId: orgId, status: "pending" },
    select: { id: true, patientId: true, kind: true },
  });
  if (!sub) return { ok: false, error: "This submission was already reviewed." };

  await assertChartAccess(user, sub.patientId);
  requirePermission(user, "patient.demographics.edit");

  const claimed = await prisma.kioskLobbySubmission.updateMany({
    where: { id: sub.id, status: "pending" },
    data: { status: "rejected", reviewedByUserId: user.id, reviewedAt: new Date() },
  });
  if (claimed.count === 0) return { ok: false, error: "This submission was already reviewed." };

  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      actorUserId: user.id,
      action: "kiosk.lobby.submission.rejected",
      subjectType: "Patient",
      subjectId: sub.patientId,
      metadata: reason ? { kind: sub.kind, submissionId: sub.id, reason } : { kind: sub.kind, submissionId: sub.id },
    },
  });

  revalidatePath("/clinic/lobby-submissions");
  return { ok: true };
}

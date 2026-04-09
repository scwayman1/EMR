"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";

export type UploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function uploadDocumentAction(
  _prev: UploadResult | null,
  formData: FormData,
): Promise<UploadResult> {
  const user = await requireRole("patient");

  const originalName = formData.get("originalName") as string | null;
  const mimeType = formData.get("mimeType") as string | null;
  const sizeBytes = Number(formData.get("sizeBytes"));

  if (!originalName || !mimeType || !sizeBytes || isNaN(sizeBytes)) {
    return { ok: false, error: "Missing file information." };
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const storageKey = `demo/${patient.id}/${Date.now()}-${originalName}`;

  const document = await prisma.document.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      uploadedById: user.id,
      originalName,
      mimeType,
      sizeBytes,
      storageKey,
      kind: "unclassified",
    },
  });

  // Fire a domain event so the Document Organizer Agent classifies it.
  await dispatch({
    name: "document.uploaded",
    documentId: document.id,
    patientId: patient.id,
    organizationId: patient.organizationId,
  });

  // In dev mode, run the tick inline so classification happens immediately.
  if (process.env.NODE_ENV === "development") {
    try {
      await runTick("dev-inline", 1);
    } catch {
      // Non-fatal: the agent may not be fully wired yet in dev.
    }
  }

  revalidatePath("/portal/records");

  return { ok: true, documentId: document.id };
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteDocumentAction(
  documentId: string,
): Promise<DeleteResult> {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      patientId: patient.id,
      deletedAt: null,
    },
  });

  if (!document) return { ok: false, error: "Document not found." };

  // Soft delete
  await prisma.document.update({
    where: { id: document.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/portal/records");

  return { ok: true };
}

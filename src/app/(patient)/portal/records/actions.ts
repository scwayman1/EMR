"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";
import { uploadDocument, storageIsConfigured } from "@/lib/storage/documents";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  inferKind,
} from "@/lib/storage/document-types";

export type UploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function uploadDocumentAction(
  _prev: UploadResult | null,
  formData: FormData,
): Promise<UploadResult> {
  const user = await requireRole("patient");

  if (!storageIsConfigured()) {
    return {
      ok: false,
      error: "Document storage is not configured. Ask an admin to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File is over the 25 MB limit." };
  }
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  const storageKey = await uploadDocument({
    organizationId: patient.organizationId,
    patientId: patient.id,
    filename: file.name,
    contentType: mimeType,
    body: buffer,
  });

  const document = await prisma.document.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      uploadedById: user.id,
      originalName: file.name.slice(0, 200),
      mimeType,
      sizeBytes: file.size,
      storageKey,
      kind: inferKind(mimeType),
    },
  });

  await dispatch({
    name: "document.uploaded",
    documentId: document.id,
    patientId: patient.id,
    organizationId: patient.organizationId,
  });

  if (process.env.NODE_ENV === "development") {
    try {
      await runTick("dev-inline", 1);
    } catch {
      // Non-fatal
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

  await prisma.document.update({
    where: { id: document.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/portal/records");
  return { ok: true };
}

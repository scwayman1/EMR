"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { uploadDocument, storageIsConfigured } from "@/lib/storage/documents";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  inferKind,
} from "@/lib/storage/document-types";
import type { UploadResult } from "@/components/records/UploadForm";

/**
 * Patient self-upload: always attaches to the logged-in patient's
 * own record. Non-patient users cannot call this action \u2014 the role
 * guard runs first.
 */
export async function uploadPatientDocumentAction(
  formData: FormData,
): Promise<UploadResult> {
  const user = await requireRole("patient");

  if (!storageIsConfigured()) {
    return {
      ok: false,
      error:
        "Document storage is not configured on this environment. Ask an admin to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient) return { ok: false, error: "No patient profile." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "File is over the 25 MB limit." };
  }
  // Empty or generic types slip through some browsers; accept those
  // and rely on the extension + server-side rendering behavior.
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }

  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  const storageKey = await uploadDocument({
    organizationId: patient.organizationId,
    patientId: patient.id,
    filename: file.name,
    contentType: mimeType,
    body: buffer,
  });

  await prisma.document.create({
    data: {
      organizationId: patient.organizationId,
      patientId: patient.id,
      uploadedById: user.id,
      kind: inferKind(mimeType),
      originalName: file.name.slice(0, 200),
      mimeType,
      sizeBytes: file.size,
      storageKey,
    },
  });

  revalidatePath("/portal/records");
  return { ok: true };
}

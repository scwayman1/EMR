"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { uploadDocument, storageIsConfigured } from "@/lib/storage/documents";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  inferKind,
} from "@/lib/storage/document-types";
import type { UploadResult } from "@/components/records/UploadForm";

/**
 * Clinician-side upload: attaches a document to any patient within
 * the clinician's organization. The target patient id rides in the
 * form data; we re-verify org ownership before writing.
 */
export async function uploadClinicianDocumentAction(
  formData: FormData,
): Promise<UploadResult> {
  const user = await requireUser();
  if (!user.organizationId) return { ok: false, error: "No organization." };

  if (!storageIsConfigured()) {
    return {
      ok: false,
      error:
        "Document storage is not configured on this environment. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const patientId = formData.get("patientId");
  if (typeof patientId !== "string" || patientId.length === 0) {
    return { ok: false, error: "Missing patient." };
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId },
    select: { id: true, organizationId: true },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

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

  revalidatePath(`/clinic/patients/${patient.id}`);
  return { ok: true };
}

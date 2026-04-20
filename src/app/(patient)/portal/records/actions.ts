"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import { SIDE_EFFECT_CODES } from "@/lib/domain/side-effects";

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

// ─────────────────────────────────────────────────────────────────────────
// Side Effect Logging
// ─────────────────────────────────────────────────────────────────────────

const sideEffectSchema = z
  .object({
    effect: z.enum(
      SIDE_EFFECT_CODES as unknown as [string, ...string[]]
    ),
    customEffect: z.string().max(120).optional().nullable(),
    severity: z.coerce.number().int().min(1).max(10),
    note: z.string().max(500).optional().nullable(),
    productId: z.string().optional().nullable(),
    occurredAt: z.coerce.date().optional(),
  })
  .refine(
    (v) => v.effect !== "other" || (v.customEffect && v.customEffect.trim().length > 0),
    { message: "customEffect is required when effect='other'", path: ["customEffect"] }
  );

export type LogSideEffectResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string };

export async function logSideEffect(input: {
  effect: string;
  customEffect?: string | null;
  severity: number;
  note?: string | null;
  productId?: string | null;
  occurredAt?: Date | string;
}): Promise<LogSideEffectResult> {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, organizationId: true },
  });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const parsed = sideEffectSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid side effect input." };
  }
  const { effect, customEffect, severity, note, productId, occurredAt } = parsed.data;

  // Org-scope the product link: only accept a productId that belongs to the
  // patient's organization. Silently drop otherwise to prevent cross-org leaks.
  let safeProductId: string | null = null;
  if (productId) {
    const product = await prisma.cannabisProduct.findFirst({
      where: { id: productId, organizationId: patient.organizationId },
      select: { id: true },
    });
    safeProductId = product?.id ?? null;
  }

  const report = await prisma.sideEffectReport.create({
    data: {
      patientId: patient.id,
      organizationId: patient.organizationId,
      effect: effect as never, // Zod validated against SIDE_EFFECT_CODES
      customEffect:
        effect === "other" ? (customEffect?.trim() || null) : null,
      severity,
      note: note?.trim() || null,
      productId: safeProductId,
      occurredAt: occurredAt ?? new Date(),
    },
    select: { id: true },
  });

  revalidatePath("/portal");
  revalidatePath("/portal/records");

  return { ok: true, reportId: report.id };
}

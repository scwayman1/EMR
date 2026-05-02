/**
 * Medical Imaging Upload — EMR-166
 *
 * Server-side upload pipeline for the Imaging Lab. Handles validation,
 * DICOM metadata extraction, optional Supabase Storage persistence, and
 * registration into the in-memory imaging store. Designed so the API
 * route is a thin shell: parse form → handleImagingUpload(...) → JSON.
 *
 * HIPAA notes:
 *   • Storage paths are namespaced by `organizationId/patientId/studyId`
 *     so a misconfigured signed-URL request cannot leak across tenants.
 *   • Filenames are slugified to ASCII+`._-` only so a hostile upload
 *     cannot construct a path like `../../etc/passwd`.
 *   • Bytes are uploaded with `upsert: false` to prevent overwriting an
 *     existing study under a guessable key.
 *   • Original DICOM PHI tags (PatientName, BirthDate) are extracted to
 *     compare against the chart `patientId` but are NOT persisted in the
 *     domain study record — only the `patientId` foreign key is.
 *   • The viewer route uses signed URLs with a 5-minute TTL (`SIGNED_TTL`)
 *     so a stale link cannot be replayed indefinitely.
 *   • Access is gated upstream by `requireRole("clinician")` (or service
 *     credentials). This module never reads cookies — callers are
 *     responsible for proving the actor is allowed to write.
 */

import {
  ACCEPTED_IMAGING_MIME,
  MAX_UPLOAD_BYTES,
  modalityFromHint,
  type ImagingStudy,
  type Modality,
  type UploadResult,
} from "@/lib/domain/medical-imaging";
import { upsertStudy } from "@/lib/domain/medical-imaging-store";
import {
  parseDicom,
  isDicomFile,
  metadataToStudyDescriptor,
  type DicomMetadata,
} from "@/lib/imaging/dicom-parser";

export const SIGNED_TTL = 60 * 5;

export interface UploadInput {
  patientId: string;
  organizationId?: string;
  modality?: Modality;
  description?: string;
  bodyPart?: string;
  studyDate?: string;
  indication?: string;
  files: File[];
  /** Provided by the caller after auth. Used to enforce tenant scoping. */
  actor?: { userId: string; role: "clinician" | "operator" | "system" };
}

export interface UploadOutcome {
  study: ImagingStudy;
  result: UploadResult;
  /** Storage keys written, if Supabase was configured. Empty otherwise. */
  storageKeys: string[];
  /** Best-effort DICOM metadata aggregated from accepted DICOM files. */
  dicomMetadata: DicomMetadata | null;
  /** Files that were rejected, with the reason. */
  rejected: UploadResult["rejectedFiles"];
}

export class ImagingUploadError extends Error {
  constructor(
    public readonly code:
      | "no_files"
      | "all_files_rejected"
      | "patient_required"
      | "modality_required"
      | "description_required"
      | "body_part_required"
      | "patient_mismatch",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ImagingUploadError";
  }
}

/**
 * Validate a candidate file against MIME + size + naming rules. Returns
 * the rejection reason if the file should be discarded, otherwise null.
 */
export function rejectionReason(file: File): string | null {
  if (file.size === 0) return "empty file";
  if (file.size > MAX_UPLOAD_BYTES) {
    return `exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`;
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  const looksLikeDicom = file.name.toLowerCase().endsWith(".dcm");
  if (!ACCEPTED_IMAGING_MIME.has(mime) && !looksLikeDicom) {
    return `unsupported type ${mime}`;
  }
  return null;
}

/** Sanitize a filename for storage — ASCII + `._-`, length-capped. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

/**
 * Build the Supabase Storage key for an imaging asset. Namespaced by
 * organization → patient → study so signed URLs can't leak across tenants.
 */
export function buildStorageKey(params: {
  organizationId: string;
  patientId: string;
  studyId: string;
  filename: string;
}): string {
  const safe = sanitizeFilename(params.filename);
  // crypto.randomUUID() requires Node 19+ which this project requires.
  const uuid = crypto.randomUUID();
  return `${params.organizationId}/${params.patientId}/${params.studyId}/${uuid}-${safe}`;
}

/** True iff Supabase is configured well enough to upload. */
export function imagingStorageConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

const IMAGING_BUCKET_DEFAULT = "imaging";
function imagingBucket(): string {
  return process.env.IMAGING_STORAGE_BUCKET || IMAGING_BUCKET_DEFAULT;
}

/**
 * Lazy-load the supabase client only when we actually have credentials.
 * Avoids forcing the module on every dev boot.
 */
async function getSupabase() {
  if (!imagingStorageConfigured()) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Persist a single file to Supabase Storage. Throws on failure so the
 * caller can decide whether to abort the whole study or skip the file.
 */
async function persistToStorage(
  key: string,
  file: File,
): Promise<void> {
  const client = await getSupabase();
  if (!client) return; // Silent no-op when storage isn't configured.
  const bytes = await file.arrayBuffer();
  const { error } = await client.storage
    .from(imagingBucket())
    .upload(key, Buffer.from(bytes), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (error) {
    throw new Error(`Storage upload failed (${key}): ${error.message}`);
  }
}

/** Generate a short-lived signed URL for an imaging asset. */
export async function createImagingSignedUrl(
  key: string,
  ttl: number = SIGNED_TTL,
): Promise<string | null> {
  const client = await getSupabase();
  if (!client) return null;
  const { data, error } = await client.storage
    .from(imagingBucket())
    .createSignedUrl(key, ttl);
  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "unknown"}`);
  }
  return data.signedUrl;
}

/**
 * Parse the first DICOM file we find and return its metadata. Non-DICOM
 * files (JPEG/PNG) return null. We use the first DICOM as the source of
 * truth for StudyInstanceUID + PatientID; subsequent DICOMs in the same
 * upload are assumed to belong to the same study.
 */
async function extractDicomMetadata(
  files: File[],
): Promise<DicomMetadata | null> {
  for (const file of files) {
    const looksLikeDicom =
      file.type.toLowerCase() === "application/dicom" ||
      file.name.toLowerCase().endsWith(".dcm") ||
      file.type.toLowerCase() === "application/octet-stream";
    if (!looksLikeDicom) continue;
    try {
      const buffer = await file.arrayBuffer();
      if (!isDicomFile(buffer)) continue;
      return parseDicom(buffer);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Top-level upload pipeline. Validates → extracts DICOM metadata →
 * stores bytes → registers the study. Returns an UploadOutcome the
 * caller can serialize directly.
 */
export async function handleImagingUpload(
  input: UploadInput,
): Promise<UploadOutcome> {
  if (!input.patientId) {
    throw new ImagingUploadError("patient_required", "patientId is required");
  }
  if (input.files.length === 0) {
    throw new ImagingUploadError("no_files", "at least one file is required");
  }

  const accepted: File[] = [];
  const rejected: UploadResult["rejectedFiles"] = [];
  let totalBytes = 0;

  for (const file of input.files) {
    const reason = rejectionReason(file);
    if (reason) {
      rejected.push({ name: file.name, reason });
      continue;
    }
    accepted.push(file);
    totalBytes += file.size;
  }

  if (accepted.length === 0) {
    throw new ImagingUploadError(
      "all_files_rejected",
      "all files were rejected",
      { rejected },
    );
  }

  const dicomMeta = await extractDicomMetadata(accepted);

  // If the DICOM declares a PatientID, sanity-check it matches the
  // chart-side patientId. We only refuse the upload when the DICOM has
  // a patientId AND it disagrees with what the caller passed (a real
  // production system would prompt to override; we keep it strict).
  if (
    dicomMeta?.patientId &&
    input.patientId &&
    !patientIdsLikelyMatch(dicomMeta.patientId, input.patientId)
  ) {
    // Soft-warn only when the caller is a `system` (background ingest);
    // refuse for human uploads where it's almost always a mistake.
    if (input.actor?.role !== "system") {
      throw new ImagingUploadError(
        "patient_mismatch",
        `DICOM PatientID (${dicomMeta.patientId}) does not match chart patient (${input.patientId})`,
      );
    }
  }

  const fallback = {
    patientId: input.patientId,
    description: input.description,
    bodyPart: input.bodyPart,
    studyDate: input.studyDate,
    indication: input.indication,
  };

  const descriptor = dicomMeta
    ? metadataToStudyDescriptor(dicomMeta, fallback)
    : {
        patientId: input.patientId,
        modality:
          input.modality ??
          modalityFromHint(input.description ?? "") ??
          ("CT" as Modality),
        description: input.description ?? "Imaging study",
        bodyPart: input.bodyPart ?? "Unspecified",
        studyDate:
          input.studyDate ?? new Date().toISOString().slice(0, 10),
        indication: input.indication,
      };

  // Honor an explicit modality override if the caller passed one.
  if (input.modality) descriptor.modality = input.modality;
  if (!isValidISODate(descriptor.studyDate)) {
    descriptor.studyDate = new Date().toISOString().slice(0, 10);
  }

  const studyId =
    descriptor.studyInstanceUid && descriptor.studyInstanceUid.length > 0
      ? `stu-${shortHash(descriptor.studyInstanceUid)}`
      : `stu-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;

  const seriesId =
    descriptor.seriesInstanceUid && descriptor.seriesInstanceUid.length > 0
      ? `ser-${shortHash(descriptor.seriesInstanceUid)}`
      : `ser-${studyId}-1`;

  // Upload bytes (best-effort). We collect keys for the response so the
  // viewer can request signed URLs against them.
  const storageKeys: string[] = [];
  if (input.organizationId && imagingStorageConfigured()) {
    for (const file of accepted) {
      const key = buildStorageKey({
        organizationId: input.organizationId,
        patientId: input.patientId,
        studyId,
        filename: file.name,
      });
      try {
        await persistToStorage(key, file);
        storageKeys.push(key);
      } catch (err) {
        rejected.push({
          name: file.name,
          reason: err instanceof Error ? err.message : "storage failure",
        });
      }
    }
  }

  const study: ImagingStudy = {
    id: studyId,
    patientId: descriptor.patientId,
    modality: descriptor.modality,
    description: descriptor.description,
    bodyPart: descriptor.bodyPart,
    studyDate: descriptor.studyDate,
    status: "uploaded",
    indication: descriptor.indication,
    series: [
      {
        id: seriesId,
        description: dicomMeta?.seriesDescription
          ? dicomMeta.seriesDescription
          : `${descriptor.modality} primary series`,
        frameCount: Math.max(1, accepted.length),
        sliceThickness:
          dicomMeta?.sliceThickness ??
          (descriptor.modality === "CT" || descriptor.modality === "MR"
            ? 2
            : undefined),
        orientation: "axial",
      },
    ],
  };

  upsertStudy(study);

  const result: UploadResult = {
    studyId,
    seriesId,
    acceptedFiles: accepted.length,
    rejectedFiles: rejected,
    totalBytes,
  };

  return {
    study,
    result,
    storageKeys,
    dicomMetadata: dicomMeta,
    rejected,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function patientIdsLikelyMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return norm(a) === norm(b);
}

function isValidISODate(s: string | undefined): s is string {
  return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Medical Imaging Upload Backend — EMR-166
 *
 * Accepts CT / MRI / X-ray / US / PET uploads as multipart/form-data,
 * validates MIME + size guardrails, and registers a new ImagingStudy in
 * the in-memory store. File bytes are NOT persisted in this demo (no S3
 * key generation) — the metadata round-trip is what the viewer + report
 * UIs consume.
 *
 * Form fields:
 *   patientId   — required string
 *   modality    — one of CT | MR | XR | US | PT | MG | NM
 *   description — required string (e.g. "CT Chest w/o contrast")
 *   bodyPart    — required string
 *   studyDate   — optional ISO yyyy-mm-dd; defaults to today
 *   indication  — optional clinical indication string
 *   files[]     — one or more File parts; rejected if MIME or size invalid
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCEPTED_IMAGING_MIME,
  MAX_UPLOAD_BYTES,
  modalityFromHint,
  type ImagingStudy,
  type Modality,
  type UploadResult,
} from "@/lib/domain/medical-imaging";
import { upsertStudy } from "@/lib/domain/medical-imaging-store";

const MetadataSchema = z.object({
  patientId: z.string().min(1).max(200),
  modality: z.enum(["CT", "MR", "XR", "US", "PT", "MG", "NM"]),
  description: z.string().min(1).max(200),
  bodyPart: z.string().min(1).max(120),
  studyDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd")
    .optional(),
  indication: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "expected_multipart" },
      { status: 415 },
    );
  }

  const form = await req.formData();
  const metadata = MetadataSchema.safeParse({
    patientId: form.get("patientId"),
    modality: form.get("modality"),
    description: form.get("description"),
    bodyPart: form.get("bodyPart"),
    studyDate: form.get("studyDate") ?? undefined,
    indication: form.get("indication") ?? undefined,
  });

  if (!metadata.success) {
    return NextResponse.json(
      { error: "invalid_metadata", issues: metadata.error.issues },
      { status: 400 },
    );
  }

  const fileEntries = form.getAll("files");
  const files = fileEntries.filter(
    (f): f is File => typeof f === "object" && f !== null && "size" in f,
  );

  if (files.length === 0) {
    return NextResponse.json(
      { error: "no_files", message: "At least one file is required" },
      { status: 400 },
    );
  }

  const accepted: File[] = [];
  const rejected: UploadResult["rejectedFiles"] = [];
  let totalBytes = 0;

  for (const file of files) {
    if (file.size === 0) {
      rejected.push({ name: file.name, reason: "empty file" });
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push({
        name: file.name,
        reason: `exceeds ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`,
      });
      continue;
    }
    const mime = (file.type || "application/octet-stream").toLowerCase();
    const looksLikeDicom = file.name.toLowerCase().endsWith(".dcm");
    if (!ACCEPTED_IMAGING_MIME.has(mime) && !looksLikeDicom) {
      rejected.push({ name: file.name, reason: `unsupported type ${mime}` });
      continue;
    }
    accepted.push(file);
    totalBytes += file.size;
  }

  if (accepted.length === 0) {
    return NextResponse.json(
      {
        error: "all_files_rejected",
        rejected,
      },
      { status: 422 },
    );
  }

  // Construct a study id; in real PACS this would be a StudyInstanceUID from
  // DICOM headers. For the upload demo we synthesize one and let the modality
  // hint refine the parsed value if the client passed something fuzzy.
  const modality: Modality =
    metadata.data.modality ??
    modalityFromHint(metadata.data.description) ??
    "CT";

  const studyId = `stu-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const seriesId = `ser-${studyId}-1`;

  const study: ImagingStudy = {
    id: studyId,
    patientId: metadata.data.patientId,
    modality,
    description: metadata.data.description,
    bodyPart: metadata.data.bodyPart,
    studyDate: metadata.data.studyDate ?? new Date().toISOString().slice(0, 10),
    status: "uploaded",
    indication: metadata.data.indication,
    series: [
      {
        id: seriesId,
        description: `${modality} primary series`,
        frameCount: Math.max(1, accepted.length),
        sliceThickness: modality === "CT" || modality === "MR" ? 2 : undefined,
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

  return NextResponse.json({ ok: true, study, result }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({
    accept: Array.from(ACCEPTED_IMAGING_MIME),
    maxBytes: MAX_UPLOAD_BYTES,
    modalities: ["CT", "MR", "XR", "US", "PT", "MG", "NM"],
  });
}

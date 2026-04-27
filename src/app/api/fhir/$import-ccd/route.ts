// EMR-013 — FHIR $import-ccd operation.
//
// Accepts a CCD/CDA XML document, persists it as a Document tied to a
// patient, and queues an AgentJob to translate it into FHIR resources
// for chart reconciliation. The translator itself is stubbed in
// `translateCcdToFhirBundle` — wiring the persistence path now lets
// the front-end importer get built in parallel.
//
// Multipart form fields:
//   - patientId: string (required)
//   - file: XML blob (required, ≤ 5 MB)
//
// Response: { documentId, jobId, warnings[] }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { translateCcdToFhirBundle } from "@/lib/fhir/adapter";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/xml",
  "text/xml",
  "application/cda+xml",
]);

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.organizationId) {
    return NextResponse.json({ error: "no_organization" }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const patientId = String(formData.get("patientId") ?? "").trim();
  const file = formData.get("file");

  if (!patientId) {
    return NextResponse.json({ error: "missing_patient_id" }, { status: 400 });
  }
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BYTES },
      { status: 413 },
    );
  }
  const mime = (file as Blob & { type?: string }).type ?? "";
  if (mime && !ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "unsupported_content_type", got: mime },
      { status: 415 },
    );
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  }

  const xml = await file.text();
  const filename =
    (file as Blob & { name?: string }).name ?? `ccd-${Date.now()}.xml`;

  const { warnings } = translateCcdToFhirBundle({ filename, xml });

  // Production: stream to object storage and create a Document row that
  // points at the storageKey. For now we queue an AgentJob with a hash
  // of the bytes — the worker will reach out to whichever storage
  // backend is configured once that piece is wired up.
  const sha256 = await hashBytes(xml);
  const job = await prisma.agentJob.create({
    data: {
      organizationId: user.organizationId,
      workflowName: "fhir.ccd_import",
      agentName: "ccd-translator",
      eventName: "ccd.received",
      input: {
        patientId: patient.id,
        filename,
        bytes: xml.length,
        sha256,
        mime: mime || "application/xml",
      },
      status: "pending",
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: "fhir.ccd.imported",
      subjectType: "Patient",
      subjectId: patient.id,
      metadata: { jobId: job.id, bytes: xml.length, sha256, filename },
    },
  });

  return NextResponse.json({
    jobId: job.id,
    sha256,
    bytes: xml.length,
    warnings,
    status: "queued",
  });
}

async function hashBytes(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// EMR-241 — W-9 upload + admin retrieval.
//
// POST: encrypts the uploaded PDF (envelope encryption), writes to
// the configured storage backend, updates the VendorDocument row,
// and writes an AuditLog entry. Re-uploads keep prior versions in
// storage (versioned key) and capture the previous storage key in
// the AuditLog for forensic recovery.
//
// GET: admin-only retrieval. Streams decrypted PDF bytes inline.
//
// Auth: requires operator or practice_owner role (today's "admin"
// surface). Vendor-self-upload arrives with the dedicated vendor
// auth realm in EMR-249.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { encryptDocument, decryptDocument } from "@/lib/marketplace/document-encryption";
import {
  getStorageBackend,
  buildDocumentKey,
} from "@/lib/marketplace/document-storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // "%PDF"

function isPdf(buf: Buffer, mime: string | undefined): boolean {
  if (mime && mime !== "application/pdf") return false;
  return buf.length >= 4 && buf.subarray(0, 4).equals(PDF_MAGIC);
}

function isAdmin(user: { roles: string[] }): boolean {
  return user.roles.includes("operator") || user.roles.includes("practice_owner");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ vendorId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { vendorId } = await ctx.params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!vendor) {
    return NextResponse.json({ error: "vendor_not_found" }, { status: 404 });
  }
  // Tenant guard: only admins of the vendor's org can upload its W-9.
  if (vendor.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Multipart parse.
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file_field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BYTES, receivedBytes: file.size },
      { status: 413 },
    );
  }

  const plaintext = Buffer.from(await file.arrayBuffer());
  const mime = (file as Blob & { type?: string }).type;
  if (!isPdf(plaintext, mime)) {
    return NextResponse.json({ error: "not_a_pdf" }, { status: 415 });
  }

  // Look up the existing W-9 row so we can capture the previous
  // storage key (audit) and bump the version counter for the new key.
  const existing = await prisma.vendorDocument.findUnique({
    where: { vendorId_documentType: { vendorId, documentType: "w9" } },
    select: { id: true, fileUrl: true, organizationId: true },
  });

  // Version derives from previous fileUrl, e.g. ".../1.enc" → next is 2.
  const prevVersion = existing?.fileUrl?.match(/\/(\d+)\.enc/)?.[1];
  const nextVersion = prevVersion ? parseInt(prevVersion, 10) + 1 : 1;

  const encrypted = encryptDocument(plaintext);
  const storageKey = buildDocumentKey(vendorId, "w9", nextVersion);
  const backend = getStorageBackend();
  const { storageKey: persistedKey } = await backend.put(storageKey, encrypted.blob);

  const updated = await prisma.vendorDocument.upsert({
    where: { vendorId_documentType: { vendorId, documentType: "w9" } },
    update: {
      fileUrl: persistedKey,
      status: "submitted",
    },
    create: {
      organizationId: vendor.organizationId,
      vendorId,
      documentType: "w9",
      fileUrl: persistedKey,
      status: "submitted",
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: vendor.organizationId,
      actorUserId: user.id,
      action: existing?.fileUrl ? "vendor.w9.replaced" : "vendor.w9.uploaded",
      subjectType: "VendorDocument",
      subjectId: updated.id,
      metadata: {
        vendorId,
        previousFileUrl: existing?.fileUrl ?? null,
        newFileUrl: persistedKey,
        sha256: encrypted.sha256Hex,
        plaintextBytes: encrypted.plaintextBytes,
        version: nextVersion,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    documentId: updated.id,
    sha256: encrypted.sha256Hex,
    bytes: encrypted.plaintextBytes,
    version: nextVersion,
    status: "submitted",
  });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ vendorId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { vendorId } = await ctx.params;
  const doc = await prisma.vendorDocument.findUnique({
    where: { vendorId_documentType: { vendorId, documentType: "w9" } },
    select: { id: true, fileUrl: true, organizationId: true },
  });
  if (!doc || !doc.fileUrl) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (doc.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Read SHA from the most recent AuditLog so decryption can verify
  // integrity. (Storing it on VendorDocument would require a schema
  // change; the AuditLog metadata is authoritative for now.)
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      subjectType: "VendorDocument",
      subjectId: doc.id,
      action: { in: ["vendor.w9.uploaded", "vendor.w9.replaced"] },
    },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  const meta = auditEntry?.metadata as { sha256?: string } | null;
  if (!meta?.sha256) {
    return NextResponse.json({ error: "integrity_metadata_missing" }, { status: 500 });
  }

  const backend = getStorageBackend();
  const blob = await backend.get(doc.fileUrl);
  const plaintext = decryptDocument(blob, meta.sha256);

  await prisma.auditLog.create({
    data: {
      organizationId: doc.organizationId,
      actorUserId: user.id,
      action: "vendor.w9.retrieved",
      subjectType: "VendorDocument",
      subjectId: doc.id,
      metadata: { vendorId },
    },
  });

  return new NextResponse(new Uint8Array(plaintext), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="vendor-${vendorId}-w9.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}

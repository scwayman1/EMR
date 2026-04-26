// EMR-242 — COA upload + product link.
//
// Encrypts the PDF (envelope encryption, same as W-9) but exposes a
// public retrieval URL — COAs are buyer-facing per the ticket. The
// public URL points at our own `/api/marketplace/coa/[documentId]`
// route which decrypts and streams the PDF; this lets us add audit
// logging on retrieval without putting the bytes directly in a
// public bucket.
//
// Upload form fields:
//   - file: PDF (max 10MB)
//   - expiresAt: ISO date — when this COA stops being valid
//   - productIds: comma-separated list of product ids to link
//
// Re-uploads are versioned (v1.enc / v2.enc / ...). Linking to a
// product re-lists that product if it was previously delisted for
// expired/missing-COA reasons.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { encryptDocument } from "@/lib/marketplace/document-encryption";
import {
  getStorageBackend,
  buildDocumentKey,
} from "@/lib/marketplace/document-storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

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
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { vendorId } = await ctx.params;
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!vendor) return NextResponse.json({ error: "vendor_not_found" }, { status: 404 });
  if (vendor.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const productIdsRaw = String(formData.get("productIds") ?? "").trim();

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "missing_file_field" }, { status: 400 });
  }
  if (file.size === 0) return NextResponse.json({ error: "empty_file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "file_too_large", maxBytes: MAX_BYTES, receivedBytes: file.size },
      { status: 413 },
    );
  }
  if (!expiresAtRaw) {
    return NextResponse.json({ error: "missing_expires_at" }, { status: 400 });
  }
  const expiresAt = new Date(expiresAtRaw);
  if (Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "invalid_expires_at" }, { status: 400 });
  }
  if (expiresAt <= new Date()) {
    return NextResponse.json({ error: "expires_at_in_past" }, { status: 400 });
  }

  const productIds = productIdsRaw
    ? productIdsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const plaintext = Buffer.from(await file.arrayBuffer());
  const mime = (file as Blob & { type?: string }).type;
  if (!isPdf(plaintext, mime)) {
    return NextResponse.json({ error: "not_a_pdf" }, { status: 415 });
  }

  // Verify product ids belong to this org before linking.
  if (productIds.length > 0) {
    const found = await prisma.product.count({
      where: { id: { in: productIds }, organizationId: vendor.organizationId },
    });
    if (found !== productIds.length) {
      return NextResponse.json({ error: "invalid_product_ids" }, { status: 400 });
    }
  }

  const existing = await prisma.vendorDocument.findUnique({
    where: { vendorId_documentType: { vendorId, documentType: "coa" } },
    select: { id: true, fileUrl: true },
  });
  const prevVersion = existing?.fileUrl?.match(/\/(\d+)\.enc/)?.[1];
  const nextVersion = prevVersion ? parseInt(prevVersion, 10) + 1 : 1;

  const encrypted = encryptDocument(plaintext);
  const storageKey = buildDocumentKey(vendorId, "coa", nextVersion);
  const backend = getStorageBackend();
  const { storageKey: persistedKey } = await backend.put(storageKey, encrypted.blob);

  const updated = await prisma.vendorDocument.upsert({
    where: { vendorId_documentType: { vendorId, documentType: "coa" } },
    update: {
      fileUrl: persistedKey,
      publicUrl: null, // populated below once we know the document id
      expiresAt,
      status: "submitted",
    },
    create: {
      organizationId: vendor.organizationId,
      vendorId,
      documentType: "coa",
      fileUrl: persistedKey,
      expiresAt,
      status: "submitted",
    },
    select: { id: true },
  });

  // Public URL points at our route — same shape as a CDN URL but we
  // get to log access. When the bucket is fronted by CloudFront in
  // production we'll swap this for the CDN URL directly.
  const publicUrl = `/api/marketplace/coa/${updated.id}`;
  await prisma.vendorDocument.update({
    where: { id: updated.id },
    data: { publicUrl },
  });

  // Link the COA to the named products and auto-relist any that were
  // delisted for COA reasons.
  if (productIds.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { coaDocumentId: updated.id },
    });
    // Re-list archived products that now have a valid COA.
    await prisma.product.updateMany({
      where: { id: { in: productIds }, status: "archived" },
      data: { status: "active" },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: vendor.organizationId,
      actorUserId: user.id,
      action: existing?.fileUrl ? "vendor.coa.replaced" : "vendor.coa.uploaded",
      subjectType: "VendorDocument",
      subjectId: updated.id,
      metadata: {
        vendorId,
        previousFileUrl: existing?.fileUrl ?? null,
        newFileUrl: persistedKey,
        sha256: encrypted.sha256Hex,
        plaintextBytes: encrypted.plaintextBytes,
        version: nextVersion,
        expiresAt: expiresAt.toISOString(),
        linkedProductIds: productIds,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    documentId: updated.id,
    publicUrl,
    sha256: encrypted.sha256Hex,
    bytes: encrypted.plaintextBytes,
    version: nextVersion,
    expiresAt: expiresAt.toISOString(),
    linkedProductIds: productIds,
    status: "submitted",
  });
}

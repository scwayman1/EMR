// EMR-242 — public COA retrieval.
//
// COAs are buyer-facing per the ticket — we serve them without auth,
// but we still decrypt server-side (envelope encryption stays end-
// to-end on the backend) and audit-log every retrieval. When the
// bucket sits behind CloudFront in prod we'll swap to direct CDN
// URLs, but until then this route is the public endpoint.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { decryptDocument } from "@/lib/marketplace/document-encryption";
import { getStorageBackend } from "@/lib/marketplace/document-storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await ctx.params;
  const doc = await prisma.vendorDocument.findUnique({
    where: { id: documentId },
    select: { id: true, fileUrl: true, organizationId: true, documentType: true },
  });
  if (!doc || doc.documentType !== "coa" || !doc.fileUrl) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      subjectType: "VendorDocument",
      subjectId: doc.id,
      action: { in: ["vendor.coa.uploaded", "vendor.coa.replaced"] },
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

  // Pseudonymous audit — no actor required for public retrieval.
  await prisma.auditLog.create({
    data: {
      organizationId: doc.organizationId,
      action: "vendor.coa.public_retrieved",
      subjectType: "VendorDocument",
      subjectId: doc.id,
      metadata: { documentId },
    },
  });

  return new NextResponse(new Uint8Array(plaintext), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="coa-${documentId}.pdf"`,
      // Public + cacheable since COAs don't change after issuance.
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}

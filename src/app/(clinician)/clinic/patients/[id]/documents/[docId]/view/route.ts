import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createSignedUrl } from "@/lib/storage/documents";

/**
 * Redirects to a short-lived signed URL. Clinician may only view
 * documents that belong to a patient in their organization.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; docId: string } },
) {
  const user = await requireUser();
  if (!user.organizationId) return new NextResponse("Not found", { status: 404 });

  const doc = await prisma.document.findFirst({
    where: {
      id: params.docId,
      patientId: params.id,
      deletedAt: null,
      organizationId: user.organizationId,
    },
    select: { storageKey: true },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const url = await createSignedUrl(doc.storageKey);
  return NextResponse.redirect(url);
}

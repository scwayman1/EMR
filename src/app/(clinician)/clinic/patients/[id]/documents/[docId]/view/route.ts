import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createSignedUrl } from "@/lib/storage/documents";

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

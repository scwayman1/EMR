import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { createSignedUrl } from "@/lib/storage/documents";

/**
 * Redirects to a short-lived Supabase signed URL for a patient's
 * own document. Authorization is strict: the document must belong
 * to the logged-in patient.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole("patient");

  const doc = await prisma.document.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      patient: { userId: user.id },
    },
    select: { storageKey: true },
  });
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const url = await createSignedUrl(doc.storageKey);
  return NextResponse.redirect(url);
}

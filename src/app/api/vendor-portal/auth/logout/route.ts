// EMR-249 — vendor portal logout.
// Deletes the server-side session row so the cookie can't be reused
// even if it leaks, and clears the cookie.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import {
  VENDOR_SESSION_COOKIE,
  clearVendorSessionCookie,
} from "@/lib/vendor-auth/session";

export const runtime = "nodejs";

export async function POST(_req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(VENDOR_SESSION_COOKIE)?.value;
  if (token) {
    const sessionTokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.vendorSession.deleteMany({ where: { sessionTokenHash } });
  }
  await clearVendorSessionCookie();
  return NextResponse.json({ ok: true });
}

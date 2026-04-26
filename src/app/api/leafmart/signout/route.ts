/**
 * POST /api/leafmart/signout
 *
 * Destroys the iron-session cookie and (when Clerk is active) returns a
 * URL to Clerk's hosted sign-out so the client can redirect there.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
  } catch {
    // best-effort — even if iron-session can't load, fall through
  }

  return NextResponse.json({
    ok: true,
    redirectTo:
      process.env.AUTH_PROVIDER === "clerk" ? "/sign-in" : "/leafmart",
  });
}

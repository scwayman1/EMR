// EMR-249 — TOTP enrollment.
//
// Two endpoints in one route:
//   POST without body → generate a fresh secret, return otpauth:// URL
//     for the user's authenticator app to render as a QR code. Stores
//     the secret on the user row but leaves totpEnabledAt null until
//     verified. (User can re-issue if they lose the QR before
//     scanning — old secret is overwritten.)
//   POST with { totpCode } → verify the supplied code against the
//     stored secret. On success, set totpEnabledAt = now(), at which
//     point future logins require the second factor.
//
// We store the secret as soon as it's generated (no client round-
// tripping) — losing it before scanning is recoverable via re-issue,
// but client-storing is risky.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireVendorUser, VendorAuthError } from "@/lib/vendor-auth/session";
import {
  generateTotpSecret,
  verifyTotpCode,
  buildOtpAuthUrl,
} from "@/lib/vendor-auth/totp";

export const runtime = "nodejs";

const ISSUER = "Leafjourney Vendor Portal";

export async function POST(req: Request) {
  let user;
  try {
    user = await requireVendorUser();
  } catch (err) {
    if (err instanceof VendorAuthError) {
      return NextResponse.json({ error: err.reason }, { status: 401 });
    }
    throw err;
  }

  let body: { totpCode?: string } = {};
  try {
    body = (await req.json()) as { totpCode?: string };
  } catch {
    // body is optional for the issue step
  }

  // Verify step.
  if (body?.totpCode) {
    const dbUser = await prisma.vendorUser.findUnique({ where: { id: user.id } });
    if (!dbUser?.totpSecret) {
      return NextResponse.json({ error: "no_pending_secret" }, { status: 400 });
    }
    if (!verifyTotpCode(dbUser.totpSecret, body.totpCode)) {
      return NextResponse.json({ error: "invalid_totp" }, { status: 401 });
    }
    await prisma.vendorUser.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: null,
        actorUserId: null,
        action: "vendor.auth.totp_enrolled",
        subjectType: "VendorUser",
        subjectId: user.id,
        metadata: { vendorId: user.vendorId },
      },
    });
    return NextResponse.json({ ok: true, enrolled: true });
  }

  // Issue step.
  const secret = generateTotpSecret();
  await prisma.vendorUser.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabledAt: null },
  });
  const otpAuthUrl = buildOtpAuthUrl({
    secret,
    accountLabel: user.email,
    issuer: ISSUER,
  });
  return NextResponse.json({ ok: true, otpAuthUrl, secret });
}

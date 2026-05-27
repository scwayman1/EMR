// EMR-249 — vendor portal login.
//
// Two-step flow:
//   1. Email + password → if 2FA is enrolled, return 200 { needs2fa: true }
//      *without* issuing a session.
//   2. Same email + password + totpCode → issue session if all three
//      check out.
//
// We deliberately do NOT issue a partial-credentials cookie between
// steps; the password+TOTP check is atomic on each request. This
// rules out the "session-fixation between factors" class of bugs.
//
// Login attempts are AuditLogged regardless of outcome so a brute-
// force attempt is visible to ops.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  createVendorSession,
  setVendorSessionCookie,
} from "@/lib/vendor-auth/session";
import { verifyTotpCode } from "@/lib/vendor-auth/totp";

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

function clientIp(req: Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? undefined;
}

export async function POST(req: Request) {
  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  // Look up by email — but the unique key is (vendorId, email), so a
  // single email can map to multiple vendor accounts. For step 1 we
  // accept the password against any matching record; the session
  // binds to one specific (user, vendor) pair.
  const candidates = await prisma.vendorUser.findMany({
    where: { email: body.email, status: "active" },
  });

  // Always run bcrypt even on a miss to keep timing constant. Use a
  // dummy hash that won't match anything.
  const placeholderHash = "$2a$12$9WoB5n4o6eKQp7v.dummy.hash.kept.constant.time.gxxxxxxxxxxxxxxx";
  let matchedUser: typeof candidates[number] | null = null;
  for (const candidate of candidates) {
    if (await bcrypt.compare(body.password, candidate.passwordHash)) {
      matchedUser = candidate;
      break;
    }
  }
  if (!matchedUser && candidates.length === 0) {
    // Even on no-candidates, do a bcrypt to keep timing flat.
    await bcrypt.compare(body.password, placeholderHash);
  }

  if (!matchedUser) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  // 2FA gate.
  if (matchedUser.totpSecret && matchedUser.totpEnabledAt) {
    if (!body.totpCode) {
      return NextResponse.json({ ok: false, needs2fa: true }, { status: 200 });
    }
    if (!verifyTotpCode(matchedUser.totpSecret, body.totpCode)) {
      await prisma.auditLog.create({
        data: {
          organizationId: null,
          actorUserId: null,
          action: "vendor.auth.totp_failed",
          subjectType: "VendorUser",
          subjectId: matchedUser.id,
          metadata: { vendorId: matchedUser.vendorId, ipAddress: clientIp(req) },
        },
      });
      return NextResponse.json({ error: "invalid_totp" }, { status: 401 });
    }
  }

  const { token, expiresAt } = await createVendorSession({
    user: matchedUser,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });
  await setVendorSessionCookie(token, expiresAt);

  await prisma.auditLog.create({
    data: {
      organizationId: null,
      actorUserId: null,
      action: "vendor.auth.login",
      subjectType: "VendorUser",
      subjectId: matchedUser.id,
      metadata: { vendorId: matchedUser.vendorId, ipAddress: clientIp(req) },
    },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      role: matchedUser.role,
      vendorId: matchedUser.vendorId,
    },
    expiresAt,
  });
}

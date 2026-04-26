// EMR-249 — vendor portal session management.
//
// Distinct from clinical iron-session in three ways:
//   1. Different cookie name (`vendor_session` vs `emr_session`)
//   2. Different cookie path (`/vendor-portal`) so the browser
//      never sends it to clinical routes
//   3. Different DB lookup table (`VendorSession` vs `User`+memberships)
//
// Cookie holds a plaintext opaque token; DB stores its SHA-256. A DB
// leak alone can't impersonate. Token rotation on each issue.

import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { VendorPortalRole, VendorUser } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { vendorRoleCan, type VendorPortalAction } from "./role-gate";

export const VENDOR_SESSION_COOKIE = "vendor_session";
export const VENDOR_SESSION_COOKIE_PATH = "/vendor-portal";
export const VENDOR_SESSION_TTL_HOURS = 12;

export interface AuthedVendorUser {
  id: string;
  email: string;
  vendorId: string;
  role: VendorPortalRole;
  totpEnrolled: boolean;
}

export class VendorAuthError extends Error {
  constructor(
    message: string,
    public readonly reason:
      | "no_session"
      | "session_expired"
      | "user_inactive"
      | "forbidden"
      | "totp_required",
  ) {
    super(message);
    this.name = "VendorAuthError";
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  // 32 bytes → 64 hex chars. Roomy enough that brute-force is irrelevant.
  return randomBytes(32).toString("hex");
}

export async function createVendorSession(opts: {
  user: VendorUser;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + VENDOR_SESSION_TTL_HOURS * 60 * 60 * 1000);
  await prisma.vendorSession.create({
    data: {
      vendorUserId: opts.user.id,
      sessionTokenHash: hashToken(token),
      expiresAt,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    },
  });
  await prisma.vendorUser.update({
    where: { id: opts.user.id },
    data: { lastLoginAt: new Date() },
  });
  return { token, expiresAt };
}

export async function setVendorSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(VENDOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: VENDOR_SESSION_COOKIE_PATH,
    expires: expiresAt,
  });
}

export async function clearVendorSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(VENDOR_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: VENDOR_SESSION_COOKIE_PATH,
    maxAge: 0,
  });
}

export async function getCurrentVendorUser(): Promise<AuthedVendorUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(VENDOR_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.vendorSession.findUnique({
    where: { sessionTokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  // Constant-time check on the stored hash vs the recomputed hash.
  // findUnique returned a hit, but we double-check to defend against
  // a hypothetical DB bug returning a near-match.
  const expectedHash = Buffer.from(session.sessionTokenHash, "hex");
  const actualHash = Buffer.from(hashToken(token), "hex");
  if (
    expectedHash.length !== actualHash.length ||
    !timingSafeEqual(expectedHash, actualHash)
  ) {
    return null;
  }

  if (session.expiresAt <= new Date()) return null;
  if (session.user.status !== "active") return null;

  return {
    id: session.user.id,
    email: session.user.email,
    vendorId: session.user.vendorId,
    role: session.user.role,
    totpEnrolled: !!session.user.totpEnabledAt,
  };
}

export async function requireVendorUser(): Promise<AuthedVendorUser> {
  const user = await getCurrentVendorUser();
  if (!user) throw new VendorAuthError("not signed in", "no_session");
  return user;
}

/**
 * Gate an action by the user's role. Throws on miss so callers can
 * `try/catch` once at the top of a route.
 */
export async function requireVendorPermission(
  action: VendorPortalAction,
): Promise<AuthedVendorUser> {
  const user = await requireVendorUser();
  if (!vendorRoleCan(user.role, action)) {
    throw new VendorAuthError(
      `role ${user.role} cannot ${action}`,
      "forbidden",
    );
  }
  return user;
}

export async function pruneExpiredVendorSessions(): Promise<number> {
  const result = await prisma.vendorSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

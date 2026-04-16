import { cache } from "react";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface SessionData {
  userId?: string;
  // short-lived; the full user/role is loaded fresh from DB on each request
}

// Placeholder used ONLY during build-time static analysis. Any runtime
// request in production must see a real SESSION_SECRET; we enforce that
// inside getSession() below so the build itself doesn't blow up.
const BUILD_TIME_PLACEHOLDER = "build-time-placeholder-not-used-at-runtime-32c";

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || BUILD_TIME_PLACEHOLDER,
  cookieName: "emr_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  // Runtime check: refuse to use the placeholder secret in production.
  // Skipped during `next build` (NEXT_PHASE === 'phase-production-build')
  // because prerender probing runs getSession() with no real env.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    !process.env.SESSION_SECRET
  ) {
    throw new Error(
      "SESSION_SECRET environment variable is required in production. " +
        "Refusing to issue sessions with an insecure default.",
    );
  }
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export interface AuthedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  organizationId: string | null;
  organizationName: string | null;
}

/**
 * Load the current user + roles.
 *
 * Cached per request so every server component gets the same reference.
 *
 * Delegates to Clerk when AUTH_PROVIDER=clerk; otherwise uses iron-session.
 * The AuthedUser shape is identical in both cases — the 100+ callers of
 * this function don't need to change.
 */
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
  // Delegate to Clerk when the feature flag is on
  if (process.env.AUTH_PROVIDER === "clerk") {
    const { getCurrentUserFromClerk } = await import("./clerk-session");
    return getCurrentUserFromClerk();
  }

  // Legacy iron-session path (default)
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) return null;

  const firstMembership = user.memberships[0];

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.memberships.map((m) => m.role),
    organizationId: firstMembership?.organizationId ?? null,
    organizationName: firstMembership?.organization?.name ?? null,
  };
});

export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(role: Role): Promise<AuthedUser> {
  const user = await requireUser();
  if (!user.roles.includes(role)) throw new Error("FORBIDDEN");
  return user;
}

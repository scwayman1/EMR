import { cache } from "react";
import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface SessionData {
  userId?: string;
  // short-lived; the full user/role is loaded fresh from DB on each request
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "dev-session-secret-change-me-please-at-least-32c",
  cookieName: "emr_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
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
 * Load the current user + roles from the session cookie.
 * Cached per request so every server component gets the same reference.
 */
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
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

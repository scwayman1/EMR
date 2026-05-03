import { cache } from "react";
import type { Role } from "@prisma/client";
import { getCurrentUserFromClerk } from "./clerk-session";

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
 * Cached per request so every server component gets the same reference.
 * Delegates strictly to Clerk.
 */
export const getCurrentUser = cache(async (): Promise<AuthedUser | null> => {
  return await getCurrentUserFromClerk();
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

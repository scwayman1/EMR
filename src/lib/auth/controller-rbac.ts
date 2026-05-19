// EMR-428 — Controller RBAC surface.
//
// Public-facing helper module for "who can touch the Practice Onboarding
// Controller?" Names are tuned for call-site readability (verbs over roles):
//
//   requireControllerAdmin()      → throws unless SUPER_ADMIN | IMPLEMENTATION_ADMIN
//   canViewPublishedConfig(u, id) → boolean read predicate
//   canEditConfig(u)              → boolean write predicate (sync, no DB)
//
// This module is a thin, intent-revealing layer on top of the lower-level
// primitives in `./super-admin.ts` (which also enforce MFA at the
// require-* boundary). Keeping a single source of truth there avoids two
// drift-prone copies of the role list.
//
// IMPORTANT — defense in depth: middleware does a coarse role gate, but
// every controller route handler and server action MUST call
// `requireControllerAdmin()` (write path) or check
// `canViewPublishedConfig()` (read path) before touching state.

import "server-only";

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { type AuthedUser } from "./session";
import { requireImplementationAdmin } from "./super-admin";

/** Roles that may write/operate the onboarding controller. */
const CONTROLLER_EDITOR_ROLES: ReadonlyArray<Role> = [
  "super_admin",
  "implementation_admin",
];

function hasAnyRole(user: AuthedUser, allowed: ReadonlyArray<Role>): boolean {
  return user.roles.some((r) => allowed.includes(r));
}

/**
 * Require the caller to be a controller admin (SUPER_ADMIN or
 * IMPLEMENTATION_ADMIN). Throws "UNAUTHORIZED" if no session,
 * "FORBIDDEN" if the role check fails, and may throw `MfaRequiredError`
 * for super-admins outside their MFA grace window.
 *
 * Delegates to `requireImplementationAdmin` from ./super-admin so the
 * role list (and MFA enforcement) live in exactly one place.
 */
export async function requireControllerAdmin(): Promise<AuthedUser> {
  return requireImplementationAdmin();
}

/**
 * True when `user` may VIEW the published config for `practiceId`.
 *
 *   - super_admin           → always true
 *   - implementation_admin  → always true (they steward every practice)
 *   - practice_admin        → only when they have an active Membership
 *                             with role=practice_admin in `practiceId`
 *   - any other role        → false
 *
 * Pass-through for empty `practiceId` is `false` to fail closed.
 */
export async function canViewPublishedConfig(
  user: AuthedUser,
  practiceId: string,
): Promise<boolean> {
  if (!practiceId) return false;

  if (user.roles.includes("super_admin")) return true;
  if (user.roles.includes("implementation_admin")) return true;

  if (!user.roles.includes("practice_admin")) return false;

  // We don't trust `user.organizationId` alone — a user may belong to
  // multiple orgs and that field reflects only their primary membership.
  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organizationId: practiceId,
      role: "practice_admin",
    },
    select: { id: true },
  });

  return membership !== null;
}

/**
 * Synchronous predicate — true when `user` may EDIT controller config.
 * Only SUPER_ADMIN and IMPLEMENTATION_ADMIN qualify. Intentionally does
 * not touch the database so it's safe to call from render paths.
 *
 * NOTE: this is a predicate, not a guard — it does NOT enforce MFA.
 * For mutation paths always call `requireControllerAdmin()` instead.
 */
export function canEditConfig(user: AuthedUser): boolean {
  return hasAnyRole(user, CONTROLLER_EDITOR_ROLES);
}

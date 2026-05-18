import type { Role } from "@prisma/client";

// Per-role idle-timeout budgets.
//
// HIPAA's Security Rule does not name a number, but the recommended
// safeguard is automatic logoff after a period of inactivity. The values
// below align to community norms for EMR vendors:
//
//   - PHI-touching staff (clinician, operator, practice_owner,
//     practice_admin, system) → 15 min idle
//   - Patients on their own portal → 30 min idle (personal device,
//     friction-light)
//   - LeafJourney internal admins (super_admin, implementation_admin)
//     → 10 min idle (cross-tenant access, tightest budget)
//
// The absolute session cap (`ABSOLUTE_SESSION_MS`) is layered on top:
// even with continuous activity, a session ends after 12 hours so the
// classic "left a clinic workstation logged in overnight" case is
// bounded.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const IDLE_LIMITS_MS: Record<Role, number> = {
  patient: 30 * MINUTE,
  clinician: 15 * MINUTE,
  operator: 15 * MINUTE,
  practice_owner: 15 * MINUTE,
  practice_admin: 15 * MINUTE,
  system: 15 * MINUTE,
  implementation_admin: 10 * MINUTE,
  super_admin: 10 * MINUTE,
};

/** Absolute cap on session age — applies regardless of activity. */
export const ABSOLUTE_SESSION_MS = 12 * HOUR;

/** How long the soft warning sits on screen before we force sign-out. */
export const IDLE_WARNING_MS = 60_000;

/**
 * Pick the timeout for a user. When a user holds multiple roles, we use
 * the SHORTEST budget so the most privileged role's policy wins — e.g.
 * a super_admin who is also a patient still gets the 10-min internal-admin
 * timeout, not the 30-min patient one.
 */
export function idleLimitForRoles(roles: Role[]): number {
  if (roles.length === 0) return IDLE_LIMITS_MS.patient;
  let min = Number.POSITIVE_INFINITY;
  for (const r of roles) {
    const limit = IDLE_LIMITS_MS[r];
    if (limit !== undefined && limit < min) min = limit;
  }
  return Number.isFinite(min) ? min : IDLE_LIMITS_MS.patient;
}

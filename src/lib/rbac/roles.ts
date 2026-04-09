import type { Role } from "@prisma/client";

/** Role labels for UI display. */
export const ROLE_LABELS: Record<Role, string> = {
  patient: "Patient",
  clinician: "Clinician",
  operator: "Operator",
  practice_owner: "Practice Owner",
  system: "System",
};

/** Which landing path each role should hit after login. */
export const ROLE_HOME: Record<Role, string> = {
  patient: "/portal",
  clinician: "/clinic",
  operator: "/ops",
  practice_owner: "/ops",
  system: "/ops/mission-control",
};

/** Roles allowed to enter each route prefix. First match wins. */
const ROUTE_GUARDS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/portal", roles: ["patient"] },
  { prefix: "/clinic", roles: ["clinician", "practice_owner"] },
  { prefix: "/ops", roles: ["operator", "practice_owner", "system"] },
];

/** Does this role have any permission to access this path prefix? */
export function canAccessPath(role: Role, path: string): boolean {
  for (const guard of ROUTE_GUARDS) {
    if (path.startsWith(guard.prefix)) {
      return guard.roles.includes(role);
    }
  }
  return true; // unguarded paths are public
}

/** The highest-privilege role from a set — used to pick the primary experience. */
export function primaryRole(roles: Role[]): Role {
  const order: Role[] = ["system", "practice_owner", "operator", "clinician", "patient"];
  for (const r of order) if (roles.includes(r)) return r;
  return "patient";
}

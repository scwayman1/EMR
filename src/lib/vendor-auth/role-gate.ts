// EMR-249 — vendor portal role gate.
//
// Centralizes which actions each role can perform. Routes pull the
// permission map rather than inlining role checks so the policy lives
// in one place.

import type { VendorPortalRole } from "@prisma/client";

export type VendorPortalAction =
  | "catalog.read"
  | "catalog.write"
  | "orders.read"
  | "orders.fulfill"
  | "finance.read"
  | "finance.write"
  | "vendor.profile.read"
  | "vendor.profile.write"
  | "vendor.users.invite"
  | "vendor.users.remove"
  | "vendor.documents.upload"
  | "vendor.documents.delete";

const PERMISSIONS: Record<VendorPortalRole, ReadonlySet<VendorPortalAction>> = {
  owner: new Set<VendorPortalAction>([
    "catalog.read",
    "catalog.write",
    "orders.read",
    "orders.fulfill",
    "finance.read",
    "finance.write",
    "vendor.profile.read",
    "vendor.profile.write",
    "vendor.users.invite",
    "vendor.users.remove",
    "vendor.documents.upload",
    "vendor.documents.delete",
  ]),
  catalog_manager: new Set<VendorPortalAction>([
    "catalog.read",
    "catalog.write",
    "vendor.profile.read",
    "vendor.documents.upload",
  ]),
  fulfillment: new Set<VendorPortalAction>([
    "catalog.read",
    "orders.read",
    "orders.fulfill",
    "vendor.profile.read",
  ]),
  finance: new Set<VendorPortalAction>([
    "catalog.read",
    "orders.read",
    "finance.read",
    "finance.write",
    "vendor.profile.read",
    "vendor.documents.upload",
  ]),
};

export function vendorRoleCan(
  role: VendorPortalRole,
  action: VendorPortalAction,
): boolean {
  return PERMISSIONS[role].has(action);
}

/**
 * Roles that are required to enroll 2FA before they can perform any
 * write actions. These roles touch money or compliance docs — losing
 * one of these accounts is the worst-case scenario.
 */
const ROLES_REQUIRING_2FA = new Set<VendorPortalRole>(["owner", "finance"]);

export function vendorRoleRequires2FA(role: VendorPortalRole): boolean {
  return ROLES_REQUIRING_2FA.has(role);
}

export const VENDOR_PORTAL_ROLES: ReadonlyArray<VendorPortalRole> = [
  "owner",
  "catalog_manager",
  "fulfillment",
  "finance",
];

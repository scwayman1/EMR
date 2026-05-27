import { describe, it, expect } from "vitest";
import {
  vendorRoleCan,
  vendorRoleRequires2FA,
  VENDOR_PORTAL_ROLES,
} from "./role-gate";

describe("vendorRoleCan", () => {
  it("owner can do everything", () => {
    expect(vendorRoleCan("owner", "catalog.write")).toBe(true);
    expect(vendorRoleCan("owner", "finance.write")).toBe(true);
    expect(vendorRoleCan("owner", "vendor.users.invite")).toBe(true);
    expect(vendorRoleCan("owner", "vendor.documents.delete")).toBe(true);
  });

  it("catalog_manager can read+write catalog but not finance", () => {
    expect(vendorRoleCan("catalog_manager", "catalog.write")).toBe(true);
    expect(vendorRoleCan("catalog_manager", "finance.write")).toBe(false);
    expect(vendorRoleCan("catalog_manager", "finance.read")).toBe(false);
    expect(vendorRoleCan("catalog_manager", "vendor.users.invite")).toBe(false);
  });

  it("fulfillment can fulfill orders but not edit catalog", () => {
    expect(vendorRoleCan("fulfillment", "orders.fulfill")).toBe(true);
    expect(vendorRoleCan("fulfillment", "catalog.write")).toBe(false);
    expect(vendorRoleCan("fulfillment", "finance.write")).toBe(false);
  });

  it("finance can read+write finance but not invite users (owner-only)", () => {
    expect(vendorRoleCan("finance", "finance.write")).toBe(true);
    expect(vendorRoleCan("finance", "vendor.users.invite")).toBe(false);
    expect(vendorRoleCan("finance", "catalog.write")).toBe(false);
  });
});

describe("vendorRoleRequires2FA", () => {
  it("requires 2FA for owner and finance (touch money/compliance)", () => {
    expect(vendorRoleRequires2FA("owner")).toBe(true);
    expect(vendorRoleRequires2FA("finance")).toBe(true);
  });

  it("does not require 2FA for catalog_manager or fulfillment", () => {
    expect(vendorRoleRequires2FA("catalog_manager")).toBe(false);
    expect(vendorRoleRequires2FA("fulfillment")).toBe(false);
  });
});

describe("VENDOR_PORTAL_ROLES", () => {
  it("includes all four roles", () => {
    expect(VENDOR_PORTAL_ROLES).toEqual([
      "owner",
      "catalog_manager",
      "fulfillment",
      "finance",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import { computeAgeYears, resolveAgeGate, resolveCartAgeGate } from "./age-gate";

describe("computeAgeYears", () => {
  it("computes age with birthday boundary", () => {
    const now = new Date("2026-04-23T00:00:00.000Z");
    expect(computeAgeYears(new Date("2005-04-23T00:00:00.000Z"), now)).toBe(21);
    expect(computeAgeYears(new Date("2005-04-24T00:00:00.000Z"), now)).toBe(20);
  });
});

describe("resolveAgeGate", () => {
  it("allows non-21+ products", () => {
    const result = resolveAgeGate({
      requires21Plus: false,
      isAuthenticated: false,
    });
    expect(result.status).toBe("allowed");
  });

  it("requires login for 21+ products", () => {
    const result = resolveAgeGate({
      requires21Plus: true,
      isAuthenticated: false,
    });
    expect(result.status).toBe("guest_login");
  });

  it("requires dob for authenticated users on 21+ products", () => {
    const result = resolveAgeGate({
      requires21Plus: true,
      isAuthenticated: true,
      dateOfBirth: null,
    });
    expect(result.status).toBe("needs_dob");
  });

  it("blocks underage users", () => {
    const result = resolveAgeGate({
      requires21Plus: true,
      isAuthenticated: true,
      dateOfBirth: new Date("2010-01-01T00:00:00.000Z"),
    });
    expect(result.status).toBe("blocked_underage");
  });

  it("applies state override messaging", () => {
    const result = resolveAgeGate({
      requires21Plus: true,
      isAuthenticated: true,
      dateOfBirth: new Date("2008-01-01T00:00:00.000Z"),
      destinationState: "TX",
    });
    expect(result.status).toBe("blocked_state");
  });
});

describe("resolveCartAgeGate", () => {
  const adultDob = new Date("1990-01-01T00:00:00.000Z");
  const teenDob = new Date("2010-01-01T00:00:00.000Z");

  const items21Plus = [{ productSlug: "thc-1", productName: "THC Item", requires21Plus: true }];
  const itemsHemp = [{ productSlug: "cbd-1", productName: "CBD Item", requires21Plus: false }];
  const mixedCart = [...items21Plus, ...itemsHemp];

  it("never blocks items that don't require 21+", () => {
    const result = resolveCartAgeGate({
      items: itemsHemp,
      isAuthenticated: false,
      dateOfBirth: null,
      ageVerifiedAt: null,
    });
    expect(result.ok).toBe(true);
    expect(result.blocked).toHaveLength(0);
  });

  it("fast-paths a verified adult patient (no re-prompt)", () => {
    const result = resolveCartAgeGate({
      items: items21Plus,
      isAuthenticated: true,
      dateOfBirth: adultDob,
      ageVerifiedAt: new Date(),
    });
    expect(result.ok).toBe(true);
  });

  it("blocks an unauthenticated cart with 21+ items", () => {
    const result = resolveCartAgeGate({
      items: items21Plus,
      isAuthenticated: false,
    });
    expect(result.ok).toBe(false);
    expect(result.blocked[0].decision.status).toBe("guest_login");
  });

  it("blocks a teen patient even with ageVerifiedAt set (defense in depth)", () => {
    // ageVerifiedAt is only honored if DOB also clears 21 — a tampered
    // session value can't bypass the actual age check.
    const result = resolveCartAgeGate({
      items: items21Plus,
      isAuthenticated: true,
      dateOfBirth: teenDob,
      ageVerifiedAt: new Date(),
    });
    expect(result.ok).toBe(false);
    expect(result.blocked[0].decision.status).toBe("blocked_underage");
  });

  it("blocks only the 21+ items in a mixed cart", () => {
    const result = resolveCartAgeGate({
      items: mixedCart,
      isAuthenticated: true,
      dateOfBirth: null,
    });
    expect(result.blocked).toHaveLength(1);
    expect(result.blocked[0].item.productSlug).toBe("thc-1");
  });

  it("requires DOB collection for an authenticated patient with no DOB", () => {
    const result = resolveCartAgeGate({
      items: items21Plus,
      isAuthenticated: true,
      dateOfBirth: null,
    });
    expect(result.blocked[0].decision.status).toBe("needs_dob");
  });
});

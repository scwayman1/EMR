import { describe, expect, it } from "vitest";

import { computeAgeYears, resolveAgeGate } from "./age-gate";

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

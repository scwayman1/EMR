import { describe, expect, it } from "vitest";
import {
  ABSOLUTE_SESSION_MS,
  IDLE_LIMITS_MS,
  IDLE_WARNING_MS,
  idleLimitForRoles,
} from "./idle-timeouts";

const MIN = 60_000;

describe("idle-timeouts", () => {
  it("clinician/operator/practice_owner get 15 minutes", () => {
    expect(IDLE_LIMITS_MS.clinician).toBe(15 * MIN);
    expect(IDLE_LIMITS_MS.operator).toBe(15 * MIN);
    expect(IDLE_LIMITS_MS.practice_owner).toBe(15 * MIN);
    expect(IDLE_LIMITS_MS.practice_admin).toBe(15 * MIN);
  });

  it("patient gets 30 minutes", () => {
    expect(IDLE_LIMITS_MS.patient).toBe(30 * MIN);
  });

  it("super_admin and implementation_admin get 10 minutes", () => {
    expect(IDLE_LIMITS_MS.super_admin).toBe(10 * MIN);
    expect(IDLE_LIMITS_MS.implementation_admin).toBe(10 * MIN);
  });

  it("absolute cap is 12 hours", () => {
    expect(ABSOLUTE_SESSION_MS).toBe(12 * 60 * MIN);
  });

  it("warning window is 60 seconds", () => {
    expect(IDLE_WARNING_MS).toBe(60_000);
  });

  describe("idleLimitForRoles", () => {
    it("returns the role's limit for a single-role user", () => {
      expect(idleLimitForRoles(["patient"])).toBe(30 * MIN);
      expect(idleLimitForRoles(["clinician"])).toBe(15 * MIN);
      expect(idleLimitForRoles(["super_admin"])).toBe(10 * MIN);
    });

    it("picks the SHORTEST budget when a user has multiple roles", () => {
      // A super_admin who is also a patient should get the 10-min cap,
      // not the 30-min patient one.
      expect(idleLimitForRoles(["patient", "super_admin"])).toBe(10 * MIN);
      expect(idleLimitForRoles(["clinician", "practice_owner"])).toBe(15 * MIN);
      expect(
        idleLimitForRoles(["patient", "clinician", "implementation_admin"]),
      ).toBe(10 * MIN);
    });

    it("falls back to patient when roles are empty", () => {
      expect(idleLimitForRoles([])).toBe(30 * MIN);
    });
  });
});

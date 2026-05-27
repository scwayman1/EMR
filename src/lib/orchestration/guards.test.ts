import { describe, expect, it } from "vitest";
import { assertOrgMatch, OrgScopeViolationError } from "./guards";

describe("assertOrgMatch", () => {
  it("is a no-op when the entity's org matches the input org", () => {
    expect(() =>
      assertOrgMatch("org-a", "org-a", "claim", "claim-1"),
    ).not.toThrow();
  });

  it("throws OrgScopeViolationError when orgs differ", () => {
    expect(() =>
      assertOrgMatch("org-a", "org-b", "claim", "claim-1"),
    ).toThrow(OrgScopeViolationError);
  });

  it("includes the entity kind, id, and both org ids in the message", () => {
    try {
      assertOrgMatch("org-a", "org-b", "claim", "claim-1");
      throw new Error("expected assertOrgMatch to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(OrgScopeViolationError);
      const msg = (err as Error).message;
      expect(msg).toContain("Org scope violation");
      expect(msg).toContain("claim");
      expect(msg).toContain("claim-1");
      expect(msg).toContain("org-a");
      expect(msg).toContain("org-b");
    }
  });

  it("exposes structured fields on the error for logging", () => {
    try {
      assertOrgMatch("org-a", "org-b", "task", "task-9");
      throw new Error("expected assertOrgMatch to throw");
    } catch (err) {
      const e = err as OrgScopeViolationError;
      expect(e.entityKind).toBe("task");
      expect(e.entityId).toBe("task-9");
      expect(e.entityOrgId).toBe("org-a");
      expect(e.inputOrgId).toBe("org-b");
    }
  });

  it("treats the empty string and any populated org as a mismatch", () => {
    expect(() => assertOrgMatch("", "org-a", "claim", "c")).toThrow(
      OrgScopeViolationError,
    );
    expect(() => assertOrgMatch("org-a", "", "claim", "c")).toThrow(
      OrgScopeViolationError,
    );
  });
});

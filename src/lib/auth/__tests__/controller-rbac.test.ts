// EMR-428 — Controller RBAC unit tests.
//
// Covers the three exports of `src/lib/auth/controller-rbac.ts` across the
// full role × action matrix:
//
//                          requireControllerAdmin │ canViewPublishedConfig │ canEditConfig
//   super_admin                ✓                  │ ✓ (any practice)        │ ✓
//   implementation_admin       ✓                  │ ✓ (any practice)        │ ✓
//   practice_admin             ✗ FORBIDDEN        │ ✓ only own practice     │ ✗
//   clinician                  ✗ FORBIDDEN        │ ✗                       │ ✗
//   operator                   ✗ FORBIDDEN        │ ✗                       │ ✗
//   patient                    ✗ FORBIDDEN        │ ✗                       │ ✗
//   <unauthenticated>          ✗ UNAUTHORIZED     │ n/a (user required)     │ n/a
//
// We mock `requireUser` and Prisma so this stays a pure unit test.

import { vi } from "vitest";
vi.mock("server-only", () => ({}));

import { describe, it, expect, beforeEach } from "vitest";

vi.mock("../session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("../super-admin-mfa", () => ({
  loadSuperAdminMfaState: vi.fn().mockResolvedValue({ status: "enrolled" }),
  MfaRequiredError: class MfaRequiredError extends Error {},
}));

const findFirstMock = vi.fn();
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    membership: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

import { requireUser } from "../session";
import {
  requireControllerAdmin,
  canViewPublishedConfig,
  canEditConfig,
} from "../controller-rbac";

const mockedRequireUser = vi.mocked(requireUser);

function makeUser(roles: string[], overrides: Record<string, unknown> = {}) {
  return {
    id: "user_1",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    roles: roles as unknown as ReturnType<typeof Object>[] as never,
    organizationId: "org_1",
    organizationName: "Test Org",
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  findFirstMock.mockResolvedValue(null);
});

// ─── requireControllerAdmin ────────────────────────────────────────────

describe("requireControllerAdmin", () => {
  it("returns the user when role is super_admin", async () => {
    mockedRequireUser.mockResolvedValue(makeUser(["super_admin"]));
    const user = await requireControllerAdmin();
    expect(user.roles).toContain("super_admin");
  });

  it("returns the user when role is implementation_admin", async () => {
    mockedRequireUser.mockResolvedValue(makeUser(["implementation_admin"]));
    const user = await requireControllerAdmin();
    expect(user.roles).toContain("implementation_admin");
  });

  it("accepts users holding multiple roles when one matches", async () => {
    mockedRequireUser.mockResolvedValue(
      makeUser(["clinician", "implementation_admin"]),
    );
    const user = await requireControllerAdmin();
    expect(user.roles).toContain("implementation_admin");
  });

  it.each([
    ["practice_admin"],
    ["clinician"],
    ["operator"],
    ["patient"],
    ["practice_owner"],
  ])("throws FORBIDDEN for role=%s", async (role) => {
    mockedRequireUser.mockResolvedValue(makeUser([role]));
    await expect(requireControllerAdmin()).rejects.toThrow("FORBIDDEN");
  });

  it("throws FORBIDDEN when user has no roles at all", async () => {
    mockedRequireUser.mockResolvedValue(makeUser([]));
    await expect(requireControllerAdmin()).rejects.toThrow("FORBIDDEN");
  });

  it("propagates UNAUTHORIZED when requireUser rejects", async () => {
    mockedRequireUser.mockRejectedValue(new Error("UNAUTHORIZED"));
    await expect(requireControllerAdmin()).rejects.toThrow("UNAUTHORIZED");
  });
});

// ─── canViewPublishedConfig ────────────────────────────────────────────

describe("canViewPublishedConfig", () => {
  it("returns true for super_admin regardless of practiceId", async () => {
    const ok = await canViewPublishedConfig(
      makeUser(["super_admin"]),
      "prac_999",
    );
    expect(ok).toBe(true);
  });

  it("returns true for implementation_admin regardless of practiceId", async () => {
    const ok = await canViewPublishedConfig(
      makeUser(["implementation_admin"]),
      "prac_999",
    );
    expect(ok).toBe(true);
  });

  it("returns true for practice_admin when they own the practice", async () => {
    findFirstMock.mockResolvedValueOnce({ id: "membership_1" });
    const ok = await canViewPublishedConfig(
      makeUser(["practice_admin"], { organizationId: "prac_owned" }),
      "prac_owned",
    );
    expect(ok).toBe(true);
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });

  it("returns false for practice_admin when they do NOT own the practice", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const ok = await canViewPublishedConfig(
      makeUser(["practice_admin"], { organizationId: "prac_owned" }),
      "prac_other",
    );
    expect(ok).toBe(false);
  });

  it.each([
    ["clinician"],
    ["operator"],
    ["patient"],
    ["practice_owner"],
  ])("returns false for role=%s", async (role) => {
    const ok = await canViewPublishedConfig(makeUser([role]), "prac_1");
    expect(ok).toBe(false);
  });

  it("returns false when practiceId is empty string", async () => {
    const ok = await canViewPublishedConfig(makeUser(["practice_admin"]), "");
    expect(ok).toBe(false);
  });
});

// ─── canEditConfig ─────────────────────────────────────────────────────

describe("canEditConfig", () => {
  it("returns true for super_admin", () => {
    expect(canEditConfig(makeUser(["super_admin"]))).toBe(true);
  });

  it("returns true for implementation_admin", () => {
    expect(canEditConfig(makeUser(["implementation_admin"]))).toBe(true);
  });

  it("returns true when user holds both editor roles", () => {
    expect(
      canEditConfig(makeUser(["super_admin", "implementation_admin"])),
    ).toBe(true);
  });

  it.each([
    ["practice_admin"],
    ["clinician"],
    ["operator"],
    ["patient"],
    ["practice_owner"],
  ])("returns false for role=%s", (role) => {
    expect(canEditConfig(makeUser([role]))).toBe(false);
  });

  it("returns false when user has no roles", () => {
    expect(canEditConfig(makeUser([]))).toBe(false);
  });
});

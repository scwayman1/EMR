import { vi } from "vitest";
vi.mock("server-only", () => ({}));

import { describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    organization: { upsert: vi.fn() },
    membership: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/observability/log", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";
import { bootstrapSuperAdminIfAllowlisted } from "./super-admin-bootstrap";
import type { AuthedUser } from "./session";

const mockedPrisma = vi.mocked(prisma, true) as unknown as {
  organization: { upsert: ReturnType<typeof vi.fn> };
  membership: { upsert: ReturnType<typeof vi.fn> };
};

const allowlistedUser: AuthedUser = {
  id: "user_seed",
  email: "scott@leafjourney.com",
  firstName: "Scott",
  lastName: "Wayman",
  roles: ["clinician"],
  organizationId: "org_clinic",
  organizationName: "Test Clinic",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("SUPER_ADMIN_BOOTSTRAP_ENABLED", "1");
  vi.stubEnv("SUPER_ADMIN_BOOTSTRAP_EMAILS", "scott@leafjourney.com,neal@leafjourney.com");
  mockedPrisma.organization.upsert.mockResolvedValue({ id: "org_hq" });
  mockedPrisma.membership.upsert.mockResolvedValue({});
});

describe("bootstrapSuperAdminIfAllowlisted", () => {
  it("promotes when user email is allowlisted", async () => {
    const user = { ...allowlistedUser };
    const result = await bootstrapSuperAdminIfAllowlisted(user);

    expect(result).toBe(true);
    expect(user.roles).toContain("super_admin");
    expect(mockedPrisma.membership.upsert).toHaveBeenCalledTimes(1);
  });

  it("does not promote when email is not on the allowlist", async () => {
    vi.stubEnv("SUPER_ADMIN_BOOTSTRAP_EMAILS", "someone-else@leafjourney.com");
    const user = { ...allowlistedUser };
    const result = await bootstrapSuperAdminIfAllowlisted(user);

    expect(result).toBe(false);
    expect(mockedPrisma.membership.upsert).not.toHaveBeenCalled();
  });

  it("does not promote when bootstrap is disabled in prod", async () => {
    vi.stubEnv("SUPER_ADMIN_BOOTSTRAP_ENABLED", "");
    const user = { ...allowlistedUser };
    const result = await bootstrapSuperAdminIfAllowlisted(user);

    expect(result).toBe(false);
    expect(mockedPrisma.membership.upsert).not.toHaveBeenCalled();
  });

  it("returns false when user already has super_admin (idempotent)", async () => {
    const user = { ...allowlistedUser, roles: ["super_admin" as const] };
    const result = await bootstrapSuperAdminIfAllowlisted(user);

    expect(result).toBe(false);
    expect(mockedPrisma.membership.upsert).not.toHaveBeenCalled();
  });
});

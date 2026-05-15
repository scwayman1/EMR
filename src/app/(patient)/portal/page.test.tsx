import { describe, it, expect, vi, beforeEach } from "vitest";
import util from "util";
import PatientHome from "./page";
import * as session from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/auth/session", () => ({
  requireRole: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    patient: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// We also need to mock Next.js components that use "use client" if they crash in Node environment.
// But mostly they just return object descriptors, so it's fine unless they run code at module scope.

describe("PatientHome Server Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 'Taking a moment' fallback when the database query hangs (EMR-205 regression test)", async () => {
    vi.mocked(session.requireRole).mockResolvedValue({ id: "user-123", roles: ["patient"] } as any);

    vi.mocked(prisma.patient.findUnique).mockImplementation(() => new Promise(() => {}));

    const start = Date.now();
    const result = await PatientHome();
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(4500);
    expect(end - start).toBeLessThan(6000);

    const resultStr = util.inspect(result, { depth: null });
    expect(resultStr).toContain("Taking a moment");
    expect(resultStr).toContain("dashboard is loading slowly");
  }, 15000);
});

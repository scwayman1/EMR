import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    organization: {
      findUnique: vi.fn(),
    },
    practice: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
  return {
    mockPrisma,
    mockRequireImplementationAdmin: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/auth/super-admin", () => ({
  requireImplementationAdmin: hoisted.mockRequireImplementationAdmin,
}));

import { GET, POST } from "./route";

describe("GET /api/practices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user is not an implementation admin", async () => {
    hoisted.mockRequireImplementationAdmin.mockRejectedValue(new Error("FORBIDDEN"));

    const req = new Request("https://example.com/api/practices");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it("searches and returns practices successfully", async () => {
    hoisted.mockRequireImplementationAdmin.mockResolvedValue({ id: "admin-1" });
    const mockPractices = [
      {
        id: "practice-1",
        name: "Denver Office",
        organizationId: "org-1",
        organization: {
          id: "org-1",
          name: "True Bloom",
          legalName: "True Bloom LLC",
          brandName: "True Bloom",
        },
      },
    ];
    hoisted.mockPrisma.practice.findMany.mockResolvedValue(mockPractices);

    const req = new Request("https://example.com/api/practices?orgId=org-1&q=Denver");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.practices).toHaveLength(1);
    expect(body.practices[0].name).toBe("Denver Office");
    expect(hoisted.mockPrisma.practice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-1",
          name: { contains: "Denver", mode: "insensitive" },
        },
      })
    );
  });
});

describe("POST /api/practices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user is not an implementation admin", async () => {
    hoisted.mockRequireImplementationAdmin.mockRejectedValue(new Error("FORBIDDEN"));

    const req = new Request("https://example.com/api/practices", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("returns 400 on invalid input", async () => {
    hoisted.mockRequireImplementationAdmin.mockResolvedValue({ id: "admin-1" });

    const req = new Request("https://example.com/api/practices", {
      method: "POST",
      body: JSON.stringify({
        organizationId: "",
        name: "Denver Office",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_input");
  });

  it("returns 404 if organization does not exist", async () => {
    hoisted.mockRequireImplementationAdmin.mockResolvedValue({ id: "admin-1" });
    hoisted.mockPrisma.organization.findUnique.mockResolvedValue(null);

    const req = new Request("https://example.com/api/practices", {
      method: "POST",
      body: JSON.stringify({
        organizationId: "nonexistent-org",
        name: "Denver Office",
        street: "123 Main St",
        city: "Denver",
        state: "CO",
        postalCode: "80202",
        timeZone: "America/Denver",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("organization_not_found");
  });

  it("creates practice successfully", async () => {
    hoisted.mockRequireImplementationAdmin.mockResolvedValue({ id: "admin-1" });
    hoisted.mockPrisma.organization.findUnique.mockResolvedValue({ id: "org-1" });
    hoisted.mockPrisma.practice.create.mockResolvedValue({
      id: "new-practice-1",
      name: "Denver Office",
      organizationId: "org-1",
    });

    const req = new Request("https://example.com/api/practices", {
      method: "POST",
      body: JSON.stringify({
        organizationId: "org-1",
        name: "Denver Office",
        street: "123 Main St",
        city: "Denver",
        state: "CO",
        postalCode: "80202",
        timeZone: "America/Denver",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.practice.id).toBe("new-practice-1");
    expect(hoisted.mockPrisma.practice.create).toHaveBeenCalled();
  });
});

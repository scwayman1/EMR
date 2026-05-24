import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    dispensaryDispense: {
      findMany: vi.fn(),
    },
  };
  return {
    mockPrisma,
    mockGetCurrentUser: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: hoisted.mockGetCurrentUser,
}));

import { GET } from "./route";

describe("GET /api/dispensary/dispenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is unauthorized", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue(null);

    const req = new Request("https://example.com/api/dispensary/dispenses?patientId=p-1");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 when patientId is missing", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue({ id: "user-1" });

    const req = new Request("https://example.com/api/dispensary/dispenses");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("returns dispensary dispenses successfully", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    const mockDispenses = [
      {
        id: "dispense-1",
        productName: "Indica Flower",
        productSku: "SKU-99",
        quantity: 2,
        dispensedAt: new Date("2026-05-24T00:00:00.000Z"),
      },
    ];
    hoisted.mockPrisma.dispensaryDispense.findMany.mockResolvedValue(mockDispenses);

    const req = new Request("https://example.com/api/dispensary/dispenses?patientId=p-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].productName).toBe("Indica Flower");
  });
});

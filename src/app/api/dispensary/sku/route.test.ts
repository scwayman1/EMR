// EMR-002 — Tests for GET /api/dispensary/sku

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    dispensarySku: {
      findFirst: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import { GET } from "./route";

function makeRequest(query: Record<string, string>): Request {
  const params = new URLSearchParams(query);
  return new Request(`https://example.com/api/dispensary/sku?${params.toString()}`);
}

describe("GET /api/dispensary/sku", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when sku query param is missing", async () => {
    const req = new Request("https://example.com/api/dispensary/sku");

    const res = await GET(req);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("sku_required");
    expect(hoisted.mockPrisma.dispensarySku.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 when sku query param is blank", async () => {
    const req = makeRequest({ sku: "   " });

    const res = await GET(req);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("sku_required");
  });

  it("returns 404 when no active SKU matches", async () => {
    hoisted.mockPrisma.dispensarySku.findFirst.mockResolvedValue(null);

    const req = makeRequest({ sku: "missing-sku" });

    const res = await GET(req);

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("sku_not_found");
    expect(hoisted.mockPrisma.dispensarySku.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sku: "missing-sku", active: true },
      }),
    );
  });

  it("returns SKU details when found", async () => {
    const row = {
      id: "sku-row-1",
      dispensaryId: "disp-1",
      sku: "ABC-123",
      upc: "012345678905",
      name: "Sleep Tincture 30mL",
      brand: "LeafCo",
      format: "tincture",
      strainType: "hybrid",
      thcMgPerUnit: 5,
      cbdMgPerUnit: 10,
      thcPercent: 0.1,
      cbdPercent: 0.2,
      packSize: "30mL",
      priceCents: 4500,
      inStock: true,
      inventoryCount: 12,
      imageUrl: "https://cdn/img.png",
      coaUrl: "https://cdn/coa.pdf",
      description: "A nice tincture",
    };
    hoisted.mockPrisma.dispensarySku.findFirst.mockResolvedValue(row);

    const req = makeRequest({ sku: "ABC-123" });

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      sku: "ABC-123",
      format: "tincture",
      brand: "LeafCo",
      name: "Sleep Tincture 30mL",
      thcPercent: 0.1,
      cbdPercent: 0.2,
      thcMgPerUnit: 5,
      cbdMgPerUnit: 10,
      priceCents: 4500,
      inStock: true,
    });
    expect(hoisted.mockPrisma.dispensarySku.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sku: "ABC-123", active: true },
      }),
    );
  });
});

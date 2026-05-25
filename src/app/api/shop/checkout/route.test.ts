import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockTx = {
    order: {
      create: vi.fn(),
    },
    dispensary: {
      findUnique: vi.fn(),
    },
    dispensarySku: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    dispensaryDispense: {
      create: vi.fn(),
    },
  };

  const mockPrisma = {
    patient: {
      findFirst: vi.fn(),
    },
    medicalCannabisCard: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockTx)),
  };

  return {
    mockPrisma,
    mockTx,
    mockGetCurrentUser: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: hoisted.mockGetCurrentUser,
}));

import { POST } from "./route";

describe("POST /api/shop/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not logged in", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue(null);

    const req = new Request("https://example.com/api/shop/checkout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "You must be signed in to check out." });
  });

  it("returns 404 when patient profile does not exist", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    hoisted.mockPrisma.patient.findFirst.mockResolvedValue(null);

    const req = new Request("https://example.com/api/shop/checkout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Patient profile not found." });
  });

  it("returns 400 when cart is empty", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    hoisted.mockPrisma.patient.findFirst.mockResolvedValue({ id: "pat-1", organizationId: "org-1" });

    const req = new Request("https://example.com/api/shop/checkout", {
      method: "POST",
      body: JSON.stringify({ items: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cart is empty." });
  });

  it("successfully places order and logs dispense details", async () => {
    hoisted.mockGetCurrentUser.mockResolvedValue({ id: "user-1" });
    hoisted.mockPrisma.patient.findFirst.mockResolvedValue({ id: "pat-1", organizationId: "org-1" });
    hoisted.mockPrisma.medicalCannabisCard.findFirst.mockResolvedValue({ id: "card-1" });

    const mockOrder = { id: "order-123", status: "confirmed" };
    hoisted.mockTx.order.create.mockResolvedValue(mockOrder);
    hoisted.mockTx.dispensary.findUnique.mockResolvedValue({ id: "disp-1", name: "Zen Leaf" });
    hoisted.mockTx.dispensarySku.findFirst.mockResolvedValue({ id: "sku-1", sku: "SKU-99", name: "Indica Flower" });

    const req = new Request("https://example.com/api/shop/checkout", {
      method: "POST",
      body: JSON.stringify({
        items: [{ productId: "p-1", name: "Indica Flower", price: 50.0, quantity: 2 }],
        subtotal: 100.0,
        tax: 8.0,
        total: 108.0,
        fulfillmentType: "pickup",
        dispensaryId: "disp-1",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      success: true,
      orderId: "order-123",
      status: "confirmed",
    });

    expect(hoisted.mockTx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: "pat-1",
          subtotal: 100.0,
          total: 108.0,
        }),
      })
    );

    expect(hoisted.mockTx.dispensaryDispense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: "pat-1",
          skuId: "sku-1",
          productName: "Indica Flower",
          quantity: 2,
        }),
      })
    );
  });
});

// EMR-002 — Tests for POST /api/dispensary/ingest

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    dispensary: {
      findUnique: vi.fn(),
    },
    dispensarySku: {
      findMany: vi.fn(),
    },
  };

  const ingestDispensaryCatalog = vi.fn();
  const prismaDispensaryStorage = { __stub: true };

  return { mockPrisma, ingestDispensaryCatalog, prismaDispensaryStorage };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

vi.mock("@/lib/dispensary", () => ({
  ingestDispensaryCatalog: hoisted.ingestDispensaryCatalog,
  prismaDispensaryStorage: hoisted.prismaDispensaryStorage,
}));

import { POST } from "./route";

const VALID_SKU = {
  sku: "abc-1",
  name: "Sleep Tincture 30mL",
  format: "tincture" as const,
  priceCents: 4500,
  inStock: true,
};

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/dispensary/ingest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/dispensary/ingest", () => {
  const originalSecret = process.env.DISPENSARY_INGEST_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISPENSARY_INGEST_SECRET = "shh-it-is-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.DISPENSARY_INGEST_SECRET;
    } else {
      process.env.DISPENSARY_INGEST_SECRET = originalSecret;
    }
  });

  it("rejects requests without the dispensary secret header", async () => {
    const req = makeRequest({
      dispensaryId: "disp-1",
      syncedAt: "2026-05-24T00:00:00Z",
      skus: [VALID_SKU],
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(hoisted.mockPrisma.dispensary.findUnique).not.toHaveBeenCalled();
  });

  it("rejects requests with a wrong dispensary secret header", async () => {
    const req = makeRequest(
      {
        dispensaryId: "disp-1",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [VALID_SKU],
      },
      { "x-dispensary-secret": "nope" },
    );

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects when DISPENSARY_INGEST_SECRET is not configured", async () => {
    delete process.env.DISPENSARY_INGEST_SECRET;

    const req = makeRequest(
      {
        dispensaryId: "disp-1",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [VALID_SKU],
      },
      { "x-dispensary-secret": "shh-it-is-secret" },
    );

    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("rejects payloads that fail schema validation", async () => {
    const req = makeRequest(
      {
        dispensaryId: "disp-1",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [{ ...VALID_SKU, format: "not-a-format" }],
      },
      { "x-dispensary-secret": "shh-it-is-secret" },
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_payload");
    expect(typeof body.detail).toBe("string");
    expect(hoisted.mockPrisma.dispensary.findUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when the dispensary doesn't exist", async () => {
    hoisted.mockPrisma.dispensary.findUnique.mockResolvedValue(null);

    const req = makeRequest(
      {
        dispensaryId: "missing",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [VALID_SKU],
      },
      { "x-dispensary-secret": "shh-it-is-secret" },
    );

    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "dispensary_not_found" });
    expect(hoisted.ingestDispensaryCatalog).not.toHaveBeenCalled();
  });

  it("returns 409 when the dispensary is inactive", async () => {
    hoisted.mockPrisma.dispensary.findUnique.mockResolvedValue({
      id: "disp-1",
      status: "inactive",
    });

    const req = makeRequest(
      {
        dispensaryId: "disp-1",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [VALID_SKU],
      },
      { "x-dispensary-secret": "shh-it-is-secret" },
    );

    const res = await POST(req);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "dispensary_inactive" });
    expect(hoisted.ingestDispensaryCatalog).not.toHaveBeenCalled();
  });

  it("returns 409 when the dispensary is pending", async () => {
    hoisted.mockPrisma.dispensary.findUnique.mockResolvedValue({
      id: "disp-1",
      status: "pending",
    });

    const req = makeRequest(
      {
        dispensaryId: "disp-1",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [VALID_SKU],
      },
      { "x-dispensary-secret": "shh-it-is-secret" },
    );

    const res = await POST(req);

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "dispensary_inactive" });
  });

  it("runs the ingest and returns its summary on success", async () => {
    hoisted.mockPrisma.dispensary.findUnique.mockResolvedValue({
      id: "disp-1",
      status: "active",
    });
    const summary = {
      dispensaryId: "disp-1",
      syncedAt: "2026-05-24T00:00:00Z",
      received: 1,
      created: 1,
      updated: 0,
      delisted: 0,
      errors: [],
    };
    hoisted.ingestDispensaryCatalog.mockResolvedValue({ summary });

    const req = makeRequest(
      {
        dispensaryId: "disp-1",
        syncedAt: "2026-05-24T00:00:00Z",
        skus: [VALID_SKU],
      },
      { "x-dispensary-secret": "shh-it-is-secret" },
    );

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, summary });
    expect(hoisted.ingestDispensaryCatalog).toHaveBeenCalledWith(
      hoisted.prismaDispensaryStorage,
      expect.objectContaining({
        dispensaryId: "disp-1",
        skus: [expect.objectContaining({ sku: "abc-1" })],
      }),
    );
  });
});

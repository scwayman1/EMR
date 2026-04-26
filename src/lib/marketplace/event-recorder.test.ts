import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    marketplaceEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import {
  recordEvent,
  recordEventAsync,
  recordEventBatch,
  getEventCounts,
} from "./event-recorder";

describe("recordEvent", () => {
  beforeEach(() => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockReset();
    hoisted.mockPrisma.marketplaceEvent.create.mockReset();
  });

  it("creates a fresh event row when no recent duplicate exists", async () => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockResolvedValue(null);
    hoisted.mockPrisma.marketplaceEvent.create.mockResolvedValue({ id: "evt_1" });

    const id = await recordEvent({
      organizationId: "org_1",
      patientId: "pat_1",
      productId: "prod_1",
      eventType: "purchase",
      metadata: { orderId: "ord_1" },
    });

    expect(id).toBe("evt_1");
    expect(hoisted.mockPrisma.marketplaceEvent.create).toHaveBeenCalledTimes(1);
    const arg = hoisted.mockPrisma.marketplaceEvent.create.mock.calls[0][0];
    expect(arg.data.organizationId).toBe("org_1");
    expect(arg.data.patientId).toBe("pat_1");
    expect(arg.data.eventType).toBe("purchase");
  });

  it("returns the existing id when a duplicate event exists within the 5s window", async () => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockResolvedValue({ id: "evt_existing" });

    const id = await recordEvent({
      organizationId: "org_1",
      patientId: "pat_1",
      productId: "prod_1",
      eventType: "purchase",
    });

    expect(id).toBe("evt_existing");
    expect(hoisted.mockPrisma.marketplaceEvent.create).not.toHaveBeenCalled();
  });

  it("does not dedupe pseudonymous events (no patientId)", async () => {
    hoisted.mockPrisma.marketplaceEvent.create.mockResolvedValue({ id: "evt_2" });

    await recordEvent({
      organizationId: "org_1",
      productId: "prod_1",
      eventType: "purchase",
    });

    expect(hoisted.mockPrisma.marketplaceEvent.findFirst).not.toHaveBeenCalled();
    expect(hoisted.mockPrisma.marketplaceEvent.create).toHaveBeenCalledTimes(1);
  });

  it("uses an ISO date 5s in the past as the idempotency window boundary", async () => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockResolvedValue(null);
    hoisted.mockPrisma.marketplaceEvent.create.mockResolvedValue({ id: "evt_3" });

    const before = Date.now();
    await recordEvent({
      organizationId: "org_1",
      patientId: "pat_1",
      productId: "prod_1",
      eventType: "regimen_start",
    });
    const after = Date.now();

    const findFirstArg = hoisted.mockPrisma.marketplaceEvent.findFirst.mock.calls[0][0];
    const sinceMs = findFirstArg.where.createdAt.gte.getTime();
    // Should be ~5s before "now" — between (before-5s) and (after-5s).
    expect(sinceMs).toBeGreaterThanOrEqual(before - 5_000);
    expect(sinceMs).toBeLessThanOrEqual(after - 5_000 + 5);
  });
});

describe("recordEventBatch", () => {
  beforeEach(() => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockReset();
    hoisted.mockPrisma.marketplaceEvent.create.mockReset();
  });

  it("returns one id per input", async () => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockResolvedValue(null);
    hoisted.mockPrisma.marketplaceEvent.create
      .mockResolvedValueOnce({ id: "a" })
      .mockResolvedValueOnce({ id: "b" });

    const ids = await recordEventBatch([
      { organizationId: "org_1", productId: "p1", eventType: "purchase" },
      { organizationId: "org_1", productId: "p2", eventType: "purchase" },
    ]);

    expect(ids).toEqual(["a", "b"]);
  });
});

describe("recordEventAsync", () => {
  beforeEach(() => {
    hoisted.mockPrisma.marketplaceEvent.findFirst.mockReset();
    hoisted.mockPrisma.marketplaceEvent.create.mockReset();
  });

  it("does not throw on DB failure", async () => {
    hoisted.mockPrisma.marketplaceEvent.create.mockRejectedValue(new Error("db down"));
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      recordEventAsync({
        organizationId: "org_1",
        productId: "prod_1",
        eventType: "purchase",
      }),
    ).not.toThrow();

    // Allow the microtask to resolve so console.error gets called.
    await new Promise((r) => setTimeout(r, 5));
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});

describe("getEventCounts", () => {
  it("returns a snapshot object (does not throw on empty)", () => {
    const snapshot = getEventCounts();
    expect(typeof snapshot).toBe("object");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma mock — hoisted so vi.mock's factory can reach it.
const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    patient: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    outcomeLog: { findMany: vi.fn() },
    patientMemory: { findMany: vi.fn() },
    dosingRegimen: { findMany: vi.fn() },
    orderItem: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import {
  rankProductsForPatient,
  WEIGHT_CONDITION_PER_HIT,
  WEIGHT_CLINICIAN_PICK,
  WEIGHT_IN_STOCK_AND_RATED,
  WEIGHT_IN_STOCK_ONLY,
  WEIGHT_BEGINNER_SAFETY,
  WEIGHT_PRODUCT_EFFICACY,
} from "./ranking";

// Build a Product row that satisfies the fields the mapper reads.
function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "p1",
    name: "Demo Product",
    brand: "Demo Brand",
    description: "",
    shortDescription: null,
    price: 40,
    compareAtPrice: null,
    status: "active",
    format: "tincture",
    imageUrl: null,
    images: [],
    thcContent: null,
    cbdContent: null,
    cbnContent: null,
    thcvContent: null,
    terpeneProfile: null,
    strainType: null,
    symptoms: [],
    goals: [],
    useCases: [],
    onsetTime: null,
    duration: null,
    dosageGuidance: null,
    beginnerFriendly: false,
    labVerified: false,
    coaUrl: null,
    clinicianPick: false,
    clinicianNote: null,
    inStock: false,
    inventoryCount: 0,
    averageRating: 0,
    reviewCount: 0,
    sortOrder: 0,
    featured: false,
    organizationId: "org_1",
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [],
    reviews: [],
    categoryMappings: [],
    ...overrides,
  };
}

function resetMocks() {
  hoisted.mockPrisma.patient.findUnique.mockReset();
  hoisted.mockPrisma.product.findMany.mockReset();
  hoisted.mockPrisma.outcomeLog.findMany.mockReset();
  hoisted.mockPrisma.patientMemory.findMany.mockReset();
  hoisted.mockPrisma.dosingRegimen.findMany.mockReset();
  hoisted.mockPrisma.orderItem.findMany.mockReset();
}

// Sensible empty defaults — tests override only what they care about.
function primeEmpty(patientOrg = "org_1") {
  hoisted.mockPrisma.patient.findUnique.mockResolvedValue({
    id: "pat_1",
    organizationId: patientOrg,
  });
  hoisted.mockPrisma.outcomeLog.findMany.mockResolvedValue([]);
  hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([]);
  hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([]);
  hoisted.mockPrisma.orderItem.findMany.mockResolvedValue([]);
}

beforeEach(resetMocks);

describe("rankProductsForPatient", () => {
  it("returns [] when the patient does not exist", async () => {
    hoisted.mockPrisma.patient.findUnique.mockResolvedValue(null);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    const result = await rankProductsForPatient("nope");
    expect(result).toEqual([]);
  });

  it("returns [] when there are no products (empty DB, no crash)", async () => {
    primeEmpty();
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    const result = await rankProductsForPatient("pat_1");
    expect(result).toEqual([]);
  });

  it("boosts a Sleep product when the patient has a recent low sleep score", async () => {
    primeEmpty();
    hoisted.mockPrisma.outcomeLog.findMany.mockImplementation(
      async (args: { where?: { loggedAt?: unknown } }) => {
        // The recent-window query is the one with `loggedAt: { gte }`.
        if (args?.where?.loggedAt) {
          return [{ metric: "sleep", value: 2, loggedAt: new Date() }];
        }
        return [];
      },
    );
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({
        id: "sleep-1",
        slug: "sleep-1",
        name: "Sleep Tincture",
        goals: ["Sleep"],
        inStock: true,
        averageRating: 4.0,
      }),
    ]);

    const result = await rankProductsForPatient("pat_1");
    expect(result).toHaveLength(1);
    expect(result[0].product.id).toBe("sleep-1");
    // condition match (Sleep) + in-stock-only
    expect(result[0].score).toBe(
      WEIGHT_CONDITION_PER_HIT + WEIGHT_IN_STOCK_ONLY,
    );
    expect(result[0].reasons.some((r) => r.includes("Sleep"))).toBe(true);
  });

  it("awards clinician pick + in-stock-and-rated correctly", async () => {
    primeEmpty();
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({
        id: "pick-1",
        slug: "pick-1",
        clinicianPick: true,
        inStock: true,
        averageRating: 4.7,
      }),
    ]);

    const result = await rankProductsForPatient("pat_1");
    expect(result).toHaveLength(1);
    // Patient has no prior regimens and product isn't beginnerFriendly, so
    // just the two signals fire.
    expect(result[0].score).toBe(
      WEIGHT_CLINICIAN_PICK + WEIGHT_IN_STOCK_AND_RATED,
    );
    expect(result[0].reasons).toContain("clinician pick");
  });

  it("drops products the patient has already ordered", async () => {
    primeEmpty();
    hoisted.mockPrisma.orderItem.findMany.mockResolvedValue([
      { productId: "owned" },
    ]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({
        id: "owned",
        slug: "owned",
        clinicianPick: true,
        inStock: true,
        averageRating: 4.9,
      }),
      productRow({
        id: "fresh",
        slug: "fresh",
        clinicianPick: true,
        inStock: true,
        averageRating: 4.9,
      }),
    ]);

    const result = await rankProductsForPatient("pat_1");
    expect(result.map((r) => r.product.id)).toEqual(["fresh"]);
  });

  it("produces a deterministic, correctly-summed score for a composed scenario", async () => {
    hoisted.mockPrisma.patient.findUnique.mockResolvedValue({
      id: "pat_1",
      organizationId: "org_1",
    });
    // Recent outcomes: high pain + low sleep.
    hoisted.mockPrisma.outcomeLog.findMany.mockImplementation(
      async (args: { where?: { loggedAt?: unknown } }) => {
        if (args?.where?.loggedAt) {
          return [
            { metric: "pain", value: 8, loggedAt: new Date() },
            { metric: "sleep", value: 2, loggedAt: new Date() },
          ];
        }
        // All-time logs — before + after regimen window for efficacy signal.
        return [
          {
            metric: "pain",
            value: 8,
            loggedAt: new Date("2026-03-01T00:00:00Z"),
          },
          {
            metric: "pain",
            value: 3,
            loggedAt: new Date("2026-03-20T00:00:00Z"),
          },
        ];
      },
    );
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([]);
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      {
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-25T00:00:00Z"),
        product: {
          name: "Relief Oil",
          brand: "Demo Brand",
          marketplaceProductId: null, // forces fallback to name-match
        },
      },
    ]);
    hoisted.mockPrisma.orderItem.findMany.mockResolvedValue([]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({
        id: "relief",
        slug: "relief",
        name: "Relief Oil", // matches the regimen (normalizeName)
        brand: "Demo Brand",
        symptoms: ["Pain"],
        goals: ["Sleep"],
        clinicianPick: true,
        inStock: true,
        averageRating: 4.8,
        beginnerFriendly: true,
      }),
    ]);

    const result = await rankProductsForPatient("pat_1");
    expect(result).toHaveLength(1);
    const r = result[0];

    // 2 condition hits (Pain + Sleep) = 20
    // efficacy bridge match (pain 8→3) = 30
    // clinician pick = 15
    // in-stock + rating 4.8 = 15
    // has prior regimens → beginner safety NOT awarded
    const expected =
      WEIGHT_CONDITION_PER_HIT * 2 +
      WEIGHT_PRODUCT_EFFICACY +
      WEIGHT_CLINICIAN_PICK +
      WEIGHT_IN_STOCK_AND_RATED;
    expect(r.score).toBe(expected);
    expect(r.reasons.some((s) => s.includes("pain 8→3"))).toBe(true);
    expect(r.reasons.some((s) => s.includes("clinician pick"))).toBe(true);
  });

  it("bridges efficacy via marketplaceProductId FK even when names differ (EMR-268)", async () => {
    hoisted.mockPrisma.patient.findUnique.mockResolvedValue({
      id: "pat_1",
      organizationId: "org_1",
    });
    hoisted.mockPrisma.outcomeLog.findMany.mockImplementation(
      async (args: { where?: { loggedAt?: unknown } }) => {
        if (args?.where?.loggedAt) {
          return []; // no recent outcomes → no condition match
        }
        return [
          {
            metric: "pain",
            value: 8,
            loggedAt: new Date("2026-03-01T00:00:00Z"),
          },
          {
            metric: "pain",
            value: 3,
            loggedAt: new Date("2026-03-20T00:00:00Z"),
          },
        ];
      },
    );
    hoisted.mockPrisma.patientMemory.findMany.mockResolvedValue([]);
    hoisted.mockPrisma.orderItem.findMany.mockResolvedValue([]);
    // Clinical product has a totally different name from the marketplace
    // product, but the FK ties them together — the ranking engine should
    // still award the efficacy boost.
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      {
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-25T00:00:00Z"),
        product: {
          name: "Clinical THC Oil 10mg/mL", // doesn't match marketplace name
          brand: null,
          marketplaceProductId: "mkt-a", // but the FK does
        },
      },
    ]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({
        id: "mkt-a",
        slug: "calm-drops",
        name: "Calm & Clarity Drops",
        brand: "Solace Botanicals",
      }),
    ]);

    const result = await rankProductsForPatient("pat_1");
    expect(result).toHaveLength(1);
    expect(result[0].product.id).toBe("mkt-a");
    expect(result[0].score).toBe(WEIGHT_PRODUCT_EFFICACY);
    expect(result[0].reasons.some((s) => s.includes("pain 8→3"))).toBe(true);
  });

  it("awards beginner safety only when patient has no prior regimens", async () => {
    primeEmpty();
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({
        id: "starter",
        slug: "starter",
        beginnerFriendly: true,
        inStock: true,
        averageRating: 4.2,
      }),
    ]);

    const result = await rankProductsForPatient("pat_1");
    expect(result[0].score).toBe(WEIGHT_BEGINNER_SAFETY + WEIGHT_IN_STOCK_ONLY);
    expect(
      result[0].reasons.some((s) => s.toLowerCase().includes("beginner")),
    ).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    dosingRegimen: { findMany: vi.fn() },
    product: { findMany: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import {
  getPopularProductsInCohort,
  MIN_COHORT_SIZE,
} from "./cohort-insights";

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
    inStock: true,
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

function reset() {
  hoisted.mockPrisma.dosingRegimen.findMany.mockReset();
  hoisted.mockPrisma.product.findMany.mockReset();
}
beforeEach(reset);

describe("getPopularProductsInCohort", () => {
  it("returns [] when the cohort is empty (no queries fire)", async () => {
    const result = await getPopularProductsInCohort([], {
      organizationId: "org_1",
    });
    expect(result).toEqual([]);
    expect(hoisted.mockPrisma.dosingRegimen.findMany).not.toHaveBeenCalled();
    expect(hoisted.mockPrisma.product.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when no cohort member has a linked active regimen", async () => {
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([]);
    const result = await getPopularProductsInCohort(["p1", "p2", "p3"], {
      organizationId: "org_1",
    });
    expect(result).toEqual([]);
    // product.findMany should not fire when there's nothing to hydrate.
    expect(hoisted.mockPrisma.product.findMany).not.toHaveBeenCalled();
  });

  it("counts distinct cohort members per marketplace product and sorts desc", async () => {
    // p1 uses product A (two regimens — still counts once); p2 uses A + B;
    // p3 uses B only. Expect A=2, B=2 — tie-broken by product name asc.
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      { patientId: "p1", product: { marketplaceProductId: "mkt-a" } },
      { patientId: "p1", product: { marketplaceProductId: "mkt-a" } },
      { patientId: "p2", product: { marketplaceProductId: "mkt-a" } },
      { patientId: "p2", product: { marketplaceProductId: "mkt-b" } },
      { patientId: "p3", product: { marketplaceProductId: "mkt-b" } },
    ]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({ id: "mkt-a", slug: "alpha", name: "Alpha" }),
      productRow({ id: "mkt-b", slug: "bravo", name: "Bravo" }),
    ]);

    const result = await getPopularProductsInCohort(["p1", "p2", "p3"], {
      organizationId: "org_1",
    });

    expect(result).toHaveLength(2);
    expect(result[0].product.id).toBe("mkt-a"); // A before B on name tiebreak
    expect(result[0].regimenCount).toBe(2);
    expect(result[1].product.id).toBe("mkt-b");
    expect(result[1].regimenCount).toBe(2);
  });

  it("skips regimens with no marketplace FK (filtered in the Prisma WHERE)", async () => {
    // Simulate that the Prisma `where` filter already excludes null-FK rows.
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      { patientId: "p1", product: { marketplaceProductId: "mkt-a" } },
      { patientId: "p2", product: { marketplaceProductId: "mkt-a" } },
    ]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({ id: "mkt-a", slug: "alpha", name: "Alpha" }),
    ]);

    const result = await getPopularProductsInCohort(["p1", "p2"], {
      organizationId: "org_1",
    });

    expect(result).toHaveLength(1);
    const whereArg =
      hoisted.mockPrisma.dosingRegimen.findMany.mock.calls[0][0].where;
    expect(whereArg.product.marketplaceProductId).toEqual({ not: null });
    expect(whereArg.active).toBe(true);
  });

  it("honors limit + drops products not hydrated by the org-scoped query", async () => {
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      { patientId: "p1", product: { marketplaceProductId: "mkt-a" } },
      { patientId: "p2", product: { marketplaceProductId: "mkt-b" } },
      { patientId: "p3", product: { marketplaceProductId: "mkt-c" } },
      { patientId: "p4", product: { marketplaceProductId: "mkt-d" } },
    ]);
    // Only 3 of the 4 IDs hydrate (mkt-d is archived/different-org/deleted).
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({ id: "mkt-a", slug: "alpha", name: "Alpha" }),
      productRow({ id: "mkt-b", slug: "bravo", name: "Bravo" }),
      productRow({ id: "mkt-c", slug: "charlie", name: "Charlie" }),
    ]);

    const result = await getPopularProductsInCohort(
      ["p1", "p2", "p3", "p4"],
      { organizationId: "org_1", limit: 2 },
    );

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.product.id !== "mkt-d")).toBe(true);
  });

  it("scopes the marketplace hydrate query to the caller's org + active status", async () => {
    hoisted.mockPrisma.dosingRegimen.findMany.mockResolvedValue([
      { patientId: "p1", product: { marketplaceProductId: "mkt-a" } },
    ]);
    hoisted.mockPrisma.product.findMany.mockResolvedValue([
      productRow({ id: "mkt-a", slug: "alpha", name: "Alpha" }),
    ]);

    await getPopularProductsInCohort(["p1"], { organizationId: "org_xyz" });

    const where = hoisted.mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe("org_xyz");
    expect(where.deletedAt).toBeNull();
    expect(where.status).toBe("active");
    expect(where.id).toEqual({ in: ["mkt-a"] });
  });

  it("exports a min-cohort-size constant the widget can honor", () => {
    expect(MIN_COHORT_SIZE).toBeGreaterThanOrEqual(3);
  });
});

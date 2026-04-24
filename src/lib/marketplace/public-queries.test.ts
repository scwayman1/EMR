import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    product: { findMany: vi.fn(), findFirst: vi.fn() },
    marketplaceCategory: { findMany: vi.fn(), findUnique: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import {
  getPublicFeaturedProducts,
  getPublicProductBySlug,
  getAllPublicProducts,
  getPublicProductsByCategory,
  searchPublicProducts,
  getPublicCategories,
} from "./public-queries";

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "p1",
    name: "Demo Product",
    brand: "Demo Brand",
    description: "A description",
    shortDescription: "short",
    price: 42,
    compareAtPrice: null,
    status: "active",
    format: "tincture",
    imageUrl: null,
    images: [],
    thcContent: 5,
    cbdContent: 20,
    cbnContent: null,
    terpeneProfile: { myrcene: 0.4 },
    strainType: "indica",
    symptoms: ["Sleep"],
    goals: ["Calm"],
    useCases: ["evening"],
    onsetTime: "20-40 min",
    duration: "6-8 hr",
    dosageGuidance: "INTERNAL guidance do not leak",
    beginnerFriendly: true,
    labVerified: true,
    coaUrl: "https://example.com/coa",
    clinicianPick: true,
    clinicianNote: "INTERNAL NOTE DO NOT LEAK",
    inStock: true,
    inventoryCount: 5,
    averageRating: 4.5,
    reviewCount: 12,
    sortOrder: 0,
    featured: true,
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
  hoisted.mockPrisma.product.findMany.mockReset();
  hoisted.mockPrisma.product.findFirst.mockReset();
  hoisted.mockPrisma.marketplaceCategory.findMany.mockReset();
  hoisted.mockPrisma.marketplaceCategory.findUnique.mockReset();
}
beforeEach(reset);

describe("public-queries: field stripping", () => {
  it("strips clinicianNote and dosageGuidance from the public surface", async () => {
    hoisted.mockPrisma.product.findFirst.mockResolvedValue(productRow());
    const result = await getPublicProductBySlug("p1");
    expect(result).toBeDefined();
    expect(result?.clinicianNote).toBeUndefined();
    expect(result?.dosageGuidance).toBeUndefined();
  });

  it("preserves patient-safe fields on the public surface", async () => {
    hoisted.mockPrisma.product.findFirst.mockResolvedValue(productRow());
    const result = await getPublicProductBySlug("p1");
    expect(result?.name).toBe("Demo Product");
    expect(result?.brand).toBe("Demo Brand");
    expect(result?.symptoms).toEqual(["Sleep"]);
    expect(result?.coaUrl).toBe("https://example.com/coa");
    expect(result?.thcContent).toBe(5);
    expect(result?.cbdContent).toBe(20);
    expect(result?.terpeneProfile).toEqual({ myrcene: 0.4 });
  });
});

describe("public-queries: filter criteria", () => {
  it("enforces status=active + deletedAt=null on all list queries", async () => {
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    await getAllPublicProducts();
    const where = hoisted.mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("active");
    expect(where.deletedAt).toBeNull();
    // NOT org-scoped — Leafmart is platform-wide.
    expect(where.organizationId).toBeUndefined();
  });

  it("featured query filters to featured=true", async () => {
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    await getPublicFeaturedProducts(4);
    const where = hoisted.mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(where.featured).toBe(true);
    expect(
      hoisted.mockPrisma.product.findMany.mock.calls[0][0].take,
    ).toBe(4);
  });

  it("category query joins through ProductCategory → MarketplaceCategory slug", async () => {
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    await getPublicProductsByCategory("sleep");
    const where = hoisted.mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(where.categoryMappings.some.category.slug).toBe("sleep");
  });

  it("search with empty query returns all active products (no OR clause)", async () => {
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    await searchPublicProducts("");
    const where = hoisted.mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
    expect(where.status).toBe("active");
  });

  it("search with query OR's across name/brand/description/symptoms/goals/format", async () => {
    hoisted.mockPrisma.product.findMany.mockResolvedValue([]);
    await searchPublicProducts("sleep");
    const where = hoisted.mockPrisma.product.findMany.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(6);
  });
});

describe("public-queries: categories", () => {
  it("getPublicCategories with no type returns all (no where filter)", async () => {
    hoisted.mockPrisma.marketplaceCategory.findMany.mockResolvedValue([]);
    await getPublicCategories();
    const where =
      hoisted.mockPrisma.marketplaceCategory.findMany.mock.calls[0][0].where;
    expect(where).toEqual({});
  });

  it("getPublicCategories with type filter applies where.type", async () => {
    hoisted.mockPrisma.marketplaceCategory.findMany.mockResolvedValue([]);
    await getPublicCategories("symptom");
    const where =
      hoisted.mockPrisma.marketplaceCategory.findMany.mock.calls[0][0].where;
    expect(where.type).toBe("symptom");
  });

  it("categories hydrate product counts scoped to active + non-deleted products", async () => {
    hoisted.mockPrisma.marketplaceCategory.findMany.mockResolvedValue([
      {
        id: "c1",
        name: "Sleep",
        slug: "sleep",
        description: null,
        type: "symptom",
        icon: null,
        _count: { products: 3 },
      },
    ]);
    const result = await getPublicCategories("symptom");
    expect(result[0].productCount).toBe(3);
    const productsFilter =
      hoisted.mockPrisma.marketplaceCategory.findMany.mock.calls[0][0].include
        ._count.select.products;
    expect(productsFilter.where.product.status).toBe("active");
    expect(productsFilter.where.product.deletedAt).toBeNull();
  });
});

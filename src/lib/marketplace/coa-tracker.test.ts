import { describe, it, expect } from "vitest";
import {
  canPublishProduct,
  reminderBucketFor,
  computeCoaSweep,
  COA_REMINDER_DAYS_AHEAD,
} from "./coa-tracker";
import type { Product, VendorDocument } from "@prisma/client";

const NOW = new Date("2026-04-26T12:00:00.000Z");

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    organizationId: "org_1",
    name: "P",
    slug: "p",
    brand: "B",
    description: "",
    shortDescription: null,
    price: 10,
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
    bgColor: null,
    deepColor: null,
    displayShape: null,
    doseLabel: null,
    outcomePct: null,
    outcomeSampleSize: null,
    labVerified: false,
    coaUrl: null,
    coaDocumentId: null,
    clinicianPick: false,
    clinicianNote: null,
    requires21Plus: false,
    inStock: true,
    inventoryCount: 0,
    averageRating: 0,
    reviewCount: 0,
    featured: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as unknown as Product;
}

function makeCoa(overrides: Partial<VendorDocument> = {}): VendorDocument {
  return {
    id: "c1",
    organizationId: "org_1",
    vendorId: "v1",
    documentType: "coa",
    fileUrl: "local-fs:/tmp/c.enc",
    publicUrl: "https://cdn.example/coa/c.pdf",
    status: "approved",
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as unknown as VendorDocument;
}

describe("canPublishProduct", () => {
  it("blocks a product without a coaDocumentId", () => {
    const result = canPublishProduct(
      { product: makeProduct({ coaDocumentId: null }), coa: null },
      NOW,
    );
    expect(result.ok).toBe(false);
    expect(result.blocker).toBe("no_coa");
  });

  it("blocks when the linked COA has no expiresAt (config bug)", () => {
    const result = canPublishProduct(
      {
        product: makeProduct({ coaDocumentId: "c1" }),
        coa: makeCoa({ expiresAt: null }),
      },
      NOW,
    );
    expect(result.blocker).toBe("coa_no_expiry");
  });

  it("blocks when the COA has expired", () => {
    const result = canPublishProduct(
      {
        product: makeProduct({ coaDocumentId: "c1" }),
        coa: makeCoa({ expiresAt: new Date("2020-01-01") }),
      },
      NOW,
    );
    expect(result.blocker).toBe("coa_expired");
  });

  it("permits a current COA", () => {
    const result = canPublishProduct(
      {
        product: makeProduct({ coaDocumentId: "c1" }),
        coa: makeCoa(),
      },
      NOW,
    );
    expect(result.ok).toBe(true);
  });
});

describe("reminderBucketFor", () => {
  it("returns the matching bucket on the exact day", () => {
    for (const d of COA_REMINDER_DAYS_AHEAD) {
      const expiresAt = new Date(NOW.getTime() + d * 24 * 60 * 60 * 1000 + 60_000);
      const result = reminderBucketFor(expiresAt, NOW);
      expect(result.daysUntilExpiry).toBe(d);
      expect(result.bucket).toBe(d);
    }
  });

  it("returns null on a non-reminder day", () => {
    const expiresAt = new Date(NOW.getTime() + 21 * 24 * 60 * 60 * 1000);
    expect(reminderBucketFor(expiresAt, NOW).bucket).toBeNull();
  });

  it("handles already-expired COAs (negative days)", () => {
    const expiresAt = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    const result = reminderBucketFor(expiresAt, NOW);
    expect(result.daysUntilExpiry).toBeLessThan(0);
    expect(result.bucket).toBeNull();
  });
});

describe("computeCoaSweep", () => {
  it("delists active products whose COA has expired", () => {
    const result = computeCoaSweep({
      now: NOW,
      products: [
        Object.assign(
          makeProduct({ id: "p1", status: "active", coaDocumentId: "c1" }),
          { coa: makeCoa({ expiresAt: new Date("2020-01-01") }) },
        ),
      ],
    });
    expect(result.delist).toEqual([{ productId: "p1", reason: "coa_expired" }]);
    expect(result.relist).toHaveLength(0);
  });

  it("re-lists archived products whose COA was renewed", () => {
    const result = computeCoaSweep({
      now: NOW,
      products: [
        Object.assign(
          makeProduct({ id: "p1", status: "archived", coaDocumentId: "c1" }),
          { coa: makeCoa() },
        ),
      ],
    });
    expect(result.relist).toEqual(["p1"]);
    expect(result.delist).toHaveLength(0);
  });

  it("ignores draft products (no churn)", () => {
    const result = computeCoaSweep({
      now: NOW,
      products: [
        Object.assign(
          makeProduct({ id: "p1", status: "draft", coaDocumentId: null }),
          { coa: null },
        ),
      ],
    });
    expect(result.delist).toHaveLength(0);
    expect(result.relist).toHaveLength(0);
  });

  it("flags missing-COA active products with reason 'coa_missing' (different from expired)", () => {
    const result = computeCoaSweep({
      now: NOW,
      products: [
        Object.assign(
          makeProduct({ id: "p1", status: "active", coaDocumentId: null }),
          { coa: null },
        ),
      ],
    });
    expect(result.delist[0].reason).toBe("coa_missing");
  });
});

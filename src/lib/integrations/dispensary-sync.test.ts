import { describe, it, expect } from "vitest";
import {
  DispensarySyncClient,
  haversineMiles,
  scoreSkuAgainstRegimen,
  type ProductSKU,
} from "./dispensary-sync";

// Irvine, CA — near the mock dispensaries disp-1/disp-2.
const IRVINE = { lat: 33.6846, lng: -117.8265 };

describe("haversineMiles", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineMiles(IRVINE, IRVINE)).toBeCloseTo(0, 5);
  });

  it("computes a sane distance between two cities", () => {
    // Irvine → Riverside is roughly 30–35 miles.
    const riverside = { lat: 33.9806, lng: -117.3755 };
    const d = haversineMiles(IRVINE, riverside);
    expect(d).toBeGreaterThan(25);
    expect(d).toBeLessThan(45);
  });
});

describe("scoreSkuAgainstRegimen", () => {
  const exact: ProductSKU = {
    id: "x",
    name: "1:1 10/10",
    dispensaryId: "d",
    cannabinoidProfile: { THC: 10, CBD: 10 },
    inStock: true,
    price: 1,
  };

  it("scores an exact match at 100", () => {
    expect(scoreSkuAgainstRegimen(exact, { cannabinoids: { THC: 10, CBD: 10 } })).toBe(100);
  });

  it("penalises out-of-stock SKUs", () => {
    const oos = { ...exact, inStock: false };
    expect(scoreSkuAgainstRegimen(oos, { cannabinoids: { THC: 10, CBD: 10 } })).toBe(50);
  });

  it("returns 0 for an empty target", () => {
    expect(scoreSkuAgainstRegimen(exact, { cannabinoids: {} })).toBe(0);
  });
});

describe("DispensarySyncClient", () => {
  const client = new DispensarySyncClient();

  it("only returns in-stock products within the radius", async () => {
    const products = await client.findProductsInRadius(IRVINE.lat, IRVINE.lng, 30);
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.inStock)).toBe(true);
  });

  it("recommends the closest best-matching SKU first", async () => {
    const recs = await client.recommendForRegimen(IRVINE, {
      cannabinoids: { THC: 10, CBD: 10 },
    });
    expect(recs.length).toBeGreaterThan(0);
    // The 1:1 10mg/10mg tincture at disp-1 (Irvine) is the obvious top pick.
    expect(recs[0].sku.id).toBe("sku-101");
    expect(recs[0].matchScore).toBe(100);
    // Sorted by score desc, then distance asc.
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].matchScore).toBeGreaterThanOrEqual(recs[i].matchScore);
    }
  });

  it("syncs a single dispensary's catalog", async () => {
    const cat = await client.syncCatalog("disp-1");
    expect(cat.length).toBeGreaterThan(0);
    expect(cat.every((s) => s.dispensaryId === "disp-1")).toBe(true);
  });
});

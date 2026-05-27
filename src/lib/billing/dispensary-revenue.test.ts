import { describe, expect, it } from "vitest";
import {
  computeDispensaryRevenue,
  formatRevenue,
  type DispensaryOrderInput,
  type DispensaryProductInput,
} from "./dispensary-revenue";

// EMR-183 — dispensary gross / net rollup

const PRODUCT_A: DispensaryProductInput = {
  id: "prod-a",
  name: "CBD Oil 1500mg",
  brand: "Solace",
  format: "tincture",
  price: 80,
  inventoryCount: 50,
  unitCostCents: 2400,
};

const PRODUCT_B: DispensaryProductInput = {
  id: "prod-b",
  name: "Indica Gummies 10mg",
  brand: "Drift",
  format: "edible",
  price: 30,
  inventoryCount: 12,
  // intentionally no unitCostCents — exercises the "margin unknown" branch
};

const baseOrder = {
  total: 0,
  tax: 0,
  createdAt: new Date("2026-04-15"),
};

describe("computeDispensaryRevenue", () => {
  it("rolls up gross / net across counted orders", () => {
    const orders: DispensaryOrderInput[] = [
      {
        ...baseOrder,
        id: "o1",
        status: "delivered",
        total: 80,
        tax: 6.4,
        items: [{ productId: "prod-a", quantity: 1, totalPrice: 80 }],
      },
      {
        ...baseOrder,
        id: "o2",
        status: "shipped",
        total: 60,
        tax: 4.8,
        items: [{ productId: "prod-b", quantity: 2, totalPrice: 60 }],
      },
    ];

    const result = computeDispensaryRevenue(orders, [PRODUCT_A, PRODUCT_B]);
    expect(result.ordersCounted).toBe(2);
    expect(result.unitsSold).toBe(3);
    expect(result.grossCents).toBe(140_00);
    expect(result.refundedCents).toBe(0);
    expect(result.taxCents).toBe(11_20); // 6.4 + 4.8 = 11.20
    expect(result.netCents).toBe(140_00 - 11_20);
  });

  it("subtracts refunded orders from net", () => {
    const orders: DispensaryOrderInput[] = [
      {
        ...baseOrder,
        id: "o1",
        status: "delivered",
        total: 80,
        tax: 6.4,
        items: [{ productId: "prod-a", quantity: 1, totalPrice: 80 }],
      },
      {
        ...baseOrder,
        id: "o2",
        status: "refunded",
        total: 80,
        tax: 0,
        items: [{ productId: "prod-a", quantity: 1, totalPrice: 80 }],
      },
    ];

    const result = computeDispensaryRevenue(orders, [PRODUCT_A]);
    expect(result.refundedCents).toBe(80_00);
    // net = gross (80) − refunded (80) − tax (6.40) = -6.40
    expect(result.netCents).toBe(-6_40);
  });

  it("ignores cancelled and pending orders", () => {
    const orders: DispensaryOrderInput[] = [
      {
        ...baseOrder,
        id: "o1",
        status: "cancelled",
        total: 80,
        tax: 0,
        items: [{ productId: "prod-a", quantity: 1, totalPrice: 80 }],
      },
      {
        ...baseOrder,
        id: "o2",
        status: "pending",
        total: 80,
        tax: 0,
        items: [{ productId: "prod-a", quantity: 1, totalPrice: 80 }],
      },
    ];

    const result = computeDispensaryRevenue(orders, [PRODUCT_A]);
    expect(result.ordersCounted).toBe(0);
    expect(result.grossCents).toBe(0);
  });

  it("computes margin only for SKUs with unitCostCents", () => {
    const orders: DispensaryOrderInput[] = [
      {
        ...baseOrder,
        id: "o1",
        status: "delivered",
        total: 140,
        tax: 0,
        items: [
          { productId: "prod-a", quantity: 1, totalPrice: 80 },
          { productId: "prod-b", quantity: 2, totalPrice: 60 },
        ],
      },
    ];

    const result = computeDispensaryRevenue(orders, [PRODUCT_A, PRODUCT_B]);
    const skuA = result.topSkus.find((s) => s.productId === "prod-a")!;
    const skuB = result.topSkus.find((s) => s.productId === "prod-b")!;

    expect(skuA.marginPct).not.toBeNull();
    // (80 - 24) / 80 = 0.70 → 70%
    expect(skuA.marginPct).toBe(70);
    expect(skuB.marginPct).toBeNull();
  });

  it("includes inventory snapshot independent of order activity", () => {
    const result = computeDispensaryRevenue([], [PRODUCT_A, PRODUCT_B]);
    expect(result.inventoryUnits).toBe(50 + 12);
    // PRODUCT_A: 50 × 2400 = 120000 ; PRODUCT_B: 12 × 3000 (price-fallback) = 36000
    expect(result.inventoryValueCents).toBe(120_000 + 36_000);
  });

  it("ranks top SKUs by net revenue, highest first", () => {
    const PRODUCT_C: DispensaryProductInput = {
      id: "prod-c",
      name: "CBN Caps",
      brand: "Drift",
      format: "capsule",
      price: 40,
      inventoryCount: 25,
    };
    const orders: DispensaryOrderInput[] = [
      {
        ...baseOrder,
        id: "o1",
        status: "delivered",
        total: 0,
        tax: 0,
        items: [
          { productId: "prod-c", quantity: 1, totalPrice: 40 },
          { productId: "prod-a", quantity: 5, totalPrice: 400 },
        ],
      },
    ];
    const result = computeDispensaryRevenue(orders, [PRODUCT_A, PRODUCT_C]);
    expect(result.topSkus[0].productId).toBe("prod-a");
    expect(result.topSkus[1].productId).toBe("prod-c");
  });
});

describe("formatRevenue", () => {
  it("uses thousand-suffix for >=$1k", () => {
    expect(formatRevenue(150_000)).toBe("$1.5k");
  });

  it("falls back to flat dollars below $1k", () => {
    expect(formatRevenue(99_99)).toBe("$100");
    expect(formatRevenue(0)).toBe("$0");
  });
});

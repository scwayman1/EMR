import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateSalesTax,
  _createTaxJarClientForTesting,
  TaxJarApiError,
} from "./client";

beforeEach(() => {
  delete process.env.TAXJAR_API_KEY;
});

describe("calculateSalesTax — stub fallback (no TAXJAR_API_KEY)", () => {
  it("returns 0 tax for a no-sales-tax state (Oregon)", async () => {
    const result = await calculateSalesTax({
      shippingAddress: { state: "OR", zip: "97201" },
      subtotalUsd: 100,
      shippingUsd: 0,
    });
    expect(result.totalTaxUsd).toBe(0);
    expect(result.rate).toBe(0);
    expect(result.source).toBe("stub");
  });

  it("returns flat 8.75% for a marketplace-facilitator state without API key", async () => {
    const result = await calculateSalesTax({
      shippingAddress: { state: "CA", zip: "94105" },
      subtotalUsd: 100,
      shippingUsd: 0,
    });
    expect(result.rate).toBe(0.0875);
    expect(result.totalTaxUsd).toBe(8.75);
    expect(result.source).toBe("stub");
  });

  it("rounds tax to 2 decimal places", async () => {
    const result = await calculateSalesTax({
      shippingAddress: { state: "NY", zip: "10001" },
      subtotalUsd: 33.33,
      shippingUsd: 0,
    });
    expect(result.totalTaxUsd).toBe(round2(33.33 * 0.0875));
  });
});

describe("calculateSalesTax — TaxJar real path (mocked)", () => {
  const mockTaxJarResponse = {
    tax: {
      order_total_amount: 100,
      shipping: 0,
      taxable_amount: 100,
      amount_to_collect: 8.5,
      rate: 0.085,
      has_nexus: true,
      freight_taxable: false,
      tax_source: "destination",
      jurisdictions: { state: "CA", county: "San Francisco", city: "San Francisco" },
      breakdown: {
        tax_collectable: 8.5,
        combined_tax_rate: 0.085,
        state_tax_rate: 0.0625,
        state_tax_collectable: 6.25,
        county_tax_rate: 0.0125,
        county_tax_collectable: 1.25,
        city_tax_rate: 0.01,
        city_tax_collectable: 1.0,
      },
    },
  };

  it("calls TaxJar and normalizes the response shape", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockTaxJarResponse), { status: 200 }),
        ),
      );
    const client = _createTaxJarClientForTesting({
      apiKey: "tj-test-key",
      baseUrl: "https://api.taxjar.com",
      fetchImpl,
    });
    const result = await calculateSalesTax(
      { shippingAddress: { state: "CA", zip: "94105" }, subtotalUsd: 100, shippingUsd: 0 },
      { client },
    );

    expect(result.source).toBe("taxjar");
    expect(result.totalTaxUsd).toBe(8.5);
    expect(result.rate).toBe(0.085);
    expect(result.jurisdictions.state).toBe("CA");
    expect(result.breakdown?.stateTaxUsd).toBe(6.25);
    expect(result.breakdown?.cityTaxUsd).toBe(1);

    // Authorization header is "Bearer tj-test-key" — never the bare key.
    const init = fetchImpl.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["authorization"]).toBe(
      "Bearer tj-test-key",
    );
  });

  it("retries on 503 and succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(new Response("busy", { status: 503 })))
      .mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockTaxJarResponse), { status: 200 }),
        ),
      );
    const client = _createTaxJarClientForTesting({
      apiKey: "tj-test-key",
      baseUrl: "https://api.taxjar.com",
      fetchImpl,
      backoffBaseMs: 1,
    });
    const result = await calculateSalesTax(
      { shippingAddress: { state: "CA", zip: "94105" }, subtotalUsd: 100, shippingUsd: 0 },
      { client },
    );
    expect(result.totalTaxUsd).toBe(8.5);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response('{"error":"bad zip"}', { status: 400 })),
      );
    const client = _createTaxJarClientForTesting({
      apiKey: "tj-test-key",
      baseUrl: "https://api.taxjar.com",
      fetchImpl,
      backoffBaseMs: 1,
    });
    await expect(
      calculateSalesTax(
        { shippingAddress: { state: "CA", zip: "00000" }, subtotalUsd: 100, shippingUsd: 0 },
        { client },
      ),
    ).rejects.toThrow(TaxJarApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("short-circuits to zero before calling TaxJar for no-tax states", async () => {
    const fetchImpl = vi.fn();
    const client = _createTaxJarClientForTesting({
      apiKey: "tj-test-key",
      baseUrl: "https://api.taxjar.com",
      fetchImpl,
    });
    const result = await calculateSalesTax(
      { shippingAddress: { state: "OR", zip: "97201" }, subtotalUsd: 100, shippingUsd: 0 },
      { client },
    );
    expect(result.totalTaxUsd).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

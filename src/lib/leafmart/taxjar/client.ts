// EMR-247 — TaxJar API client + sales-tax calculator.
//
// `calculateSalesTax()` is the single entry point the checkout flow
// uses. It picks the backend based on env:
//   * `TAXJAR_API_KEY` set → real TaxJar API
//   * unset → deterministic stub returning a flat 8.75% (matches
//     the prior hardcoded constant in checkout/page.tsx, so swapping
//     in the real backend mid-deploy doesn't drift cart totals)
//
// We gate via env rather than a config flag because TaxJar costs
// money per call — leaving it on for local/CI without a key would
// 401 on every test. The stub keeps tests fast and offline.
//
// Marketplace-facilitator state matrix (in `./marketplace-facilitator`)
// short-circuits the call entirely for states where we don't collect.

import type {
  SalesTaxResult,
  TaxJarTaxRequest,
  TaxJarTaxResponse,
} from "./types";
import { shouldCollectSalesTax } from "./marketplace-facilitator";

export class TaxJarApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "TaxJarApiError";
  }
}

const DEFAULT_BASE_URL = "https://api.taxjar.com";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BACKOFF_BASE_MS = 200;

const STUB_FLAT_RATE = 0.0875; // matches existing checkout default

export interface SalesTaxInput {
  shippingAddress: { state: string; zip: string; city?: string };
  /** Origin nexus — typically the vendor warehouse or fulfillment center. */
  fromAddress?: { state?: string; zip?: string; city?: string };
  /** Subtotal in dollars (line items, before tax + shipping). */
  subtotalUsd: number;
  /** Shipping cost in dollars (passed through to TaxJar — some states tax shipping). */
  shippingUsd: number;
  /** Optional line-items for per-product tax categorization. */
  lineItems?: Array<{
    id?: string;
    quantity: number;
    unitPriceUsd: number;
    /** TaxJar product tax code (e.g., "00000" for general goods). */
    productTaxCode?: string;
  }>;
}

export interface TaxJarClientConfig {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  backoffBaseMs?: number;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

class TaxJarClient {
  constructor(private readonly cfg: TaxJarClientConfig) {}

  async calculate(req: TaxJarTaxRequest): Promise<TaxJarTaxResponse> {
    const url = `${this.cfg.baseUrl}/v2/taxes`;
    const fetchImpl = this.cfg.fetchImpl ?? globalThis.fetch.bind(globalThis);
    const max = this.cfg.maxRetries ?? DEFAULT_MAX_RETRIES;
    const base = this.cfg.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;

    let attempt = 0;
    let lastError: unknown;
    while (attempt <= max) {
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.cfg.apiKey}`,
          },
          body: JSON.stringify(req),
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        if (!res.ok) {
          const retryable = res.status >= 500 || res.status === 429;
          throw new TaxJarApiError(
            `TaxJar /v2/taxes returned ${res.status}`,
            res.status,
            retryable,
          );
        }
        return json as TaxJarTaxResponse;
      } catch (err) {
        lastError = err;
        if (err instanceof TaxJarApiError && !err.retryable) throw err;
        if (attempt === max) break;
        await sleep(base * 2 ** attempt);
        attempt += 1;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new TaxJarApiError(`TaxJar /v2/taxes failed`, 0, false);
  }
}

function configFromEnv(): TaxJarClientConfig | null {
  const apiKey = process.env.TAXJAR_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: process.env.TAXJAR_BASE_URL ?? DEFAULT_BASE_URL,
  };
}

/**
 * Single entry point for the checkout flow + cart UI. Returns a
 * normalized result regardless of backend.
 */
export async function calculateSalesTax(
  input: SalesTaxInput,
  options?: { client?: TaxJarClient },
): Promise<SalesTaxResult> {
  const stateCode = input.shippingAddress.state.toUpperCase();

  // Short-circuit: states where we don't collect (no general sales
  // tax OR not yet a marketplace-facilitator obligation).
  if (!shouldCollectSalesTax(stateCode)) {
    return {
      totalTaxUsd: 0,
      taxableAmountUsd: input.subtotalUsd,
      rate: 0,
      hasNexus: false,
      jurisdictions: { state: stateCode },
      source: "stub",
    };
  }

  const cfg = options?.client ? null : configFromEnv();
  if (!cfg && !options?.client) {
    // Stub fallback — flat rate matching the existing checkout default.
    const totalTaxUsd = round2(input.subtotalUsd * STUB_FLAT_RATE);
    return {
      totalTaxUsd,
      taxableAmountUsd: input.subtotalUsd,
      rate: STUB_FLAT_RATE,
      hasNexus: true,
      jurisdictions: { state: stateCode },
      source: "stub",
    };
  }

  const client = options?.client ?? new TaxJarClient(cfg!);
  const taxjarReq: TaxJarTaxRequest = {
    to_country: "US",
    to_state: stateCode,
    to_zip: input.shippingAddress.zip,
    to_city: input.shippingAddress.city,
    from_country: "US",
    from_state: input.fromAddress?.state,
    from_zip: input.fromAddress?.zip,
    from_city: input.fromAddress?.city,
    amount: input.subtotalUsd,
    shipping: input.shippingUsd,
    line_items: input.lineItems?.map((li) => ({
      id: li.id,
      quantity: li.quantity,
      unit_price: li.unitPriceUsd,
      product_tax_code: li.productTaxCode,
    })),
  };
  const res = await client.calculate(taxjarReq);

  return {
    totalTaxUsd: round2(res.tax.amount_to_collect),
    taxableAmountUsd: round2(res.tax.taxable_amount),
    rate: res.tax.rate,
    hasNexus: res.tax.has_nexus,
    jurisdictions: {
      state: res.tax.jurisdictions?.state ?? stateCode,
      county: res.tax.jurisdictions?.county,
      city: res.tax.jurisdictions?.city,
    },
    breakdown: res.tax.breakdown
      ? {
          stateTaxUsd: round2num(res.tax.breakdown.state_tax_collectable),
          countyTaxUsd: round2num(res.tax.breakdown.county_tax_collectable),
          cityTaxUsd: round2num(res.tax.breakdown.city_tax_collectable),
          specialDistrictTaxUsd: round2num(res.tax.breakdown.special_district_tax_collectable),
        }
      : undefined,
    source: "taxjar",
  };
}

// Test-only helper for direct injection.
export function _createTaxJarClientForTesting(cfg: TaxJarClientConfig): TaxJarClient {
  return new TaxJarClient(cfg);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round2num(n: number | undefined): number | undefined {
  return n === undefined ? undefined : round2(n);
}

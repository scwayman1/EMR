// EMR-247 — TaxJar request/response types.
// Models TaxJar's /v2/taxes endpoint per https://developers.taxjar.com.
// Field names are snake_case per TaxJar's wire format; the client
// translates to camelCase for app code.

export interface TaxJarTaxRequest {
  from_country?: string;
  from_zip?: string;
  from_state?: string;
  from_city?: string;
  from_street?: string;
  to_country: string;
  to_zip: string;
  to_state: string;
  to_city?: string;
  to_street?: string;
  amount: number;
  shipping: number;
  nexus_addresses?: Array<{
    country?: string;
    zip?: string;
    state?: string;
    city?: string;
    street?: string;
  }>;
  line_items?: Array<{
    id?: string;
    quantity: number;
    product_tax_code?: string;
    unit_price: number;
    discount?: number;
  }>;
}

export interface TaxJarTaxResponse {
  tax: {
    order_total_amount: number;
    shipping: number;
    taxable_amount: number;
    amount_to_collect: number;
    rate: number;
    has_nexus: boolean;
    freight_taxable: boolean;
    tax_source: string;
    jurisdictions?: {
      country?: string;
      state?: string;
      county?: string;
      city?: string;
    };
    breakdown?: {
      tax_collectable?: number;
      combined_tax_rate?: number;
      state_tax_rate?: number;
      state_tax_collectable?: number;
      county_tax_rate?: number;
      county_tax_collectable?: number;
      city_tax_rate?: number;
      city_tax_collectable?: number;
      special_district_tax_rate?: number;
      special_district_tax_collectable?: number;
    };
  };
}

// App-side normalized result. Always returned from
// `calculateSalesTax()` regardless of which backend (TaxJar vs stub)
// produced the value.
export interface SalesTaxResult {
  totalTaxUsd: number;
  taxableAmountUsd: number;
  rate: number;
  hasNexus: boolean;
  jurisdictions: {
    state: string;
    county?: string;
    city?: string;
  };
  breakdown?: {
    stateTaxUsd?: number;
    countyTaxUsd?: number;
    cityTaxUsd?: number;
    specialDistrictTaxUsd?: number;
  };
  /** "taxjar" | "stub" — useful for the order ledger to know provenance. */
  source: "taxjar" | "stub";
}

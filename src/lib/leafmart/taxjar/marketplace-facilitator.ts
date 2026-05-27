// EMR-247 — marketplace-facilitator state matrix.
//
// Most US states require marketplace facilitators (us, when we sell
// vendors' products) to collect + remit sales tax on behalf of the
// vendors. A few states still require the seller (vendor) to collect
// directly. This matrix encodes which states fall in which bucket so
// the checkout flow knows whether to add tax to the order at all,
// and the monthly admin report knows which states we owe filings for.
//
// Source: TaxJar's "Marketplace Facilitator Laws by State" reference,
// captured 2026-04. Kept in code (not DB) because it's policy, not
// data — when a state changes its rule, we want a code review, not a
// console update.
//
// `requires_collection` = true means we (Leafjourney) collect tax in
// that state. `requires_collection` = false means we do NOT, and
// vendors collect themselves (these are increasingly rare).

export type MarketplaceFacilitatorRule = {
  state: string;
  requiresCollection: boolean;
  effective: string; // ISO date
  notes?: string;
};

export const MARKETPLACE_FACILITATOR_RULES: ReadonlyArray<MarketplaceFacilitatorRule> = [
  // All 45 states with sales tax + DC require marketplace facilitator
  // collection as of 2026. Listed alphabetically.
  ...[
    "AL", "AR", "AZ", "CA", "CO", "CT", "DC", "FL", "GA", "HI", "IA",
    "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN",
    "MO", "MS", "NC", "ND", "NE", "NJ", "NM", "NV", "NY", "OH", "OK",
    "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI",
    "WV", "WY",
  ].map((state) => ({
    state,
    requiresCollection: true,
    effective: "2021-01-01",
  })),
  // States with no general sales tax — nothing to collect.
  ...["AK", "DE", "MT", "NH", "OR"].map((state) => ({
    state,
    requiresCollection: false,
    effective: "1900-01-01",
    notes: "no general sales tax",
  })),
];

const RULES_BY_STATE = new Map(
  MARKETPLACE_FACILITATOR_RULES.map((r) => [r.state, r]),
);

export function shouldCollectSalesTax(stateCode: string): boolean {
  const rule = RULES_BY_STATE.get(stateCode.toUpperCase());
  return rule?.requiresCollection ?? false;
}

export function getMarketplaceFacilitatorRule(
  stateCode: string,
): MarketplaceFacilitatorRule | null {
  return RULES_BY_STATE.get(stateCode.toUpperCase()) ?? null;
}

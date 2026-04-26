// EMR-244 — State Shipping Restriction Matrix.
//
// Each vendor declares the USPS state codes it's licensed to ship to.
// Carts and checkout validate that every cart item's vendor permits
// shipping to the buyer's state. Empty `shippableStates` is treated as
// "not configured" → blocked. This is the fail-safe direction: a
// misconfigured vendor cannot accidentally ship into a restricted
// state.

import type { Vendor } from "@prisma/client";

export const ALL_US_STATES_AND_DC: readonly string[] = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export const ALL_US_STATES_AND_DC_SET: ReadonlySet<string> = new Set(
  ALL_US_STATES_AND_DC,
);

export type ShippingRestrictionReason =
  | "ok"
  | "vendor_not_configured"
  | "state_not_permitted"
  | "invalid_state";

export interface ShippingRestrictionResult {
  ok: boolean;
  reason: ShippingRestrictionReason;
  message?: string;
}

type VendorShippingInputs = Pick<Vendor, "name" | "shippableStates">;

/**
 * Returns whether a given vendor permits shipping to a given USPS state
 * code. Case-insensitive on the state code. Returns a structured reason
 * so the caller can surface the right message at the right surface
 * (cart toast, checkout banner, vendor portal warning).
 */
export function checkShippingRestriction(
  vendor: VendorShippingInputs,
  stateCode: string,
): ShippingRestrictionResult {
  const normalized = stateCode?.toUpperCase().trim();

  if (!normalized || !ALL_US_STATES_AND_DC_SET.has(normalized)) {
    return {
      ok: false,
      reason: "invalid_state",
      message: "Enter a valid US state.",
    };
  }

  if (!vendor.shippableStates || vendor.shippableStates.length === 0) {
    return {
      ok: false,
      reason: "vendor_not_configured",
      message: `${vendor.name} hasn't set up shipping yet — please reach out before purchasing.`,
    };
  }

  const permitted = vendor.shippableStates.some(
    (s) => s.toUpperCase() === normalized,
  );

  if (!permitted) {
    return {
      ok: false,
      reason: "state_not_permitted",
      message: `${vendor.name} doesn't currently ship to ${normalized}.`,
    };
  }

  return { ok: true, reason: "ok" };
}

export interface CartItemForRestriction<V extends VendorShippingInputs> {
  productSlug: string;
  productName: string;
  vendor: V;
}

export interface CartShippingRestrictionResult<V extends VendorShippingInputs> {
  ok: boolean;
  blocked: Array<{
    item: CartItemForRestriction<V>;
    result: ShippingRestrictionResult;
  }>;
}

/**
 * Convenience helper for checkout: runs `checkShippingRestriction`
 * against every item in a cart and returns the full list of blocked
 * items in one pass. Callers display a per-item message and a CTA to
 * remove the blocked items.
 */
export function checkCartShippingRestrictions<V extends VendorShippingInputs>(
  items: ReadonlyArray<CartItemForRestriction<V>>,
  stateCode: string,
): CartShippingRestrictionResult<V> {
  const blocked: CartShippingRestrictionResult<V>["blocked"] = [];
  for (const item of items) {
    const result = checkShippingRestriction(item.vendor, stateCode);
    if (!result.ok) blocked.push({ item, result });
  }
  return { ok: blocked.length === 0, blocked };
}

/**
 * Helper for onboarding / admin: returns the default shippableStates
 * array for a new vendor based on type. Hemp = all 50 + DC; dispensary
 * = empty (must be set to the licensed state(s) explicitly during
 * onboarding).
 */
export function defaultShippableStatesForVendorType(
  vendorType: "hemp_brand" | "licensed_dispensary",
): string[] {
  return vendorType === "hemp_brand" ? [...ALL_US_STATES_AND_DC] : [];
}

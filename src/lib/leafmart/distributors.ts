// EMR-302 — Distributor model + source framework.
//
// Leafmart products can come from one of several upstream sources: our
// own first-party shelf, vetted partner brands, third-party fulfillment
// (drop-ship), or external feeds. The storefront, cart, and order
// pipeline all need to know who is responsible for shipping, returns,
// COA, and disputes — that's what a "distributor" represents here.
//
// Pure data + helpers. Safe to import from server and client code.

export type DistributorTier =
  | "first-party"   // Leafmart owns the inventory and ships it
  | "partner"       // Vetted partner brand, ships from their warehouse
  | "marketplace"   // Independent vendor on the marketplace
  | "drop-ship"     // 3PL / drop-ship fulfillment
  | "external-feed"; // Read-only feed (no checkout integration)

export type SourceTrustLevel = "verified" | "preferred" | "standard" | "review";

export interface DistributorContact {
  name: string;
  email: string;
  phone?: string;
  supportUrl?: string;
}

export interface DistributorPolicies {
  /** Days the customer can return / exchange after delivery. */
  returnsWindowDays: number;
  /** True when the distributor sends a per-batch Certificate of Analysis. */
  coaProvided: boolean;
  /** True when the distributor is responsible for sales-tax remittance. */
  remitsSalesTax: boolean;
  /** True when an age-gated check (21+) is enforced before fulfillment. */
  ageVerificationRequired: boolean;
  /** Optional, free-form list of states the distributor cannot ship to. */
  shippingExclusions?: string[];
}

export interface Distributor {
  id: string;
  slug: string;
  name: string;
  tier: DistributorTier;
  trust: SourceTrustLevel;
  /** Short blurb shown in the storefront UI ("Ships from …"). */
  shipsFrom: string;
  /** Average handling time before the carrier picks up. */
  handlingTimeHours: number;
  contact: DistributorContact;
  policies: DistributorPolicies;
  /** When the distributor was last audited (ISO date). */
  lastAuditedAt: string;
}

/** Directory of known distributors. Keyed by id for O(1) lookup. */
export const DISTRIBUTORS: Record<string, Distributor> = {
  "leafmart-direct": {
    id: "leafmart-direct",
    slug: "leafmart-direct",
    name: "Leafmart Direct",
    tier: "first-party",
    trust: "verified",
    shipsFrom: "Boulder, CO",
    handlingTimeHours: 24,
    contact: {
      name: "Leafmart Operations",
      email: "ops@leafmart.example",
      supportUrl: "/leafmart/account",
    },
    policies: {
      returnsWindowDays: 30,
      coaProvided: true,
      remitsSalesTax: true,
      ageVerificationRequired: true,
    },
    lastAuditedAt: "2026-04-01",
  },
  "leafjourney-clinical": {
    id: "leafjourney-clinical",
    slug: "leafjourney-clinical",
    name: "Leafjourney Clinical",
    tier: "partner",
    trust: "preferred",
    shipsFrom: "Denver, CO",
    handlingTimeHours: 36,
    contact: {
      name: "Clinical Partner Desk",
      email: "partners@leafjourney.example",
    },
    policies: {
      returnsWindowDays: 21,
      coaProvided: true,
      remitsSalesTax: true,
      ageVerificationRequired: true,
    },
    lastAuditedAt: "2026-03-12",
  },
  "marketplace-default": {
    id: "marketplace-default",
    slug: "marketplace-default",
    name: "Independent Vendor",
    tier: "marketplace",
    trust: "standard",
    shipsFrom: "Vendor warehouse",
    handlingTimeHours: 72,
    contact: {
      name: "Vendor support",
      email: "vendors@leafmart.example",
    },
    policies: {
      returnsWindowDays: 14,
      coaProvided: true,
      remitsSalesTax: false,
      ageVerificationRequired: true,
    },
    lastAuditedAt: "2026-02-20",
  },
};

const FALLBACK = DISTRIBUTORS["leafmart-direct"];

/**
 * Look up a distributor by id. Returns the first-party Leafmart
 * distributor as a safe fallback so UI never has to render a blank
 * "ships from" row.
 */
export function getDistributor(id: string | null | undefined): Distributor {
  if (!id) return FALLBACK;
  return DISTRIBUTORS[id] ?? FALLBACK;
}

/** All distributors in a stable order suitable for admin tables. */
export function listDistributors(): Distributor[] {
  return Object.values(DISTRIBUTORS).sort((a, b) =>
    TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.name.localeCompare(b.name)
  );
}

const TIER_RANK: Record<DistributorTier, number> = {
  "first-party": 0,
  partner: 1,
  marketplace: 2,
  "drop-ship": 3,
  "external-feed": 4,
};

const TRUST_LABEL: Record<SourceTrustLevel, string> = {
  verified: "Verified",
  preferred: "Preferred partner",
  standard: "Standard",
  review: "Under review",
};

export function trustLabel(d: Distributor): string {
  return TRUST_LABEL[d.trust];
}

/**
 * Total promised lead time before the package leaves the warehouse,
 * combining handling and a one-day buffer for label printing. Used by
 * the cart estimator.
 */
export function estimatedDispatchHours(d: Distributor): number {
  return d.handlingTimeHours + 24;
}

/**
 * Source framework — given a product, decide which distributor should
 * fulfill it. The product layer only stores a `distributorId`; this
 * helper centralizes the fallback / safety logic so callers don't each
 * re-implement it.
 */
export interface SourceableProduct {
  distributorId?: string | null;
  /** When true, force first-party fulfillment regardless of the id. */
  firstPartyOnly?: boolean;
}

export function resolveDistributor(product: SourceableProduct): Distributor {
  if (product.firstPartyOnly) return DISTRIBUTORS["leafmart-direct"];
  return getDistributor(product.distributorId);
}

/**
 * Group cart lines by distributor so checkout can render a per-shipment
 * breakdown ("Shipment 1 of 2 — Leafmart Direct"). Order is preserved
 * by first appearance to keep the UI stable across renders.
 */
export function groupByDistributor<T extends { product: SourceableProduct }>(
  lines: T[]
): Array<{ distributor: Distributor; lines: T[] }> {
  const order: string[] = [];
  const buckets = new Map<string, T[]>();
  for (const line of lines) {
    const d = resolveDistributor(line.product);
    if (!buckets.has(d.id)) {
      buckets.set(d.id, []);
      order.push(d.id);
    }
    buckets.get(d.id)!.push(line);
  }
  return order.map((id) => ({
    distributor: DISTRIBUTORS[id],
    lines: buckets.get(id)!,
  }));
}

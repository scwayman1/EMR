// EMR-302 — Distributor model + source framework.
//
// Tracks where a product came from (vendor → distributor → provenance
// chain). Anchors the marketplace's compliance story: every stocked SKU
// must trace back to a licensed distributor and a verifiable source for
// state-by-state compliance audits.
//
// The distributor data layer is intentionally separate from `vendors`.
// A vendor *sells* on Leafmart; a distributor *moves* product between
// the vendor and the operator/dispensary. One vendor can have many
// distributors (regional warehouses, tiered partners), and one
// distributor can serve many vendors.

import type { ProductFormat } from "./types";

export type DistributorTier = "tier1" | "tier2" | "tier3";

export type SourceKind =
  | "vendor_direct"
  | "licensed_distributor"
  | "co_manufacturer"
  | "internal_transfer";

export interface Distributor {
  id: string;
  name: string;
  legalName: string;
  tier: DistributorTier;
  /** State licenses keyed by USPS state code → license number. */
  licenses: Record<string, string>;
  /** Formats this distributor is permitted to move. */
  permittedFormats: ProductFormat[];
  /** True if the distributor is approved to ship into THC-regulated states. */
  thcRegulatedShipping: boolean;
  contactName: string;
  contactEmail: string;
  active: boolean;
}

export interface SourceProvenance {
  productId: string;
  sourceKind: SourceKind;
  vendorId: string;
  distributorId: string | null;
  /** Lot/batch identifier from the manufacturer. Required for COA join. */
  lotNumber: string;
  /** ISO date string. */
  receivedAt: string;
  /** Storage key for the COA PDF. Joined to the COA tracker by lotNumber. */
  coaStorageKey: string | null;
  /** Chain-of-custody notes captured at intake. */
  custodyNotes?: string;
}

export interface ProvenanceVerification {
  ok: boolean;
  reasons: string[];
}

const DEMO_DISTRIBUTORS: Distributor[] = [
  {
    id: "dist-pacific",
    name: "Pacific Greenline",
    legalName: "Pacific Greenline Distribution LLC",
    tier: "tier1",
    licenses: { CA: "C11-0000123-LIC", OR: "050-1018392B5C" },
    permittedFormats: ["tincture", "topical", "capsule", "edible", "vape", "flower"],
    thcRegulatedShipping: true,
    contactName: "M. Alvarez",
    contactEmail: "ops@pacificgreenline.example",
    active: true,
  },
  {
    id: "dist-mountain",
    name: "Mountain Source Co.",
    legalName: "Mountain Source Cooperative",
    tier: "tier2",
    licenses: { CO: "405-00821", NV: "C-23-0001" },
    permittedFormats: ["tincture", "topical", "edible", "beverage", "serum"],
    thcRegulatedShipping: true,
    contactName: "K. Yamada",
    contactEmail: "logistics@mountainsource.example",
    active: true,
  },
  {
    id: "dist-allwell",
    name: "Allwell Hemp Logistics",
    legalName: "Allwell Hemp Logistics, Inc.",
    tier: "tier1",
    licenses: { US: "DEA-NO-CTRL" },
    permittedFormats: ["tincture", "topical", "capsule", "serum", "patch"],
    // CBD-only — does not ship Schedule I product across state lines.
    thcRegulatedShipping: false,
    contactName: "R. Chen",
    contactEmail: "shipping@allwell.example",
    active: true,
  },
];

export async function listDistributors(): Promise<Distributor[]> {
  return DEMO_DISTRIBUTORS.filter((d) => d.active);
}

export async function getDistributor(id: string): Promise<Distributor | null> {
  return DEMO_DISTRIBUTORS.find((d) => d.id === id) ?? null;
}

/**
 * Pick eligible distributors for a product going to a given state.
 * Eligibility rules:
 *   1. Distributor must be active
 *   2. Distributor must hold a license in the destination state
 *   3. Distributor must be approved for the product's format
 *   4. If the product is THC-regulated, distributor must be cleared for it
 *
 * Sorted tier1 → tier3 so the operator picks the strongest partner first.
 */
export async function eligibleDistributors(opts: {
  state: string;
  format: ProductFormat;
  thcRegulated: boolean;
}): Promise<Distributor[]> {
  const tierOrder: Record<DistributorTier, number> = { tier1: 0, tier2: 1, tier3: 2 };
  return DEMO_DISTRIBUTORS.filter((d) => {
    if (!d.active) return false;
    if (!d.licenses[opts.state]) return false;
    if (!d.permittedFormats.includes(opts.format)) return false;
    if (opts.thcRegulated && !d.thcRegulatedShipping) return false;
    return true;
  }).sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
}

/**
 * Verify a provenance record against a distributor. Failed checks are
 * surfaced as human-readable reasons so the operator UI can render them
 * inline without parsing error codes.
 */
export function verifyProvenance(
  provenance: SourceProvenance,
  distributor: Distributor | null,
): ProvenanceVerification {
  const reasons: string[] = [];

  if (!provenance.lotNumber.trim()) {
    reasons.push("missing lot number");
  }
  if (!provenance.coaStorageKey) {
    reasons.push("no COA on file");
  }
  if (provenance.sourceKind === "licensed_distributor" && !provenance.distributorId) {
    reasons.push("source kind is licensed_distributor but distributorId is null");
  }
  if (provenance.distributorId && !distributor) {
    reasons.push("distributor record not found");
  }
  if (distributor && !distributor.active) {
    reasons.push(`distributor ${distributor.name} is inactive`);
  }

  return { ok: reasons.length === 0, reasons };
}

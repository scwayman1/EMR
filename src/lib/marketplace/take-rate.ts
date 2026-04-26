// Marketplace Take Rate Policy (EMR-225)
//
// Encodes the vendor pricing model defined in
// docs/marketplace/take-rate-policy.md so downstream callers
// (onboarding wizard, payout cron, vendor dashboard, payout statement
// PDF) read one source of truth rather than inlining magic numbers.

import type { Vendor } from "@prisma/client";

export type TakeRateTier =
  | "founding_partner"
  | "growth"
  | "standard"
  | "dispensary";

export interface TakeRateBreakdown {
  tier: TakeRateTier;
  takeRatePct: number;
  reservePct: number;
  reserveDays: number;
}

export const TAKE_RATE_POLICY = {
  hemp: {
    founding_partner: { takeRatePct: 0.10, reservePct: 0.10, reserveDays: 14 },
    growth:           { takeRatePct: 0.12, reservePct: 0.10, reserveDays: 14 },
    standard:         { takeRatePct: 0.15, reservePct: 0.10, reserveDays: 14 },
  },
  dispensary: {
    // Per-partner negotiated band 5–8%; default to the midpoint until
    // an explicit override is stored on the vendor record.
    dispensary: { takeRatePct: 0.065, reservePct: 0.05, reserveDays: 14 },
  },
} as const;

export const VOLUME_TIER_GMV_THRESHOLD_USD = 50_000;

export const FOUNDING_PARTNER_LOCK_MONTHS = 24;

export const FOUNDING_PARTNER_COHORT_CAP = 10;

type TakeRateInputs = Pick<
  Vendor,
  | "vendorType"
  | "takeRatePct"
  | "foundingPartnerFlag"
  | "foundingPartnerExpiresAt"
  | "reservePct"
  | "reserveDays"
>;

/**
 * Resolve the effective take-rate breakdown for a vendor at a given
 * cumulative-GMV checkpoint. Per-vendor overrides on the Vendor row
 * always win — this function exists to compute the policy default
 * when no override is set, and to assign the correct tier label for
 * vendor-facing payout statements.
 */
export function resolveTakeRate(
  vendor: TakeRateInputs,
  cumulativeGmvUsd: number,
  now: Date = new Date(),
): TakeRateBreakdown {
  const isDispensary = vendor.vendorType === "licensed_dispensary";

  if (isDispensary) {
    const policy = TAKE_RATE_POLICY.dispensary.dispensary;
    return {
      tier: "dispensary",
      takeRatePct: vendor.takeRatePct ?? policy.takeRatePct,
      reservePct: vendor.reservePct ?? policy.reservePct,
      reserveDays: vendor.reserveDays ?? policy.reserveDays,
    };
  }

  const foundingActive =
    vendor.foundingPartnerFlag &&
    (!vendor.foundingPartnerExpiresAt ||
      vendor.foundingPartnerExpiresAt > now);

  if (foundingActive) {
    const policy = TAKE_RATE_POLICY.hemp.founding_partner;
    return {
      tier: "founding_partner",
      takeRatePct: vendor.takeRatePct ?? policy.takeRatePct,
      reservePct: vendor.reservePct ?? policy.reservePct,
      reserveDays: vendor.reserveDays ?? policy.reserveDays,
    };
  }

  const tier: TakeRateTier =
    cumulativeGmvUsd >= VOLUME_TIER_GMV_THRESHOLD_USD ? "growth" : "standard";
  const policy = TAKE_RATE_POLICY.hemp[tier];

  return {
    tier,
    takeRatePct: vendor.takeRatePct ?? policy.takeRatePct,
    reservePct: vendor.reservePct ?? policy.reservePct,
    reserveDays: vendor.reserveDays ?? policy.reserveDays,
  };
}

export interface PayoutLineItems {
  grossUsd: number;
  takeRateUsd: number;
  reserveHeldUsd: number;
  netUsd: number;
}

/**
 * Per-payout breakdown shown to vendors. Processing fees are absorbed
 * into the take rate by policy (see take-rate-policy.md) — vendors see
 * one clean number, not a separate processing line. Reserve is held
 * for `reserveDays` then released in a future payout.
 */
export function computePayoutLineItems(
  grossUsd: number,
  breakdown: TakeRateBreakdown,
): PayoutLineItems {
  const takeRateUsd = round2(grossUsd * breakdown.takeRatePct);
  const reserveHeldUsd = round2(grossUsd * breakdown.reservePct);
  const netUsd = round2(grossUsd - takeRateUsd - reserveHeldUsd);
  return { grossUsd: round2(grossUsd), takeRateUsd, reserveHeldUsd, netUsd };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

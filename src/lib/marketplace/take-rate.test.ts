import { describe, it, expect } from "vitest";
import {
  resolveTakeRate,
  computePayoutLineItems,
  VOLUME_TIER_GMV_THRESHOLD_USD,
} from "./take-rate";

const baseVendor = {
  vendorType: "hemp_brand" as const,
  takeRatePct: 0.10,
  foundingPartnerFlag: true,
  foundingPartnerExpiresAt: new Date("2028-04-23"),
  reservePct: 0.10,
  reserveDays: 14,
};

describe("resolveTakeRate", () => {
  it("returns founding_partner tier while flag active and not expired", () => {
    const result = resolveTakeRate(baseVendor, 0, new Date("2026-04-25"));
    expect(result.tier).toBe("founding_partner");
    expect(result.takeRatePct).toBe(0.10);
  });

  it("falls through to standard when founding flag has expired", () => {
    const result = resolveTakeRate(
      { ...baseVendor, takeRatePct: 0.15 },
      0,
      new Date("2030-01-01"),
    );
    expect(result.tier).toBe("standard");
    expect(result.takeRatePct).toBe(0.15);
  });

  it("upgrades to growth tier once cumulative GMV crosses threshold", () => {
    const result = resolveTakeRate(
      { ...baseVendor, foundingPartnerFlag: false, takeRatePct: 0.12 },
      VOLUME_TIER_GMV_THRESHOLD_USD,
      new Date("2030-01-01"),
    );
    expect(result.tier).toBe("growth");
    expect(result.takeRatePct).toBe(0.12);
  });

  it("uses dispensary policy regardless of founding flag", () => {
    const result = resolveTakeRate(
      {
        ...baseVendor,
        vendorType: "licensed_dispensary",
        takeRatePct: 0.065,
        reservePct: 0.05,
      },
      0,
    );
    expect(result.tier).toBe("dispensary");
    expect(result.reservePct).toBe(0.05);
  });
});

describe("computePayoutLineItems", () => {
  it("matches the worked example from the policy doc ($40 sale, 10% take, 10% reserve)", () => {
    const breakdown = resolveTakeRate(baseVendor, 0, new Date("2026-04-25"));
    const lines = computePayoutLineItems(40, breakdown);
    expect(lines.grossUsd).toBe(40);
    expect(lines.takeRateUsd).toBe(4);
    expect(lines.reserveHeldUsd).toBe(4);
    expect(lines.netUsd).toBe(32);
  });
});

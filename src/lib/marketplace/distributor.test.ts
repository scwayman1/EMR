import { describe, it, expect } from "vitest";
import {
  eligibleDistributors,
  verifyProvenance,
  type SourceProvenance,
  type Distributor,
} from "./distributor";

describe("eligibleDistributors", () => {
  it("filters out distributors without a license in the destination state", async () => {
    const result = await eligibleDistributors({
      state: "FL",
      format: "tincture",
      thcRegulated: false,
    });
    // None of the demo distributors hold an FL license.
    expect(result).toHaveLength(0);
  });

  it("excludes CBD-only distributors when product is THC-regulated", async () => {
    const result = await eligibleDistributors({
      state: "CA",
      format: "tincture",
      thcRegulated: true,
    });
    expect(result.every((d) => d.thcRegulatedShipping)).toBe(true);
    expect(result.find((d) => d.id === "dist-allwell")).toBeUndefined();
  });

  it("sorts tier1 distributors ahead of tier2", async () => {
    const result = await eligibleDistributors({
      state: "CA",
      format: "tincture",
      thcRegulated: false,
    });
    if (result.length >= 2) {
      const tierOrder = { tier1: 0, tier2: 1, tier3: 2 } as const;
      for (let i = 1; i < result.length; i++) {
        expect(tierOrder[result[i].tier]).toBeGreaterThanOrEqual(
          tierOrder[result[i - 1].tier],
        );
      }
    }
  });
});

describe("verifyProvenance", () => {
  const baseDistributor: Distributor = {
    id: "dist-x",
    name: "X",
    legalName: "X LLC",
    tier: "tier1",
    licenses: { CA: "L1" },
    permittedFormats: ["tincture"],
    thcRegulatedShipping: true,
    contactName: "C",
    contactEmail: "c@x",
    active: true,
  };

  const baseProvenance: SourceProvenance = {
    productId: "prod-1",
    sourceKind: "licensed_distributor",
    vendorId: "v-1",
    distributorId: "dist-x",
    lotNumber: "LOT-123",
    receivedAt: "2026-04-01T00:00:00Z",
    coaStorageKey: "coa/lot-123.pdf",
  };

  it("passes when all checks succeed", () => {
    const result = verifyProvenance(baseProvenance, baseDistributor);
    expect(result.ok).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("fails when COA is missing", () => {
    const result = verifyProvenance(
      { ...baseProvenance, coaStorageKey: null },
      baseDistributor,
    );
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("no COA on file");
  });

  it("fails when sourceKind says licensed_distributor but distributorId is null", () => {
    const result = verifyProvenance(
      { ...baseProvenance, distributorId: null },
      null,
    );
    expect(result.ok).toBe(false);
    expect(
      result.reasons.some((r) => r.includes("distributorId is null")),
    ).toBe(true);
  });

  it("fails when distributor is inactive", () => {
    const result = verifyProvenance(baseProvenance, {
      ...baseDistributor,
      active: false,
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("inactive"))).toBe(true);
  });
});

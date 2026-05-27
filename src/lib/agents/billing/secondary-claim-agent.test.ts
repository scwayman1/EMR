import { describe, expect, it } from "vitest";
import {
  deriveGsControl,
  deriveIsaControl,
  extractSecondaryCoverage,
  secondaryTimelyFilingDeadline,
  shouldBuildSecondary,
  totalAdjustmentCents,
} from "./secondary-claim-agent";

// EMR-219 — pure helper tests

describe("totalAdjustmentCents", () => {
  it("sums absolute values across CAS entries", () => {
    expect(
      totalAdjustmentCents([
        { groupCode: "CO", reasonCode: "45", amountCents: 3000 },
        { groupCode: "PR", reasonCode: "1", amountCents: 2400 },
      ]),
    ).toBe(5400);
  });

  it("returns 0 on empty input", () => {
    expect(totalAdjustmentCents([])).toBe(0);
  });
});

describe("secondaryTimelyFilingDeadline", () => {
  it("counts from primary ERA date, not DOS", () => {
    const out = secondaryTimelyFilingDeadline({
      primaryEraDate: new Date(Date.UTC(2026, 3, 1)),
      secondaryTimelyFilingDays: 90,
    });
    expect(out.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });
});

describe("shouldBuildSecondary", () => {
  it("builds when secondary exists, adjustments > 0, no prior submission", () => {
    expect(
      shouldBuildSecondary({
        hasSecondaryCoverage: true,
        primaryCasAmountCents: 1000,
        alreadyHasSecondarySubmission: false,
      }),
    ).toEqual({ build: true });
  });

  it("skips when no secondary coverage", () => {
    expect(
      shouldBuildSecondary({
        hasSecondaryCoverage: false,
        primaryCasAmountCents: 1000,
        alreadyHasSecondarySubmission: false,
      }),
    ).toEqual({ build: false, reason: "no_secondary" });
  });

  it("skips when primary paid in full (zero adjustments)", () => {
    expect(
      shouldBuildSecondary({
        hasSecondaryCoverage: true,
        primaryCasAmountCents: 0,
        alreadyHasSecondarySubmission: false,
      }),
    ).toEqual({ build: false, reason: "zero_adjustments" });
  });

  it("skips when a secondary submission already exists (idempotency)", () => {
    expect(
      shouldBuildSecondary({
        hasSecondaryCoverage: true,
        primaryCasAmountCents: 1000,
        alreadyHasSecondarySubmission: true,
      }),
    ).toEqual({ build: false, reason: "already_filed" });
  });
});

describe("extractSecondaryCoverage", () => {
  it("returns coverage when present and complete", () => {
    expect(
      extractSecondaryCoverage({
        secondaryCoverage: { payerName: "Aetna", payerId: "60054", memberId: "M1" },
      }),
    ).toEqual({
      payerName: "Aetna",
      payerId: "60054",
      memberId: "M1",
      primaryMemberId: undefined,
    });
  });

  it("returns null when missing required fields", () => {
    expect(extractSecondaryCoverage({ secondaryCoverage: { payerName: "Aetna" } })).toBeNull();
    expect(extractSecondaryCoverage(null)).toBeNull();
    expect(extractSecondaryCoverage("not an object")).toBeNull();
  });
});

describe("control number derivation", () => {
  it("is deterministic for the same seed", () => {
    expect(deriveIsaControl("adj-1")).toBe(deriveIsaControl("adj-1"));
    expect(deriveGsControl("adj-1")).toBe(deriveGsControl("adj-1"));
  });

  it("fits the 9-digit / 6-digit envelopes", () => {
    expect(deriveIsaControl("adj-1")).toBeLessThan(1_000_000_000);
    expect(deriveGsControl("adj-1")).toBeGreaterThanOrEqual(1);
    expect(deriveGsControl("adj-1")).toBeLessThan(1_000_000);
  });
});

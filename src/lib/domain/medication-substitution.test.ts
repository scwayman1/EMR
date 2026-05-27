import { describe, it, expect } from "vitest";
import {
  detectSubstitution,
  type RegimenForSubstitution,
} from "./medication-substitution";

function r(
  partial: Partial<RegimenForSubstitution> &
    Pick<RegimenForSubstitution, "id" | "productId">,
): RegimenForSubstitution {
  return {
    productName: null,
    active: false,
    startDate: new Date(),
    endDate: null,
    volumePerDose: 0,
    volumeUnit: "mL",
    calculatedThcMgPerDose: null,
    calculatedCbdMgPerDose: null,
    ...partial,
  };
}

describe("detectSubstitution (EMR-003)", () => {
  it("returns occurred=false when there are fewer than two regimens", () => {
    expect(detectSubstitution([])).toEqual({ occurred: false });
    expect(
      detectSubstitution([
        r({ id: "1", productId: "p1", active: true }),
      ]),
    ).toEqual({ occurred: false });
  });

  it("detects a substitution when the mg matches and the product changed", () => {
    const result = detectSubstitution([
      r({
        id: "old",
        productId: "p-old",
        productName: "Brand A 10 mg/mL Oil",
        active: false,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-05-01"),
        volumePerDose: 0.5,
        volumeUnit: "mL",
        calculatedThcMgPerDose: 5,
        calculatedCbdMgPerDose: 5,
      }),
      r({
        id: "new",
        productId: "p-new",
        productName: "Brand B 20 mg/mL Oil",
        active: true,
        startDate: new Date("2026-05-02"),
        volumePerDose: 0.25,
        volumeUnit: "mL",
        calculatedThcMgPerDose: 5,
        calculatedCbdMgPerDose: 5,
      }),
    ]);
    expect(result.occurred).toBe(true);
    expect(result.previousProductName).toBe("Brand A 10 mg/mL Oil");
    expect(result.currentProductName).toBe("Brand B 20 mg/mL Oil");
    expect(result.previousVolume).toBe("0.5 mL");
    expect(result.currentVolume).toBe("0.25 mL");
    expect(result.thcMgPerDose).toBe(5);
    expect(result.cbdMgPerDose).toBe(5);
  });

  it("does NOT trigger when the mg dose actually changed", () => {
    const result = detectSubstitution([
      r({
        id: "old",
        productId: "p-old",
        active: false,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-05-01"),
        calculatedThcMgPerDose: 5,
        calculatedCbdMgPerDose: 5,
      }),
      r({
        id: "new",
        productId: "p-new",
        active: true,
        startDate: new Date("2026-05-02"),
        calculatedThcMgPerDose: 10,
        calculatedCbdMgPerDose: 5,
      }),
    ]);
    expect(result.occurred).toBe(false);
  });

  it("does NOT trigger when the same product is reused", () => {
    const result = detectSubstitution([
      r({
        id: "old",
        productId: "same",
        active: false,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-05-01"),
        calculatedThcMgPerDose: 5,
      }),
      r({
        id: "new",
        productId: "same",
        active: true,
        startDate: new Date("2026-05-02"),
        calculatedThcMgPerDose: 5,
      }),
    ]);
    expect(result.occurred).toBe(false);
  });

  it("tolerates tiny rounding differences in mg", () => {
    const result = detectSubstitution([
      r({
        id: "old",
        productId: "p-old",
        active: false,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-05-01"),
        calculatedThcMgPerDose: 5.0,
      }),
      r({
        id: "new",
        productId: "p-new",
        active: true,
        startDate: new Date("2026-05-02"),
        calculatedThcMgPerDose: 5.05, // off by 0.05 mg
      }),
    ]);
    expect(result.occurred).toBe(true);
  });
});

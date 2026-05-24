// Light unit coverage for the display primitives. Keeps the contract honest
// so adoption sites can rely on consistent output and null-safety.

import { describe, expect, it } from "vitest";

import {
  dose,
  lab,
  labFlagAriaLabel,
  money,
  moneyTone,
  vitals,
} from "./format";

describe("money", () => {
  it("formats cents as USD with two decimals", () => {
    expect(money(123456)).toBe("$1,234.56");
    expect(money(0)).toBe("$0.00");
    expect(money(99)).toBe("$0.99");
  });

  it("renders negative values with a leading minus", () => {
    expect(money(-500)).toBe("-$5.00");
  });

  it("returns a placeholder for null / undefined / NaN", () => {
    expect(money(null)).toBe("—");
    expect(money(undefined)).toBe("—");
    expect(money(Number.NaN)).toBe("—");
  });

  it("supports compactDollars and abbreviate", () => {
    expect(money(123456, { compactDollars: true })).toBe("$1,235");
    expect(money(1_234_567_89, { abbreviate: true })).toBe("$1.2M");
    expect(money(123_456_789, { abbreviate: true })).toBe("$1.2M");
    expect(money(345_678, { abbreviate: true })).toBe("$3.5K");
  });

  it("reports tone for negative values", () => {
    expect(moneyTone(-100)).toBe("negative");
    expect(moneyTone(100)).toBe("neutral");
    expect(moneyTone(null)).toBe("neutral");
  });
});

describe("dose", () => {
  it("renders amount + unit", () => {
    expect(dose(100, "mg")).toBe("100 mg");
    expect(dose(5, "ml")).toBe("5 mL");
    expect(dose(1, "tab")).toBe("1 tab");
  });

  it("strips trailing zeros from decimals", () => {
    expect(dose(2.5, "mg")).toBe("2.5 mg");
    expect(dose(1.0, "mg")).toBe("1 mg");
  });

  it("handles missing values", () => {
    expect(dose(null, "mg")).toBe("—");
    expect(dose(Number.NaN, "mg")).toBe("—");
  });
});

describe("vitals", () => {
  it("formats blood pressure", () => {
    expect(vitals.bp(120, 80)).toBe("120/80");
    expect(vitals.bp(120, null)).toBe("—");
  });

  it("formats temperature with default Fahrenheit", () => {
    expect(vitals.temp(98.6)).toBe("98.6 °F");
    expect(vitals.temp(37.0, "C")).toBe("37.0 °C");
    expect(vitals.temp(null)).toBe("—");
  });

  it("formats spo2 clamped to 0–100", () => {
    expect(vitals.spo2(98)).toBe("98%");
    expect(vitals.spo2(101)).toBe("100%");
    expect(vitals.spo2(null)).toBe("—");
  });
});

describe("lab", () => {
  it("returns normal flag inside range", () => {
    expect(lab(4.5, "mmol/L", 3.5, 5.0)).toEqual({
      display: "4.5 mmol/L",
      flag: "normal",
    });
  });

  it("flags high and low values", () => {
    expect(lab(6.2, "mmol/L", 3.5, 5.0).flag).toBe("high");
    expect(lab(2.1, "mmol/L", 3.5, 5.0).flag).toBe("low");
  });

  it("returns null flag when no range provided", () => {
    expect(lab(4.5, "mmol/L").flag).toBeNull();
  });

  it("handles missing values", () => {
    expect(lab(null, "mmol/L")).toEqual({ display: "—", flag: null });
  });

  it("exposes a11y labels", () => {
    expect(labFlagAriaLabel("high")).toBe("Above reference range");
    expect(labFlagAriaLabel("low")).toBe("Below reference range");
    expect(labFlagAriaLabel("normal")).toBeUndefined();
  });
});

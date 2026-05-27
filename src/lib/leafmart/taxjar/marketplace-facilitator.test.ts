import { describe, it, expect } from "vitest";
import {
  shouldCollectSalesTax,
  getMarketplaceFacilitatorRule,
} from "./marketplace-facilitator";

describe("shouldCollectSalesTax", () => {
  it("returns true for marketplace-facilitator states", () => {
    expect(shouldCollectSalesTax("CA")).toBe(true);
    expect(shouldCollectSalesTax("NY")).toBe(true);
    expect(shouldCollectSalesTax("TX")).toBe(true);
    expect(shouldCollectSalesTax("DC")).toBe(true);
  });

  it("returns false for the 5 NOMAD states (Alaska, Delaware, Montana, New Hampshire, Oregon)", () => {
    for (const state of ["AK", "DE", "MT", "NH", "OR"]) {
      expect(shouldCollectSalesTax(state)).toBe(false);
    }
  });

  it("is case-insensitive", () => {
    expect(shouldCollectSalesTax("ca")).toBe(true);
    expect(shouldCollectSalesTax("Ny")).toBe(true);
  });

  it("returns false for unknown jurisdictions (defaults to no-collect, fail-safe for revenue)", () => {
    expect(shouldCollectSalesTax("ZZ")).toBe(false);
    expect(shouldCollectSalesTax("")).toBe(false);
  });
});

describe("getMarketplaceFacilitatorRule", () => {
  it("returns the rule object for a known state", () => {
    const rule = getMarketplaceFacilitatorRule("CA");
    expect(rule?.state).toBe("CA");
    expect(rule?.requiresCollection).toBe(true);
  });

  it("returns null for an unknown state", () => {
    expect(getMarketplaceFacilitatorRule("ZZ")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  estimateInhalationDose,
  isInhaledProductType,
  mgPerPuff,
  mgPerPuffForFlower,
  mgPerPuffForVape,
  DEFAULT_VAPE_ML_PER_PUFF,
} from "./inhalation-dose";

describe("inhalation dose estimator (EMR-003)", () => {
  describe("mgPerPuffForVape", () => {
    it("multiplies concentration (mg/mL) by mL per puff", () => {
      // 800 mg/mL cart × 0.005 mL/puff = 4 mg/puff
      expect(mgPerPuffForVape(800)).toBeCloseTo(800 * DEFAULT_VAPE_ML_PER_PUFF);
    });

    it("returns 0 for non-positive or non-finite input", () => {
      expect(mgPerPuffForVape(0)).toBe(0);
      expect(mgPerPuffForVape(-100)).toBe(0);
      expect(mgPerPuffForVape(Number.NaN)).toBe(0);
    });
  });

  describe("mgPerPuffForFlower", () => {
    it("scales with percent THC and combustion efficiency", () => {
      // 20% THC, 0.05 g/puff, 30% efficient
      // = (20*10) mg/g × 0.05 × 0.3 = 3.0 mg/puff
      expect(mgPerPuffForFlower(20)).toBeCloseTo(3.0);
    });

    it("returns 0 for invalid percent", () => {
      expect(mgPerPuffForFlower(0)).toBe(0);
      expect(mgPerPuffForFlower(-1)).toBe(0);
    });
  });

  describe("mgPerPuff routing", () => {
    it("uses the vape formula for vape cartridges", () => {
      const r = mgPerPuff({
        productType: "vape_cartridge",
        thcConcentration: 800,
        cbdConcentration: 200,
        concentrationUnit: "mg/mL",
      });
      expect(r.thc).toBeGreaterThan(0);
      expect(r.cbd).toBeGreaterThan(0);
      expect(r.thc).toBeGreaterThan(r.cbd); // 4× the CBD
    });

    it("uses the flower formula for flower", () => {
      const r = mgPerPuff({
        productType: "flower",
        thcConcentration: 18,
        cbdConcentration: 0,
        concentrationUnit: "%",
      });
      expect(r.thc).toBeCloseTo(mgPerPuffForFlower(18));
      expect(r.cbd).toBe(0);
    });

    it("returns zeros for non-inhaled products", () => {
      const r = mgPerPuff({
        productType: "edible",
        thcConcentration: 10,
        cbdConcentration: 10,
        concentrationUnit: "mg/unit",
      });
      expect(r.thc).toBe(0);
      expect(r.cbd).toBe(0);
    });
  });

  describe("estimateInhalationDose", () => {
    it("multiplies puffs by mg/puff and rounds to 1 decimal", () => {
      const estimate = estimateInhalationDose(3, {
        productType: "vape_cartridge",
        thcConcentration: 800,
        cbdConcentration: 0,
        concentrationUnit: "mg/mL",
      });
      // 3 puffs × 4 mg/puff = 12 mg
      expect(estimate.estimatedThcMg).toBeCloseTo(12);
      expect(estimate.estimatedCbdMg).toBe(0);
      expect(estimate.puffs).toBe(3);
    });

    it("treats fractional and negative puffs as floor/zero", () => {
      const e = estimateInhalationDose(-2, {
        productType: "vape_cartridge",
        thcConcentration: 800,
        concentrationUnit: "mg/mL",
      });
      expect(e.puffs).toBe(0);
      expect(e.estimatedThcMg).toBe(0);
    });

    it("returns a rationale string the patient can read", () => {
      const e = estimateInhalationDose(2, {
        productType: "vape_cartridge",
        thcConcentration: 500,
        concentrationUnit: "mg/mL",
      });
      expect(e.rationale).toMatch(/2 puffs/);
      expect(e.rationale).toMatch(/mg/);
    });
  });

  describe("isInhaledProductType", () => {
    it("recognizes inhaled product types", () => {
      expect(isInhaledProductType("vape_cartridge")).toBe(true);
      expect(isInhaledProductType("flower")).toBe(true);
      expect(isInhaledProductType("concentrate")).toBe(true);
    });

    it("rejects non-inhaled product types", () => {
      expect(isInhaledProductType("edible")).toBe(false);
      expect(isInhaledProductType("tincture")).toBe(false);
      expect(isInhaledProductType(null)).toBe(false);
      expect(isInhaledProductType(undefined)).toBe(false);
    });
  });
});

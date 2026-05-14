import { describe, expect, it } from "vitest";
import {
  formatRatio,
  pickDoseWindow,
  recommend,
  scoreProduct,
  SEED_PRODUCTS,
  type ProductCandidate,
  type RecommendationInput,
} from "./recommendation-engine";

describe("formatRatio", () => {
  it("normalizes 1:1 from any equal-percent mix", () => {
    expect(formatRatio({ thcPercent: 5, cbdPercent: 5 })).toBe("1:1");
  });
  it("normalizes 20:1 CBD-dominant", () => {
    expect(formatRatio({ thcPercent: 1, cbdPercent: 20 })).toBe("1:20");
  });
  it("handles CBD-only", () => {
    expect(formatRatio({ thcPercent: 0, cbdPercent: 100 })).toBe("0:100");
  });
});

describe("pickDoseWindow", () => {
  it("returns a wider window for higher tolerance", () => {
    const naive = pickDoseWindow("chronic_pain", "naive");
    const high = pickDoseWindow("chronic_pain", "high");
    expect(high.ceilingMg).toBeGreaterThan(naive.ceilingMg);
  });
  it("returns a single daily dose for insomnia", () => {
    const dose = pickDoseWindow("insomnia", "moderate");
    expect(dose.intervalHours).toEqual([24, 24]);
  });
});

describe("scoreProduct", () => {
  const basePatient: RecommendationInput = {
    symptoms: ["chronic_pain"],
    tolerance: "moderate",
  };

  it("scores higher when the product is indicated for the symptom", () => {
    const balanced = SEED_PRODUCTS.find((p) => p.id === "balanced-1-1-softgel")!;
    const cbnSleep = SEED_PRODUCTS.find((p) => p.id === "cbn-sleep-tincture")!;
    const balancedScore = scoreProduct(balanced, basePatient).score;
    const cbnScore = scoreProduct(cbnSleep, basePatient).score;
    expect(balancedScore).toBeGreaterThan(cbnScore);
  });

  it("warns when THC exceeds the patient ceiling", () => {
    const thcHeavy = SEED_PRODUCTS.find((p) => p.id === "thc-dominant-edible")!;
    const result = scoreProduct(thcHeavy, {
      symptoms: ["insomnia"],
      tolerance: "naive",
      thcCeiling: 15,
    });
    expect(result.warnings.some((w) => w.includes("THC"))).toBe(true);
  });

  it("warns naive patients against THC-dominant products", () => {
    const thcHeavy: ProductCandidate = {
      id: "thc-heavy",
      name: "THC heavy",
      form: "edible",
      cannabinoids: { thcPercent: 18, cbdPercent: 0 },
      dominantTerpene: null,
      indications: ["insomnia"],
      evidenceTier: "experiential",
      citations: [],
    };
    const result = scoreProduct(thcHeavy, {
      symptoms: ["insomnia"],
      tolerance: "naive",
      thcCeiling: 25,
    });
    expect(result.warnings.some((w) => w.includes("naive"))).toBe(true);
  });

  it("matches the preferred form factor", () => {
    const inhaled = SEED_PRODUCTS.find((p) => p.id === "inhaled-balanced-flower")!;
    const withPref = scoreProduct(inhaled, {
      ...basePatient,
      preferredForm: "inhaled",
    });
    const withoutPref = scoreProduct(inhaled, basePatient);
    expect(withPref.score).toBeGreaterThan(withoutPref.score);
  });
});

describe("recommend", () => {
  it("returns nothing when no symptoms are given", () => {
    expect(recommend({ symptoms: [], tolerance: "moderate" })).toEqual([]);
  });

  it("ranks RCT-grade products above experiential for the same symptom", () => {
    const results = recommend({ symptoms: ["chronic_pain"], tolerance: "moderate" });
    const rctRank = results.findIndex((r) => r.product.evidenceTier === "rct");
    const expRank = results.findIndex((r) => r.product.evidenceTier === "experiential");
    expect(rctRank).toBeGreaterThanOrEqual(0);
    if (expRank >= 0) expect(rctRank).toBeLessThan(expRank);
  });

  it("surfaces the seed-set seizure RCT for seizure complaints", () => {
    const results = recommend({ symptoms: ["seizure"], tolerance: "naive" });
    expect(results[0]?.product.id).toBe("epidiolex");
  });
});

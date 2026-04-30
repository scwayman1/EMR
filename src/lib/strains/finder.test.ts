import { describe, expect, it } from "vitest";
import {
  normalizeSymptom,
  rankStrains,
  scoreStrain,
  type StrainRow,
} from "./finder";

const STRAIN: StrainRow = {
  id: "s1",
  slug: "northern-lights",
  name: "Northern Lights",
  classification: "indica",
  thcPercent: 18,
  cbdPercent: 0.5,
  dominantTerpene: "Myrcene",
  symptoms: ["insomnia", "pain", "anxiety"],
  effects: ["relaxed", "sleepy"],
  flavors: ["earthy", "sweet"],
  description: null,
};

describe("normalizeSymptom", () => {
  it("lowercases and trims", () => {
    expect(normalizeSymptom(" Insomnia ")).toBe("insomnia");
  });
});

describe("scoreStrain", () => {
  it("rewards each matched symptom", () => {
    const r = scoreStrain(STRAIN, { symptoms: ["insomnia", "pain"] });
    expect(r.matchedSymptoms).toEqual(["insomnia", "pain"]);
    expect(r.score).toBeGreaterThanOrEqual(0.5);
  });

  it("treats sleep as synonym for insomnia", () => {
    const r = scoreStrain(STRAIN, { symptoms: ["sleep"] });
    expect(r.matchedSymptoms).toEqual(["sleep"]);
  });

  it("rewards classification match", () => {
    const base = scoreStrain(STRAIN, { symptoms: ["insomnia"] });
    const withClass = scoreStrain(STRAIN, {
      symptoms: ["insomnia"],
      preferredClassification: "indica",
    });
    expect(withClass.score).toBeGreaterThan(base.score);
  });

  it("hard penalizes when THC cap exceeded", () => {
    const high: StrainRow = { ...STRAIN, thcPercent: 30 };
    const r = scoreStrain(high, { symptoms: ["insomnia"], maxThcPercent: 18 });
    expect(r.score).toBeLessThanOrEqual(0);
  });

  it("rewards meeting CBD floor", () => {
    const cbdRich: StrainRow = { ...STRAIN, cbdPercent: 8 };
    const r = scoreStrain(cbdRich, { symptoms: ["pain"], minCbdPercent: 5 });
    expect(r.reasons.some((reason) => reason.includes("CBD"))).toBe(true);
  });

  it("caps score at 1", () => {
    const r = scoreStrain(STRAIN, {
      symptoms: ["insomnia", "pain", "anxiety"],
      preferredClassification: "indica",
      maxThcPercent: 25,
      minCbdPercent: 0,
    });
    expect(r.score).toBeLessThanOrEqual(1);
  });
});

describe("rankStrains", () => {
  const SAT_DAY: StrainRow = {
    ...STRAIN,
    id: "s2",
    slug: "sour-diesel",
    name: "Sour Diesel",
    classification: "sativa",
    symptoms: ["fatigue", "depression"],
    thcPercent: 22,
    cbdPercent: 0.1,
  };

  it("filters and sorts by score", () => {
    const ranked = rankStrains([STRAIN, SAT_DAY], {
      symptoms: ["insomnia"],
      preferredClassification: "indica",
    });
    expect(ranked[0].strain.id).toBe("s1");
    // Sour Diesel doesn't match insomnia; filtered out.
    expect(ranked.find((r) => r.strain.id === "s2")).toBeUndefined();
  });

  it("returns unranked rows when no symptoms or classification given", () => {
    const ranked = rankStrains([STRAIN, SAT_DAY], { symptoms: [] });
    expect(ranked).toHaveLength(2);
    expect(ranked[0].score).toBe(0);
  });
});

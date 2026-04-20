import { describe, expect, it } from "vitest";
import {
  DOSING_PROTOCOLS,
  cannabinoidProfile,
  filterProtocols,
  findProtocolById,
  protocolId,
  uniqueCannabinoids,
  uniqueConditions,
  type DosingProtocol,
} from "./cannabis-dosing-protocols";

const sample: DosingProtocol = {
  condition: "Chronic Pain",
  route: "sublingual",
  experienceLevel: "naive",
  startingDose: { thcMg: 1, cbdMg: 5 },
  titrationSteps: [
    { week: 1, thcMg: 1, cbdMg: 5, frequency: "qhs", notes: "" },
  ],
  maxDailyDose: { thcMg: 30, cbdMg: 60 },
  warnings: [],
  monitoringSchedule: "",
};

describe("protocolId", () => {
  it("produces a stable, URL-safe slug", () => {
    expect(protocolId(sample)).toBe("chronic-pain-sublingual-naive");
  });

  it("collapses non-alphanumeric characters in route", () => {
    const p = { ...sample, condition: "Chemotherapy-Induced Nausea", route: "inhaled + oral" };
    expect(protocolId(p)).toBe("chemotherapy-induced-nausea-inhaled-oral-naive");
  });

  it("is unique across the bundled protocol library", () => {
    const ids = DOSING_PROTOCOLS.map(protocolId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("findProtocolById", () => {
  it("returns the protocol whose slug matches", () => {
    const found = findProtocolById("insomnia-sublingual-naive");
    expect(found?.condition).toBe("Insomnia");
  });

  it("returns null for an unknown id", () => {
    expect(findProtocolById("does-not-exist")).toBeNull();
  });
});

describe("cannabinoidProfile", () => {
  it("classifies pure-CBD protocols as CBD", () => {
    const anxiety = DOSING_PROTOCOLS.find((p) => p.condition === "Anxiety")!;
    // Anxiety includes a week-4 optional 1mg THC microdose, so it's THC+CBD overall.
    expect(cannabinoidProfile(anxiety)).toBe("THC+CBD");
  });

  it("classifies treatment-resistant epilepsy as CBD-only", () => {
    const epilepsy = DOSING_PROTOCOLS.find((p) => p.condition === "Treatment-Resistant Epilepsy")!;
    expect(cannabinoidProfile(epilepsy)).toBe("CBD");
  });

  it("classifies chronic pain (THC + CBD) as THC+CBD", () => {
    expect(cannabinoidProfile(sample)).toBe("THC+CBD");
  });

  it("classifies THC-only protocols as THC", () => {
    const thcOnly: DosingProtocol = {
      ...sample,
      startingDose: { thcMg: 2, cbdMg: 0 },
      titrationSteps: [
        { week: 1, thcMg: 2, cbdMg: 0, frequency: "qhs", notes: "" },
      ],
    };
    expect(cannabinoidProfile(thcOnly)).toBe("THC");
  });
});

describe("filterProtocols", () => {
  it("returns all protocols when no filters provided", () => {
    expect(filterProtocols(DOSING_PROTOCOLS)).toHaveLength(DOSING_PROTOCOLS.length);
    expect(filterProtocols(DOSING_PROTOCOLS, {})).toHaveLength(DOSING_PROTOCOLS.length);
  });

  it("filters by condition substring case-insensitively", () => {
    const results = filterProtocols(DOSING_PROTOCOLS, { condition: "pain" });
    expect(results).toHaveLength(1);
    expect(results[0].condition).toBe("Chronic Pain");
  });

  it("filters by route substring", () => {
    const oral = filterProtocols(DOSING_PROTOCOLS, { route: "oral" });
    expect(oral.length).toBeGreaterThan(0);
    expect(oral.every((p) => p.route.toLowerCase().includes("oral"))).toBe(true);
  });

  it("filters by cannabinoid profile", () => {
    const cbdOnly = filterProtocols(DOSING_PROTOCOLS, { cannabinoid: "CBD" });
    expect(cbdOnly.every((p) => cannabinoidProfile(p) === "CBD")).toBe(true);
    expect(cbdOnly.some((p) => p.condition === "Treatment-Resistant Epilepsy")).toBe(true);
  });

  it("treats 'all' and 'ALL' as no cannabinoid filter", () => {
    const allLower = filterProtocols(DOSING_PROTOCOLS, { cannabinoid: "all" });
    const allUpper = filterProtocols(DOSING_PROTOCOLS, { cannabinoid: "ALL" });
    expect(allLower).toHaveLength(DOSING_PROTOCOLS.length);
    expect(allUpper).toHaveLength(DOSING_PROTOCOLS.length);
  });

  it("combines multiple filters (AND semantics)", () => {
    const results = filterProtocols(DOSING_PROTOCOLS, {
      condition: "epilepsy",
      cannabinoid: "CBD",
    });
    expect(results).toHaveLength(1);
    expect(results[0].condition).toBe("Treatment-Resistant Epilepsy");
  });

  it("returns empty when condition matches but cannabinoid does not", () => {
    const results = filterProtocols(DOSING_PROTOCOLS, {
      condition: "epilepsy",
      cannabinoid: "THC",
    });
    expect(results).toEqual([]);
  });

  it("ignores whitespace-only filter values", () => {
    const results = filterProtocols(DOSING_PROTOCOLS, { condition: "   " });
    expect(results).toHaveLength(DOSING_PROTOCOLS.length);
  });
});

describe("uniqueConditions / uniqueCannabinoids", () => {
  it("returns sorted unique condition names", () => {
    const conditions = uniqueConditions();
    expect(conditions).toEqual([...conditions].sort());
    expect(new Set(conditions).size).toBe(conditions.length);
    expect(conditions).toContain("Insomnia");
  });

  it("returns canonical cannabinoid order", () => {
    const cannabinoids = uniqueCannabinoids();
    // Should only contain known profiles, in the canonical order THC, CBD, THC+CBD
    const canonical = ["THC", "CBD", "THC+CBD"];
    expect(cannabinoids.every((c) => canonical.includes(c))).toBe(true);
    // Preserve canonical sort order
    const indices = cannabinoids.map((c) => canonical.indexOf(c));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});

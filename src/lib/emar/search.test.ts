import { describe, expect, it } from "vitest";
import { searchEmarDrugs, getFormulation } from "./search";

describe("searchEmarDrugs", () => {
  it("returns top hits for an empty query", () => {
    const r = searchEmarDrugs("");
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it("matches by brand name", () => {
    const r = searchEmarDrugs("Lipitor");
    expect(r.hits.some((h) => h.drug.id === "drug_atorvastatin")).toBe(true);
  });

  it("matches by indication keyword", () => {
    const r = searchEmarDrugs("Hypertension");
    const ids = r.hits.map((h) => h.drug.id);
    expect(ids).toContain("drug_lisinopril");
    expect(ids).toContain("drug_amlodipine");
  });

  it("each hit includes its formulations", () => {
    const r = searchEmarDrugs("metformin");
    const m = r.hits.find((h) => h.drug.id === "drug_metformin");
    expect(m?.formulations.length).toBeGreaterThan(0);
  });
});

describe("getFormulation", () => {
  it("returns the drug + formulation pair", () => {
    const f = getFormulation("form_atorvastatin_40");
    expect(f?.drug.name).toBe("Atorvastatin");
    expect(f?.formulation.strengthValue).toBe(40);
  });

  it("returns null for unknown ids", () => {
    expect(getFormulation("nope")).toBeNull();
  });
});

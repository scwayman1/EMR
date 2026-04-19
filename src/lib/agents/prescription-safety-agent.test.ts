import { describe, expect, it } from "vitest";
import { extractOverriddenContraindicationIds } from "./prescription-safety-agent";

describe("extractOverriddenContraindicationIds", () => {
  it("returns the id array from a well-shaped override record", () => {
    const override = {
      contraindicationIds: ["schizophrenia", "bipolar_type_1"],
      reason: "Physician override because...",
      overriddenByUserId: "user-1",
      overriddenAt: "2026-04-18T12:00:00Z",
    };
    expect(extractOverriddenContraindicationIds(override)).toEqual([
      "schizophrenia",
      "bipolar_type_1",
    ]);
  });

  it("returns [] when override is null, undefined, or not an object", () => {
    expect(extractOverriddenContraindicationIds(null)).toEqual([]);
    expect(extractOverriddenContraindicationIds(undefined)).toEqual([]);
    expect(extractOverriddenContraindicationIds("not an object")).toEqual([]);
    expect(extractOverriddenContraindicationIds(42)).toEqual([]);
  });

  it("returns [] when contraindicationIds field is missing or wrong type", () => {
    expect(extractOverriddenContraindicationIds({})).toEqual([]);
    expect(
      extractOverriddenContraindicationIds({ contraindicationIds: "not-an-array" }),
    ).toEqual([]);
    expect(
      extractOverriddenContraindicationIds({ contraindicationIds: null }),
    ).toEqual([]);
  });

  it("filters out non-string entries from the id array", () => {
    const override = {
      contraindicationIds: ["schizophrenia", 42, null, "bipolar_type_1"],
    };
    expect(extractOverriddenContraindicationIds(override)).toEqual([
      "schizophrenia",
      "bipolar_type_1",
    ]);
  });

  it("handles an empty id array", () => {
    expect(
      extractOverriddenContraindicationIds({ contraindicationIds: [] }),
    ).toEqual([]);
  });
});

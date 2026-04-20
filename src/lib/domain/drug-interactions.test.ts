import { describe, it, expect } from "vitest";
import {
  checkInteractions,
  getSeverityLabel,
  type Severity,
} from "./drug-interactions";

/**
 * These tests cover the matching behaviour of the shared drug-interactions
 * domain module. The public-facing Drug Mix feature at
 * /education/drug-mix and the clinician-side tools both depend on this
 * function, so the behaviour is centralised here.
 */

describe("checkInteractions — matching logic", () => {
  it("returns a red interaction for warfarin + CBD (brand name match)", () => {
    const results = checkInteractions(["Coumadin 5mg"], ["CBD"]);
    const warfarin = results.find((r) => r.drug === "warfarin");
    expect(warfarin).toBeDefined();
    expect(warfarin?.severity).toBe<Severity>("red");
    expect(warfarin?.cannabinoid).toBe("CBD");
  });

  it("matches medications case-insensitively and trims whitespace", () => {
    const upper = checkInteractions(["  WARFARIN  "], ["CBD"]);
    const lower = checkInteractions(["warfarin"], ["cbd"]);
    expect(upper.map((r) => r.drug)).toEqual(lower.map((r) => r.drug));
    expect(upper.length).toBeGreaterThan(0);
  });

  it("matches alprazolam + THC as a yellow (use-with-caution) interaction", () => {
    const results = checkInteractions(["Xanax"], ["THC"]);
    const hit = results.find((r) => r.drug === "alprazolam");
    expect(hit?.severity).toBe<Severity>("yellow");
  });

  it("matches ibuprofen + THC as green (no significant interaction)", () => {
    const results = checkInteractions(["ibuprofen"], ["THC"]);
    const hit = results.find((r) => r.drug === "ibuprofen");
    expect(hit?.severity).toBe<Severity>("green");
  });

  it("returns an empty list when a medication is unknown", () => {
    const results = checkInteractions(["fictional-drug-xyz"], ["THC", "CBD"]);
    expect(results).toEqual([]);
  });

  it("filters by cannabinoid — clobazam is only flagged for CBD, not THC", () => {
    const cbd = checkInteractions(["clobazam"], ["CBD"]);
    const thc = checkInteractions(["clobazam"], ["THC"]);
    expect(cbd.some((r) => r.drug === "clobazam" && r.severity === "red")).toBe(
      true
    );
    expect(thc.some((r) => r.drug === "clobazam")).toBe(false);
  });

  it("deduplicates when the same drug + cannabinoid could match multiple inputs", () => {
    // Two entries that point at the same warfarin row shouldn't produce
    // two rows in the output.
    const results = checkInteractions(["warfarin", "coumadin"], ["CBD"]);
    const warfarinCBD = results.filter(
      (r) => r.drug === "warfarin" && r.cannabinoid === "CBD"
    );
    expect(warfarinCBD).toHaveLength(1);
  });

  it("sorts results red → yellow → green", () => {
    const results = checkInteractions(
      ["warfarin", "ibuprofen", "alprazolam"],
      ["THC", "CBD"]
    );
    const severities = results.map((r) => r.severity);
    const order: Record<Severity, number> = { red: 0, yellow: 1, green: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(
        order[severities[i - 1]]
      );
    }
  });
});

describe("getSeverityLabel", () => {
  it("returns human-readable labels for each severity", () => {
    expect(getSeverityLabel("red")).toMatch(/contra/i);
    expect(getSeverityLabel("yellow")).toMatch(/caution/i);
    expect(getSeverityLabel("green")).toMatch(/no known/i);
  });
});

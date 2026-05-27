import { describe, it, expect } from "vitest";
import {
  isFullyActionable,
  filterActionable,
  assertActionable,
} from "./legal-status-filter";
import type { CitationRef } from "@/lib/marketplace/state-legality-matrix";

const enacted: CitationRef = { label: "Statute A", status: "enacted" };
const settled: CitationRef = { label: "Settled case B", status: "settled" };
const pending: CitationRef = { label: "Pending bill C", status: "pending" };
const appealed: CitationRef = { label: "Appealed ruling D", status: "appealed" };

describe("isFullyActionable", () => {
  it("returns true when all citations are enacted or settled", () => {
    expect(isFullyActionable([enacted, settled])).toBe(true);
  });
  it("returns false when any citation is non-final", () => {
    expect(isFullyActionable([enacted, pending])).toBe(false);
    expect(isFullyActionable([appealed])).toBe(false);
  });
  it("returns false for empty citation list (no claim is actionable)", () => {
    expect(isFullyActionable([])).toBe(false);
  });
});

describe("filterActionable", () => {
  it("partitions records into actionable + rejected with reasons", () => {
    const records = [
      { id: 1, citations: [enacted] },
      { id: 2, citations: [pending] },
      { id: 3, citations: [enacted, settled] },
      { id: 4, citations: [] as CitationRef[] },
    ];
    const result = filterActionable(records);
    expect(result.actionable.map((r) => r.id)).toEqual([1, 3]);
    expect(result.rejected.map((r) => r.record.id)).toEqual([2, 4]);
    expect(result.rejected[0].reason).toContain("non-final");
    expect(result.rejected[1].reason).toContain("no citations");
  });
});

describe("assertActionable", () => {
  it("does not throw on enacted citations", () => {
    expect(() => assertActionable([enacted], "test")).not.toThrow();
  });
  it("throws on a pending citation with a useful error message", () => {
    expect(() => assertActionable([enacted, pending], "ship gate"))
      .toThrow(/ship gate.*non-final/);
  });
  it("throws if no citations are provided", () => {
    expect(() => assertActionable([], "ship gate")).toThrow(/refusing/);
  });
});

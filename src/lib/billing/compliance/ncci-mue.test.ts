import { describe, expect, it } from "vitest";
import { currentQuarter, isLoadStatusStale, quartersBehind } from "./ncci-mue";

describe("currentQuarter", () => {
  it("formats as YYYYQN", () => {
    expect(currentQuarter(new Date(Date.UTC(2026, 3, 15)))).toBe("2026Q2");
    expect(currentQuarter(new Date(Date.UTC(2026, 0, 1)))).toBe("2026Q1");
    expect(currentQuarter(new Date(Date.UTC(2026, 11, 31)))).toBe("2026Q4");
  });
});

describe("quartersBehind", () => {
  it("0 when loaded == current", () => {
    expect(quartersBehind("2026Q2", new Date(Date.UTC(2026, 3, 15)))).toBe(0);
  });
  it("1 when one quarter old", () => {
    expect(quartersBehind("2026Q1", new Date(Date.UTC(2026, 3, 15)))).toBe(1);
  });
  it("infinity when never loaded", () => {
    expect(quartersBehind(null)).toBe(Infinity);
  });
});

describe("isLoadStatusStale", () => {
  it("not stale within the 30-day grace window of a new quarter", () => {
    // Just rolled into Q2; we're still on Q1's tables — that's allowed
    // for the first 30 days.
    expect(
      isLoadStatusStale("2026Q1", new Date(Date.UTC(2026, 0, 15)), new Date(Date.UTC(2026, 3, 10))),
    ).toBe(false);
  });
  it("stale past day 30 of the new quarter", () => {
    expect(
      isLoadStatusStale("2026Q1", new Date(Date.UTC(2026, 0, 15)), new Date(Date.UTC(2026, 4, 15))),
    ).toBe(true);
  });
  it("stale when never loaded", () => {
    expect(isLoadStatusStale(null, null)).toBe(true);
  });
  it("stale when 2+ quarters behind regardless of day", () => {
    expect(
      isLoadStatusStale("2025Q4", new Date(Date.UTC(2025, 9, 1)), new Date(Date.UTC(2026, 3, 5))),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { computeTrend, denialSeverity, arSeverity } from "./owner-kpis";

describe("computeTrend", () => {
  it("returns flat with 0% when current equals prior", () => {
    expect(computeTrend(100, 100)).toEqual({ direction: "flat", percent: 0 });
    expect(computeTrend(0, 0)).toEqual({ direction: "flat", percent: 0 });
  });

  it("returns up with positive percent when current > prior", () => {
    expect(computeTrend(120, 100)).toEqual({ direction: "up", percent: 20 });
  });

  it("returns down with negative percent when current < prior", () => {
    expect(computeTrend(80, 100)).toEqual({ direction: "down", percent: -20 });
  });

  it("rounds to one decimal", () => {
    // (110 - 100) / 100 = 10.0 exact
    expect(computeTrend(110, 100).percent).toBe(10);
    // (133 - 100) / 100 = 33.0 exact
    expect(computeTrend(133, 100).percent).toBe(33);
    // (101 - 99) / 99 ≈ 2.020... → rounded to 2
    expect(computeTrend(101, 99).percent).toBe(2);
  });

  it("returns up with null percent when prior is 0 and current > 0", () => {
    expect(computeTrend(50, 0)).toEqual({ direction: "up", percent: null });
  });

  it("treats negative current with prior=0 as down", () => {
    // unusual, but defensive: -1 vs 0 should not divide
    expect(computeTrend(-1, 0)).toEqual({ direction: "down", percent: null });
  });
});

describe("denialSeverity", () => {
  it("is good when there are no denials", () => {
    expect(denialSeverity({ unresolvedCount: 0, oldestDays: null })).toBe("good");
  });

  it("is good when oldest is fresh (≤14 days)", () => {
    expect(denialSeverity({ unresolvedCount: 5, oldestDays: 0 })).toBe("good");
    expect(denialSeverity({ unresolvedCount: 5, oldestDays: 14 })).toBe("good");
  });

  it("is warn when oldest is 15-30 days", () => {
    expect(denialSeverity({ unresolvedCount: 1, oldestDays: 15 })).toBe("warn");
    expect(denialSeverity({ unresolvedCount: 1, oldestDays: 30 })).toBe("warn");
  });

  it("is bad when oldest is >30 days", () => {
    expect(denialSeverity({ unresolvedCount: 1, oldestDays: 31 })).toBe("bad");
    expect(denialSeverity({ unresolvedCount: 1, oldestDays: 90 })).toBe("bad");
  });

  it("is good when count > 0 but oldestDays is null (data inconsistency)", () => {
    // Defensive: if oldestDays is unknown we don't escalate.
    expect(denialSeverity({ unresolvedCount: 3, oldestDays: null })).toBe("good");
  });
});

describe("arSeverity", () => {
  it("is good when nothing is past due", () => {
    expect(arSeverity({ arAgingCents: 0, oldestPastDueDays: null })).toBe("good");
  });

  it("is warn when there is past due under both thresholds", () => {
    expect(arSeverity({ arAgingCents: 50_000, oldestPastDueDays: 35 })).toBe("warn");
    expect(arSeverity({ arAgingCents: 999_999, oldestPastDueDays: 60 })).toBe("warn");
  });

  it("is bad when arAgingCents > $10k", () => {
    expect(arSeverity({ arAgingCents: 1_000_001, oldestPastDueDays: 35 })).toBe("bad");
  });

  it("is bad when oldest past-due > 60 days", () => {
    expect(arSeverity({ arAgingCents: 5_000, oldestPastDueDays: 61 })).toBe("bad");
  });

  it("is bad when both thresholds are crossed", () => {
    expect(arSeverity({ arAgingCents: 5_000_000, oldestPastDueDays: 120 })).toBe("bad");
  });
});

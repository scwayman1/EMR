import { describe, it, expect } from "vitest";
import {
  BENCHMARK_FEATURES,
  categoryScores,
  gapAreas,
  overallParity,
} from "./benchmark";

describe("benchmark matrix", () => {
  it("every feature has a unique id", () => {
    const ids = BENCHMARK_FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ticketed gaps reference real EMR ticket ids", () => {
    for (const f of BENCHMARK_FEATURES) {
      if (f.ticket) {
        expect(f.ticket).toMatch(/^EMR-\d+$/);
      }
    }
  });
});

describe("categoryScores", () => {
  it("partial gets half credit, shipped gets full credit", () => {
    const scores = categoryScores();
    for (const s of scores) {
      expect(s.parityScore).toBeGreaterThanOrEqual(0);
      expect(s.parityScore).toBeLessThanOrEqual(1);
      const expected =
        s.total === 0 ? 0 : (s.shipped + 0.5 * s.partial) / s.total;
      expect(s.parityScore).toBeCloseTo(expected);
    }
  });

  it("totals sum back to the feature count", () => {
    const totalFromBuckets = categoryScores().reduce((acc, s) => acc + s.total, 0);
    expect(totalFromBuckets).toBe(BENCHMARK_FEATURES.length);
  });
});

describe("gapAreas", () => {
  it("excludes shipped features", () => {
    expect(gapAreas().every((f) => f.theleafmartStatus !== "shipped")).toBe(true);
  });

  it("orders P0 before P1 before P2", () => {
    const gaps = gapAreas();
    const order = { P0: 0, P1: 1, P2: 2 } as const;
    for (let i = 1; i < gaps.length; i++) {
      expect(order[gaps[i].priority]).toBeGreaterThanOrEqual(
        order[gaps[i - 1].priority],
      );
    }
  });
});

describe("overallParity", () => {
  it("returns a value between 0 and 1", () => {
    const parity = overallParity();
    expect(parity).toBeGreaterThanOrEqual(0);
    expect(parity).toBeLessThanOrEqual(1);
  });
});

import { describe, it, expect } from "vitest";
import {
  computeProductEfficacyScore,
  productRanking,
  type ProductOutcomeLike,
} from "./product-outcomes";

const NOW = new Date("2026-04-20T12:00:00Z");

function log(
  partial: Partial<ProductOutcomeLike> & { effectivenessScore: number },
): ProductOutcomeLike {
  return {
    productId: partial.productId ?? "prod-1",
    effectivenessScore: partial.effectivenessScore,
    sideEffects: partial.sideEffects ?? [],
    loggedAt: partial.loggedAt ?? NOW,
  };
}

describe("computeProductEfficacyScore", () => {
  it("returns null when there are no logs", () => {
    expect(computeProductEfficacyScore([], NOW)).toBeNull();
  });

  it("returns null when all scores are out of range", () => {
    expect(
      computeProductEfficacyScore(
        [log({ effectivenessScore: 0 }), log({ effectivenessScore: 11 })],
        NOW,
      ),
    ).toBeNull();
  });

  it("returns the exact score for a single same-day log with no side effects", () => {
    expect(
      computeProductEfficacyScore([log({ effectivenessScore: 8 })], NOW),
    ).toBeCloseTo(8, 5);
  });

  it("averages multiple same-day logs with no side effects", () => {
    const result = computeProductEfficacyScore(
      [log({ effectivenessScore: 6 }), log({ effectivenessScore: 10 })],
      NOW,
    );
    expect(result).toBeCloseTo(8, 5);
  });

  it("penalizes scores when side effects are present", () => {
    const clean = computeProductEfficacyScore(
      [log({ effectivenessScore: 9 })],
      NOW,
    );
    const noisy = computeProductEfficacyScore(
      [log({ effectivenessScore: 9, sideEffects: ["dry mouth", "headache"] })],
      NOW,
    );
    // 2 side effects * 0.6 penalty = 1.2, so noisy should be ~ 7.8
    expect(clean).toBeCloseTo(9, 5);
    expect(noisy).toBeCloseTo(7.8, 5);
    expect(noisy!).toBeLessThan(clean!);
  });

  it("weights recent logs more heavily than old logs", () => {
    const oldLog = log({
      effectivenessScore: 2,
      loggedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const recentLog = log({
      effectivenessScore: 10,
      loggedAt: NOW,
    });
    // Recent 10 should pull the weighted mean much closer to 10 than
    // a naive arithmetic mean of 6 would suggest.
    const score = computeProductEfficacyScore([oldLog, recentLog], NOW);
    expect(score).toBeGreaterThan(8);
  });

  it("clamps the final score into [0, 10]", () => {
    // 10 across the board with 50 side effects would go massively negative.
    const all = Array.from({ length: 3 }, () =>
      log({
        effectivenessScore: 10,
        sideEffects: Array.from({ length: 50 }, (_, i) => `se-${i}`),
      }),
    );
    const score = computeProductEfficacyScore(all, NOW);
    expect(score).toBe(0);
  });

  it("ignores out-of-range scores but uses the valid ones", () => {
    const score = computeProductEfficacyScore(
      [
        log({ effectivenessScore: 8 }),
        log({ effectivenessScore: 999 }),
        log({ effectivenessScore: -4 }),
      ],
      NOW,
    );
    expect(score).toBeCloseTo(8, 5);
  });

  it("accepts ISO string dates for loggedAt", () => {
    const score = computeProductEfficacyScore(
      [
        {
          productId: "p",
          effectivenessScore: 7,
          sideEffects: [],
          loggedAt: NOW.toISOString(),
        },
      ],
      NOW,
    );
    expect(score).toBeCloseTo(7, 5);
  });
});

describe("productRanking", () => {
  it("returns an empty list when there are no outcomes", () => {
    expect(productRanking([], NOW)).toEqual([]);
  });

  it("groups outcomes by productId and sorts by avgScore desc", () => {
    const outcomes: ProductOutcomeLike[] = [
      log({ productId: "a", effectivenessScore: 5 }),
      log({ productId: "b", effectivenessScore: 9 }),
      log({ productId: "c", effectivenessScore: 7 }),
    ];
    const ranked = productRanking(outcomes, NOW);
    expect(ranked.map((r) => r.productId)).toEqual(["b", "c", "a"]);
  });

  it("includes correct sampleSize per product", () => {
    const outcomes: ProductOutcomeLike[] = [
      log({ productId: "a", effectivenessScore: 5 }),
      log({ productId: "a", effectivenessScore: 7 }),
      log({ productId: "b", effectivenessScore: 9 }),
    ];
    const ranked = productRanking(outcomes, NOW);
    const a = ranked.find((r) => r.productId === "a")!;
    const b = ranked.find((r) => r.productId === "b")!;
    expect(a.sampleSize).toBe(2);
    expect(b.sampleSize).toBe(1);
  });

  it("breaks ties on sampleSize then on recency", () => {
    const base = new Date("2026-04-10T00:00:00Z");
    const newer = new Date("2026-04-18T00:00:00Z");
    const outcomes: ProductOutcomeLike[] = [
      // Both products score 8, but 'x' has 2 logs vs 'y' has 1.
      log({ productId: "x", effectivenessScore: 8, loggedAt: base }),
      log({ productId: "x", effectivenessScore: 8, loggedAt: base }),
      log({ productId: "y", effectivenessScore: 8, loggedAt: newer }),
    ];
    const ranked = productRanking(outcomes, NOW);
    // With tied scores and different sample sizes, larger sample wins.
    expect(ranked[0].productId).toBe("x");
    expect(ranked[1].productId).toBe("y");
  });

  it("skips products whose logs are all out of range", () => {
    const outcomes: ProductOutcomeLike[] = [
      log({ productId: "good", effectivenessScore: 7 }),
      log({ productId: "trash", effectivenessScore: 42 }),
    ];
    const ranked = productRanking(outcomes, NOW);
    expect(ranked.map((r) => r.productId)).toEqual(["good"]);
  });

  it("records latestLoggedAt per product", () => {
    const earlier = new Date("2026-04-10T00:00:00Z");
    const later = new Date("2026-04-19T00:00:00Z");
    const outcomes: ProductOutcomeLike[] = [
      log({ productId: "p", effectivenessScore: 6, loggedAt: earlier }),
      log({ productId: "p", effectivenessScore: 9, loggedAt: later }),
    ];
    const ranked = productRanking(outcomes, NOW);
    expect(ranked[0].latestLoggedAt?.toISOString()).toBe(later.toISOString());
  });
});

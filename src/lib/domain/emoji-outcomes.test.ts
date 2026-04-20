import { describe, it, expect } from "vitest";
import {
  FEELING_LABELS,
  computeAverageRelief,
  countByFeeling,
  type EmojiFeeling,
  type EmojiOutcomeRecord,
} from "./emoji-outcomes";

describe("FEELING_LABELS", () => {
  it("defines emoji + label for every feeling enum value", () => {
    const keys: EmojiFeeling[] = [
      "much_better",
      "better",
      "same",
      "worse",
      "much_worse",
    ];
    for (const k of keys) {
      expect(FEELING_LABELS[k].emoji).toMatch(/.+/);
      expect(FEELING_LABELS[k].label).toMatch(/.+/);
    }
  });
});

describe("computeAverageRelief", () => {
  it("returns 0 for an empty list", () => {
    expect(computeAverageRelief([])).toBe(0);
  });

  it("returns the single value for a one-entry list", () => {
    const outcomes: EmojiOutcomeRecord[] = [
      { feeling: "better", reliefLevel: 7 },
    ];
    expect(computeAverageRelief(outcomes)).toBe(7);
  });

  it("averages multiple entries", () => {
    const outcomes: EmojiOutcomeRecord[] = [
      { feeling: "much_better", reliefLevel: 10 },
      { feeling: "better", reliefLevel: 8 },
      { feeling: "same", reliefLevel: 5 },
      { feeling: "worse", reliefLevel: 3 },
    ];
    // (10 + 8 + 5 + 3) / 4 = 6.5
    expect(computeAverageRelief(outcomes)).toBe(6.5);
  });

  it("rounds to 2 decimal places", () => {
    const outcomes: EmojiOutcomeRecord[] = [
      { feeling: "better", reliefLevel: 7 },
      { feeling: "better", reliefLevel: 7 },
      { feeling: "better", reliefLevel: 8 },
    ];
    // 22 / 3 = 7.333... -> 7.33
    expect(computeAverageRelief(outcomes)).toBe(7.33);
  });
});

describe("countByFeeling", () => {
  it("returns all-zero record for an empty list", () => {
    expect(countByFeeling([])).toEqual({
      much_better: 0,
      better: 0,
      same: 0,
      worse: 0,
      much_worse: 0,
    });
  });

  it("counts a single entry", () => {
    const outcomes: EmojiOutcomeRecord[] = [
      { feeling: "much_better", reliefLevel: 10 },
    ];
    expect(countByFeeling(outcomes)).toEqual({
      much_better: 1,
      better: 0,
      same: 0,
      worse: 0,
      much_worse: 0,
    });
  });

  it("tallies a mixed list", () => {
    const outcomes: EmojiOutcomeRecord[] = [
      { feeling: "much_better", reliefLevel: 10 },
      { feeling: "much_better", reliefLevel: 9 },
      { feeling: "better", reliefLevel: 7 },
      { feeling: "same", reliefLevel: 5 },
      { feeling: "worse", reliefLevel: 3 },
      { feeling: "worse", reliefLevel: 2 },
      { feeling: "much_worse", reliefLevel: 1 },
    ];
    expect(countByFeeling(outcomes)).toEqual({
      much_better: 2,
      better: 1,
      same: 1,
      worse: 2,
      much_worse: 1,
    });
  });

  it("handles a list that only contains one feeling", () => {
    const outcomes: EmojiOutcomeRecord[] = Array.from({ length: 5 }, () => ({
      feeling: "same" as const,
      reliefLevel: 5,
    }));
    const counts = countByFeeling(outcomes);
    expect(counts.same).toBe(5);
    expect(counts.much_better).toBe(0);
    expect(counts.much_worse).toBe(0);
  });
});

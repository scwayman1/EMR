import { describe, expect, it } from "vitest";
import {
  computeTrend,
  getCurrentWeekStart,
  WEEKLY_OUTCOME_SCALES,
  type WeeklyOutcomePoint,
} from "./weekly-outcomes";

// ─────────────────────────────────────────────────────────────────────────────
// getCurrentWeekStart — Monday-UTC week boundary math
// ─────────────────────────────────────────────────────────────────────────────

describe("getCurrentWeekStart", () => {
  it("returns Monday UTC unchanged when given a Monday at midnight UTC", () => {
    // Monday 2026-04-20 00:00:00 UTC
    const monday = new Date(Date.UTC(2026, 3, 20, 0, 0, 0, 0));
    expect(getCurrentWeekStart(monday).toISOString()).toBe(
      "2026-04-20T00:00:00.000Z",
    );
  });

  it("returns the previous Monday when given a Sunday", () => {
    // Sunday 2026-04-19 (any time of day)
    const sunday = new Date(Date.UTC(2026, 3, 19, 23, 59, 59, 999));
    expect(getCurrentWeekStart(sunday).toISOString()).toBe(
      "2026-04-13T00:00:00.000Z",
    );
  });

  it("returns the most recent Monday when given a Saturday", () => {
    // Saturday 2026-04-25
    const saturday = new Date(Date.UTC(2026, 3, 25, 12, 0, 0, 0));
    expect(getCurrentWeekStart(saturday).toISOString()).toBe(
      "2026-04-20T00:00:00.000Z",
    );
  });

  it("zeros hours/minutes/seconds/milliseconds for a mid-week call", () => {
    // Wednesday 2026-04-22 17:34:12.456 UTC
    const wednesday = new Date(Date.UTC(2026, 3, 22, 17, 34, 12, 456));
    const result = getCurrentWeekStart(wednesday);
    expect(result.toISOString()).toBe("2026-04-20T00:00:00.000Z");
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it("handles month boundaries (Sun May 3 → Mon Apr 27)", () => {
    const sunday = new Date(Date.UTC(2026, 4, 3, 8, 0, 0, 0));
    expect(getCurrentWeekStart(sunday).toISOString()).toBe(
      "2026-04-27T00:00:00.000Z",
    );
  });

  it("handles year boundaries (Sun Jan 3 2027 → Mon Dec 28 2026)", () => {
    const sunday = new Date(Date.UTC(2027, 0, 3, 1, 0, 0, 0));
    expect(getCurrentWeekStart(sunday).toISOString()).toBe(
      "2026-12-28T00:00:00.000Z",
    );
  });

  it("is idempotent: f(f(x)) === f(x)", () => {
    const midweek = new Date(Date.UTC(2026, 3, 22, 9, 15, 0, 0));
    const once = getCurrentWeekStart(midweek);
    const twice = getCurrentWeekStart(once);
    expect(twice.toISOString()).toBe(once.toISOString());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeTrend — 4-week rolling window trend per dimension
// ─────────────────────────────────────────────────────────────────────────────

function week(
  isoMonday: string,
  scores: { pain: number; sleep: number; anxiety: number; mood: number },
): WeeklyOutcomePoint {
  return {
    weekStartDate: new Date(isoMonday),
    painScore: scores.pain,
    sleepScore: scores.sleep,
    anxietyScore: scores.anxiety,
    moodScore: scores.mood,
  };
}

describe("computeTrend", () => {
  it("returns all-steady for an empty history", () => {
    expect(computeTrend([])).toEqual({
      pain: "steady",
      sleep: "steady",
      anxiety: "steady",
      mood: "steady",
    });
  });

  it("returns all-steady with a single week of data (no delta possible)", () => {
    const out = computeTrend([
      week("2026-04-20T00:00:00.000Z", {
        pain: 7,
        sleep: 3,
        anxiety: 8,
        mood: 4,
      }),
    ]);
    expect(out).toEqual({
      pain: "steady",
      sleep: "steady",
      anxiety: "steady",
      mood: "steady",
    });
  });

  it("flags improvement for pain going DOWN week-over-week (higher=worse)", () => {
    const out = computeTrend([
      week("2026-04-13T00:00:00.000Z", {
        pain: 8,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 4,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
    ]);
    expect(out.pain).toBe("improving");
  });

  it("flags improvement for sleep going UP week-over-week (higher=better)", () => {
    const out = computeTrend([
      week("2026-04-13T00:00:00.000Z", {
        pain: 5,
        sleep: 3,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 5,
        sleep: 8,
        anxiety: 5,
        mood: 5,
      }),
    ]);
    expect(out.sleep).toBe("improving");
  });

  it("flags worsening for anxiety going UP (higher=worse)", () => {
    const out = computeTrend([
      week("2026-04-13T00:00:00.000Z", {
        pain: 5,
        sleep: 5,
        anxiety: 3,
        mood: 5,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 5,
        sleep: 5,
        anxiety: 8,
        mood: 5,
      }),
    ]);
    expect(out.anxiety).toBe("worsening");
  });

  it("flags worsening for mood going DOWN (higher=better)", () => {
    const out = computeTrend([
      week("2026-04-13T00:00:00.000Z", {
        pain: 5,
        sleep: 5,
        anxiety: 5,
        mood: 9,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 5,
        sleep: 5,
        anxiety: 5,
        mood: 3,
      }),
    ]);
    expect(out.mood).toBe("worsening");
  });

  it("stays steady within the ±0.5 noise band (pain 7 → 7.2 equiv)", () => {
    // Two points at 7 and 7 — zero delta.
    const out = computeTrend([
      week("2026-04-13T00:00:00.000Z", {
        pain: 7,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 7,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
    ]);
    expect(out.pain).toBe("steady");
  });

  it("averages earlier vs later halves for 4 weeks of data", () => {
    // Pain: [8, 8, 4, 4] — early avg 8, late avg 4 → improving.
    // Sleep: [3, 3, 8, 8] — early avg 3, late avg 8 → improving.
    // Anxiety: [2, 2, 9, 9] — early avg 2, late avg 9 → worsening.
    // Mood: [9, 9, 2, 2] — early avg 9, late avg 2 → worsening.
    const out = computeTrend([
      week("2026-03-30T00:00:00.000Z", {
        pain: 8,
        sleep: 3,
        anxiety: 2,
        mood: 9,
      }),
      week("2026-04-06T00:00:00.000Z", {
        pain: 8,
        sleep: 3,
        anxiety: 2,
        mood: 9,
      }),
      week("2026-04-13T00:00:00.000Z", {
        pain: 4,
        sleep: 8,
        anxiety: 9,
        mood: 2,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 4,
        sleep: 8,
        anxiety: 9,
        mood: 2,
      }),
    ]);
    expect(out).toEqual({
      pain: "improving",
      sleep: "improving",
      anxiety: "worsening",
      mood: "worsening",
    });
  });

  it("only looks at the most recent 4 weeks when given 5", () => {
    // The oldest week (pain=10) should be dropped. The remaining 4:
    // pain = [2, 2, 2, 2] → steady.
    const out = computeTrend([
      week("2026-03-23T00:00:00.000Z", {
        pain: 10,
        sleep: 10,
        anxiety: 1,
        mood: 10,
      }),
      week("2026-03-30T00:00:00.000Z", {
        pain: 2,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-06T00:00:00.000Z", {
        pain: 2,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-13T00:00:00.000Z", {
        pain: 2,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-20T00:00:00.000Z", {
        pain: 2,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
    ]);
    expect(out.pain).toBe("steady");
  });

  it("handles unsorted input by sorting by weekStartDate", () => {
    // Intentionally pass the weeks out of order — result should be the
    // same as the sorted case (pain getting better over time).
    const out = computeTrend([
      week("2026-04-20T00:00:00.000Z", {
        pain: 3,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
      week("2026-04-13T00:00:00.000Z", {
        pain: 9,
        sleep: 5,
        anxiety: 5,
        mood: 5,
      }),
    ]);
    expect(out.pain).toBe("improving");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY_OUTCOME_SCALES metadata shape
// ─────────────────────────────────────────────────────────────────────────────

describe("WEEKLY_OUTCOME_SCALES", () => {
  it("covers exactly the four dimensions with anchor labels at BOTH ends", () => {
    const dims = WEEKLY_OUTCOME_SCALES.map((s) => s.dimension).sort();
    expect(dims).toEqual(["anxiety", "mood", "pain", "sleep"]);
    for (const s of WEEKLY_OUTCOME_SCALES) {
      expect(s.lowLabel).toBeTruthy();
      expect(s.highLabel).toBeTruthy();
      expect(s.lowEmoji).toBeTruthy();
      expect(s.highEmoji).toBeTruthy();
    }
  });
});

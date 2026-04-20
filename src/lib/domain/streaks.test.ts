import { describe, expect, it } from "vitest";
import {
  advanceStreak,
  computeStreak,
  emptyStreakRecord,
  isActiveToday,
  startOfUtcDay,
  type StreakRecord,
} from "./streaks";

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Construct a UTC-anchored Date at the given clock time on a specific day. */
function utcAt(iso: string): Date {
  // All inputs in these tests are explicit "Z" strings so runs are tz-stable.
  return new Date(iso);
}

function makeRecord(overrides: Partial<StreakRecord> = {}): StreakRecord {
  return {
    ...emptyStreakRecord("pat_1", "dose_log"),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// advanceStreak
// ─────────────────────────────────────────────────────────────────────────────
describe("advanceStreak", () => {
  it("starts a streak at 1 on the first ever activity", () => {
    const next = advanceStreak(makeRecord(), utcAt("2026-04-20T14:30:00Z"));
    expect(next.currentStreakDays).toBe(1);
    expect(next.longestStreakDays).toBe(1);
    expect(next.lastActivityDate?.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("extends the streak on a consecutive UTC day", () => {
    const start = advanceStreak(makeRecord(), utcAt("2026-04-20T10:00:00Z"));
    const next = advanceStreak(start, utcAt("2026-04-21T09:00:00Z"));
    expect(next.currentStreakDays).toBe(2);
    expect(next.longestStreakDays).toBe(2);
  });

  it("builds a multi-day consecutive streak and updates longest in lockstep", () => {
    let rec = makeRecord();
    for (let day = 20; day <= 26; day++) {
      const iso = `2026-04-${String(day).padStart(2, "0")}T12:00:00Z`;
      rec = advanceStreak(rec, utcAt(iso));
    }
    expect(rec.currentStreakDays).toBe(7);
    expect(rec.longestStreakDays).toBe(7);
  });

  it("does NOT increment when a second activity arrives the same UTC day", () => {
    const morning = advanceStreak(makeRecord(), utcAt("2026-04-20T08:00:00Z"));
    const evening = advanceStreak(morning, utcAt("2026-04-20T22:45:00Z"));
    expect(evening.currentStreakDays).toBe(1);
    expect(evening.longestStreakDays).toBe(1);
    expect(evening.lastActivityDate?.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });

  it("treats crossing midnight UTC as a new day (extends streak)", () => {
    // 23:59 on day N, then 00:01 on day N+1 — distinct UTC days.
    const late = advanceStreak(makeRecord(), utcAt("2026-04-20T23:59:00Z"));
    const early = advanceStreak(late, utcAt("2026-04-21T00:01:00Z"));
    expect(early.currentStreakDays).toBe(2);
    expect(early.lastActivityDate?.toISOString()).toBe("2026-04-21T00:00:00.000Z");
  });

  it("resets the current streak to 1 after a single missed day", () => {
    const d1 = advanceStreak(makeRecord(), utcAt("2026-04-20T10:00:00Z"));
    const d2 = advanceStreak(d1, utcAt("2026-04-21T10:00:00Z"));
    // Skip 2026-04-22 entirely.
    const d4 = advanceStreak(d2, utcAt("2026-04-23T10:00:00Z"));
    expect(d4.currentStreakDays).toBe(1);
    // Previous peak of 2 preserved in longest.
    expect(d4.longestStreakDays).toBe(2);
  });

  it("resets after a long gap but preserves longestStreakDays", () => {
    let rec = makeRecord();
    // Build a 5-day streak.
    for (let day = 1; day <= 5; day++) {
      const iso = `2026-04-0${day}T10:00:00Z`;
      rec = advanceStreak(rec, utcAt(iso));
    }
    expect(rec.currentStreakDays).toBe(5);
    expect(rec.longestStreakDays).toBe(5);

    // Come back two weeks later.
    rec = advanceStreak(rec, utcAt("2026-04-20T10:00:00Z"));
    expect(rec.currentStreakDays).toBe(1);
    expect(rec.longestStreakDays).toBe(5);
  });

  it("does not regress state when an out-of-order (past) timestamp arrives", () => {
    const d2 = advanceStreak(
      advanceStreak(makeRecord(), utcAt("2026-04-20T10:00:00Z")),
      utcAt("2026-04-21T10:00:00Z"),
    );
    expect(d2.currentStreakDays).toBe(2);

    // A late-arriving event from yesterday must not rewind the streak.
    const stale = advanceStreak(d2, utcAt("2026-04-20T23:00:00Z"));
    expect(stale.currentStreakDays).toBe(2);
    expect(stale.longestStreakDays).toBe(2);
    expect(stale.lastActivityDate?.toISOString()).toBe("2026-04-21T00:00:00.000Z");
  });

  it("is pure — it does not mutate the input record", () => {
    const rec = makeRecord({
      currentStreakDays: 3,
      longestStreakDays: 5,
      lastActivityDate: utcAt("2026-04-19T00:00:00Z"),
    });
    const snapshot = JSON.stringify(rec);
    advanceStreak(rec, utcAt("2026-04-20T12:00:00Z"));
    expect(JSON.stringify(rec)).toBe(snapshot);
  });

  it("keeps longestStreakDays when the current run would not beat it", () => {
    const rec = makeRecord({
      currentStreakDays: 2,
      longestStreakDays: 10,
      lastActivityDate: utcAt("2026-04-19T00:00:00Z"),
    });
    const next = advanceStreak(rec, utcAt("2026-04-20T00:00:00Z"));
    expect(next.currentStreakDays).toBe(3);
    expect(next.longestStreakDays).toBe(10);
  });

  it("bumps longestStreakDays only when the current run exceeds it", () => {
    const rec = makeRecord({
      currentStreakDays: 4,
      longestStreakDays: 4,
      lastActivityDate: utcAt("2026-04-19T00:00:00Z"),
    });
    const next = advanceStreak(rec, utcAt("2026-04-20T00:00:00Z"));
    expect(next.currentStreakDays).toBe(5);
    expect(next.longestStreakDays).toBe(5);
  });

  it("normalizes lastActivityDate to UTC midnight regardless of clock time", () => {
    const next = advanceStreak(makeRecord(), utcAt("2026-04-20T17:42:11.123Z"));
    expect(next.lastActivityDate?.toISOString()).toBe("2026-04-20T00:00:00.000Z");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isActiveToday
// ─────────────────────────────────────────────────────────────────────────────
describe("isActiveToday", () => {
  it("returns false for a record that has never been advanced", () => {
    expect(isActiveToday(makeRecord(), utcAt("2026-04-20T12:00:00Z"))).toBe(false);
  });

  it("returns true when lastActivityDate is the same UTC day as now", () => {
    const rec = advanceStreak(makeRecord(), utcAt("2026-04-20T08:00:00Z"));
    expect(isActiveToday(rec, utcAt("2026-04-20T23:00:00Z"))).toBe(true);
  });

  it("returns false the moment the UTC day rolls over", () => {
    const rec = advanceStreak(makeRecord(), utcAt("2026-04-20T23:59:00Z"));
    expect(isActiveToday(rec, utcAt("2026-04-21T00:00:00Z"))).toBe(false);
  });

  it("returns false when the last activity is older than today", () => {
    const rec = advanceStreak(makeRecord(), utcAt("2026-04-15T12:00:00Z"));
    expect(isActiveToday(rec, utcAt("2026-04-20T12:00:00Z"))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// startOfUtcDay — sanity check so broken day math fails loudly
// ─────────────────────────────────────────────────────────────────────────────
describe("startOfUtcDay", () => {
  it("zeroes the time portion in UTC", () => {
    expect(startOfUtcDay(utcAt("2026-04-20T17:42:11.123Z")).toISOString()).toBe(
      "2026-04-20T00:00:00.000Z",
    );
  });

  it("is idempotent on an already-normalized date", () => {
    const mid = utcAt("2026-04-20T00:00:00.000Z");
    expect(startOfUtcDay(mid).getTime()).toBe(mid.getTime());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Legacy computeStreak — regression guard. The old helper reads the wall
// clock, so we only assert shape-level behavior here.
// ─────────────────────────────────────────────────────────────────────────────
describe("computeStreak (legacy)", () => {
  it("returns 0 for an empty list", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("returns 0 when the newest entry is older than yesterday", () => {
    const ancient = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(computeStreak([ancient])).toBe(0);
  });

  it("returns 1 for a single entry logged right now", () => {
    expect(computeStreak([new Date().toISOString()])).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  addToRoster,
  backfillMissedWeeks,
  detectConflicts,
  expandBlock,
  expandSeries,
  seatsRemaining,
  type BlockReservation,
  type GroupVisit,
  type RecurringSeries,
} from "./recurring";

describe("expandSeries", () => {
  it("spaces weekly occurrences seven days apart", () => {
    const series: RecurringSeries = {
      startAt: new Date("2026-01-05T15:00:00.000Z"),
      durationMinutes: 30,
      frequency: "weekly",
      count: 3,
      providerId: "prov-1",
      visitType: "group_titration",
    };

    const occ = expandSeries(series);
    expect(occ).toHaveLength(3);
    expect(occ[0].startAt.toISOString()).toBe("2026-01-05T15:00:00.000Z");
    expect(occ[1].startAt.toISOString()).toBe("2026-01-12T15:00:00.000Z");
    expect(occ[2].startAt.toISOString()).toBe("2026-01-19T15:00:00.000Z");
    expect(occ[0].endAt.toISOString()).toBe("2026-01-05T15:30:00.000Z");
    expect(occ.map((o) => o.index)).toEqual([0, 1, 2]);
  });

  it("spaces biweekly occurrences fourteen days apart", () => {
    const series: RecurringSeries = {
      startAt: new Date("2026-03-02T09:00:00.000Z"),
      durationMinutes: 60,
      frequency: "biweekly",
      count: 3,
      providerId: "prov-2",
      visitType: "support_group",
    };

    const occ = expandSeries(series);
    expect(occ[1].startAt.toISOString()).toBe("2026-03-16T09:00:00.000Z");
    expect(occ[2].startAt.toISOString()).toBe("2026-03-30T09:00:00.000Z");
  });

  it("steps monthly by calendar month, clamping Jan 31 to Feb 28 in a non-leap year", () => {
    const series: RecurringSeries = {
      startAt: new Date("2026-01-31T13:00:00.000Z"),
      durationMinutes: 45,
      frequency: "monthly",
      count: 4,
      providerId: "prov-3",
      visitType: "monthly_checkin",
    };

    const occ = expandSeries(series);
    // 2026 is not a leap year -> Feb has 28 days.
    expect(occ[1].startAt.toISOString()).toBe("2026-02-28T13:00:00.000Z");
    // March has 31 days -> original day-of-month is restored.
    expect(occ[2].startAt.toISOString()).toBe("2026-03-31T13:00:00.000Z");
    // April has 30 days -> clamps to the 30th.
    expect(occ[3].startAt.toISOString()).toBe("2026-04-30T13:00:00.000Z");
  });

  it("clamps Jan 31 to Feb 29 in a leap year", () => {
    const series: RecurringSeries = {
      startAt: new Date("2028-01-31T08:00:00.000Z"),
      durationMinutes: 30,
      frequency: "monthly",
      count: 2,
      providerId: "prov-3",
      visitType: "monthly_checkin",
    };

    const occ = expandSeries(series);
    // 2028 is a leap year -> Feb has 29 days.
    expect(occ[1].startAt.toISOString()).toBe("2028-02-29T08:00:00.000Z");
  });
});

describe("expandBlock", () => {
  it("expands the next N weekly windows starting on/after fromDate", () => {
    const block: BlockReservation = {
      dayOfWeek: 1, // Monday
      startHour: 9,
      endHour: 12,
      label: "New-patient block",
      weeks: 3,
    };

    // 2026-05-28 is a Thursday; the next Monday is 2026-06-01.
    const windows = expandBlock(block, new Date("2026-05-28T00:00:00.000Z"));
    expect(windows).toHaveLength(3);
    expect(windows[0].start.toISOString()).toBe("2026-06-01T09:00:00.000Z");
    expect(windows[0].end.toISOString()).toBe("2026-06-01T12:00:00.000Z");
    expect(windows[1].start.toISOString()).toBe("2026-06-08T09:00:00.000Z");
    expect(windows[2].start.toISOString()).toBe("2026-06-15T09:00:00.000Z");
    expect(windows[0].label).toBe("New-patient block");
  });

  it("includes fromDate itself when it already lands on the block's day-of-week", () => {
    const block: BlockReservation = {
      dayOfWeek: 4, // Thursday
      startHour: 13,
      endHour: 17,
      label: "Group day",
      weeks: 1,
    };

    const windows = expandBlock(block, new Date("2026-05-28T06:00:00.000Z"));
    expect(windows[0].start.toISOString()).toBe("2026-05-28T13:00:00.000Z");
  });
});

describe("group visit roster", () => {
  const base: GroupVisit = {
    startAt: new Date("2026-06-01T17:00:00.000Z"),
    durationMinutes: 90,
    maxSeats: 2,
    providerId: "prov-1",
    topic: "Titration support",
    roster: [],
  };

  it("adds patients until the visit is full, then rejects", () => {
    const a = addToRoster(base, "pt-1");
    expect(a.ok).toBe(true);
    expect(seatsRemaining(a.visit)).toBe(1);

    const b = addToRoster(a.visit, "pt-2");
    expect(b.ok).toBe(true);
    expect(seatsRemaining(b.visit)).toBe(0);

    const c = addToRoster(b.visit, "pt-3");
    expect(c.ok).toBe(false);
    expect(c.reason).toBe("Group visit is full");
    // Original roster is unchanged on rejection.
    expect(c.visit.roster).toEqual(["pt-1", "pt-2"]);
  });

  it("rejects duplicate enrollment without mutating the roster", () => {
    const a = addToRoster(base, "pt-1");
    const dup = addToRoster(a.visit, "pt-1");
    expect(dup.ok).toBe(false);
    expect(dup.reason).toBe("Patient already on roster");
    expect(dup.visit.roster).toEqual(["pt-1"]);
    // Source visit was not mutated.
    expect(base.roster).toEqual([]);
  });
});

describe("detectConflicts", () => {
  it("flags overlapping intervals and ignores non-overlapping ones", () => {
    const occurrences = [
      { start: new Date("2026-06-01T09:00:00.000Z"), end: new Date("2026-06-01T10:00:00.000Z") },
      { start: new Date("2026-06-01T11:00:00.000Z"), end: new Date("2026-06-01T12:00:00.000Z") },
    ];
    const busy = [
      { start: new Date("2026-06-01T09:30:00.000Z"), end: new Date("2026-06-01T10:30:00.000Z") },
    ];

    const conflicts = detectConflicts(occurrences, busy);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].occurrence).toBe(occurrences[0]);
    expect(conflicts[0].conflictsWith).toBe(busy[0]);
  });

  it("treats touching endpoints as non-conflicting", () => {
    const occurrences = [
      { start: new Date("2026-06-01T09:00:00.000Z"), end: new Date("2026-06-01T10:00:00.000Z") },
    ];
    const busy = [
      { start: new Date("2026-06-01T10:00:00.000Z"), end: new Date("2026-06-01T11:00:00.000Z") },
    ];

    expect(detectConflicts(occurrences, busy)).toHaveLength(0);
  });
});

describe("backfillMissedWeeks", () => {
  const series: RecurringSeries = {
    startAt: new Date("2026-01-05T15:00:00.000Z"),
    durationMinutes: 30,
    frequency: "weekly",
    count: 5,
    providerId: "prov-1",
    visitType: "group_titration",
  };

  it("returns the occurrence indexes the patient did not attend", () => {
    expect(backfillMissedWeeks(series, [0, 2, 4])).toEqual([1, 3]);
  });

  it("returns all indexes when nothing was attended", () => {
    expect(backfillMissedWeeks(series, [])).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns nothing when every occurrence was attended", () => {
    expect(backfillMissedWeeks(series, [0, 1, 2, 3, 4])).toEqual([]);
  });
});

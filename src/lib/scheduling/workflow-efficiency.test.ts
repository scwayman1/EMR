import { describe, expect, it } from "vitest";
import {
  aggregateByRole,
  aggregateByTask,
  aggregateByUser,
  flagRegressions,
  percentile,
  TASK_CLICK_TARGETS,
  type ClickEvent,
} from "./workflow-efficiency";

function event(overrides: Partial<ClickEvent> = {}): ClickEvent {
  return {
    userId: "u1",
    role: "provider",
    taskType: "finalize_note",
    clicks: 5,
    durationMs: 1000,
    completedAt: new Date("2026-05-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("percentile", () => {
  it("returns the median via nearest-rank on an odd-length array", () => {
    // sorted: [1, 2, 3, 4, 5]; rank = ceil(0.5 * 5) = 3 -> value 3
    expect(percentile([3, 1, 5, 2, 4], 0.5)).toBe(3);
  });

  it("returns the nearest-rank median on an even-length array (not interpolated)", () => {
    // sorted: [2, 4, 6, 8]; rank = ceil(0.5 * 4) = 2 -> value 4
    expect(percentile([8, 2, 6, 4], 0.5)).toBe(4);
  });

  it("computes p90 via nearest-rank", () => {
    // sorted 1..10; rank = ceil(0.9 * 10) = 9 -> value 9
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 0.9)).toBe(9);
  });

  it("clamps p to the first element at p=0 and the last at p=1", () => {
    expect(percentile([10, 30, 20], 0)).toBe(10);
    expect(percentile([10, 30, 20], 1)).toBe(30);
  });

  it("returns 0 for an empty array", () => {
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("aggregateByTask", () => {
  it("groups by task and computes mean/median/p90 clicks and mean duration", () => {
    const events: ClickEvent[] = [
      event({ taskType: "finalize_note", clicks: 4, durationMs: 1000 }),
      event({ taskType: "finalize_note", clicks: 6, durationMs: 3000 }),
      event({ taskType: "finalize_note", clicks: 8, durationMs: 2000 }),
      event({ taskType: "start_visit", clicks: 2, durationMs: 500 }),
    ];

    const rows = aggregateByTask(events);

    // Sorted by count desc: finalize_note (3) before start_visit (1).
    expect(rows.map((r) => r.taskType)).toEqual(["finalize_note", "start_visit"]);

    const note = rows[0];
    expect(note.count).toBe(3);
    expect(note.avgClicks).toBe(6); // (4+6+8)/3
    expect(note.medianClicks).toBe(6); // sorted [4,6,8], rank 2
    expect(note.p90Clicks).toBe(8); // rank = ceil(0.9*3) = 3
    expect(note.avgDurationMs).toBe(2000); // (1000+3000+2000)/3

    const visit = rows[1];
    expect(visit.count).toBe(1);
    expect(visit.avgClicks).toBe(2);
  });

  it("returns an empty array when there are no events", () => {
    expect(aggregateByTask([])).toEqual([]);
  });
});

describe("aggregateByUser", () => {
  it("rolls clicks and durations up per user, sorted by total clicks desc", () => {
    const events: ClickEvent[] = [
      event({ userId: "u1", clicks: 3, durationMs: 1000 }),
      event({ userId: "u1", clicks: 5, durationMs: 2000 }),
      event({ userId: "u2", clicks: 10, durationMs: 4000 }),
    ];

    const rows = aggregateByUser(events);

    expect(rows.map((r) => r.userId)).toEqual(["u2", "u1"]);

    const u1 = rows.find((r) => r.userId === "u1")!;
    expect(u1.sessions).toBe(2);
    expect(u1.totalClicks).toBe(8);
    expect(u1.avgClicksPerTask).toBe(4);
    expect(u1.avgDurationMs).toBe(1500);
  });
});

describe("aggregateByRole", () => {
  it("rolls clicks up per role", () => {
    const events: ClickEvent[] = [
      event({ role: "provider", clicks: 4 }),
      event({ role: "provider", clicks: 6 }),
      event({ role: "office_manager", clicks: 2 }),
    ];

    const rows = aggregateByRole(events);

    const provider = rows.find((r) => r.role === "provider")!;
    expect(provider.sessions).toBe(2);
    expect(provider.totalClicks).toBe(10);
    expect(provider.avgClicksPerTask).toBe(5);

    const office = rows.find((r) => r.role === "office_manager")!;
    expect(office.totalClicks).toBe(2);
  });
});

describe("flagRegressions", () => {
  it("flags only tasks whose average clicks exceed the target, worst-first", () => {
    const events: ClickEvent[] = [
      // finalize_note averages 7 vs target 5 -> over by 2.
      event({ taskType: "finalize_note", clicks: 6 }),
      event({ taskType: "finalize_note", clicks: 8 }),
      // send_rx averages 5 vs target 4 -> over by 1.
      event({ taskType: "send_rx", clicks: 5 }),
      // start_visit averages 3 vs target 3 -> NOT over (strictly greater required).
      event({ taskType: "start_visit", clicks: 3 }),
    ];

    const flags = flagRegressions(events);

    expect(flags.map((f) => f.taskType)).toEqual(["finalize_note", "send_rx"]);

    const note = flags[0];
    expect(note.avgClicks).toBe(7);
    expect(note.target).toBe(TASK_CLICK_TARGETS.finalize_note);
    expect(note.overBy).toBe(2);

    const rx = flags[1];
    expect(rx.overBy).toBe(1);
  });

  it("ignores tasks with no defined target", () => {
    const events: ClickEvent[] = [
      event({ taskType: "mystery_task", clicks: 99 }),
    ];

    expect(flagRegressions(events)).toEqual([]);
  });

  it("respects a custom targets map", () => {
    const events: ClickEvent[] = [
      event({ taskType: "start_visit", clicks: 4 }),
    ];

    // Default target for start_visit is 3, so 4 would normally flag;
    // raise it to 10 and nothing should flag.
    expect(flagRegressions(events, { start_visit: 10 })).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  progressPercent,
  isOverdue,
  computeAggregateProgress,
  daysRemaining,
  type TreatmentGoalRecord,
} from "./treatment-goals";

// ─────────────────────────────────────────────────────────────────────────────
// Test factory — keep test bodies short and intent-focused.
// ─────────────────────────────────────────────────────────────────────────────
function goal(overrides: Partial<TreatmentGoalRecord> = {}): TreatmentGoalRecord {
  return {
    id: "g1",
    patientId: "p1",
    organizationId: "o1",
    title: "Reduce pain",
    description: "Target a pain score of 3 within 30 days",
    targetMetric: "pain_reduction",
    targetValue: 10,
    currentValue: 0,
    startedAt: new Date("2026-04-01T00:00:00Z"),
    targetDate: new Date("2026-05-01T00:00:00Z"),
    completedAt: null,
    createdByClinicianId: null,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// progressPercent
// ─────────────────────────────────────────────────────────────────────────────
describe("progressPercent", () => {
  it("returns 0 when no progress has been made", () => {
    expect(progressPercent(goal({ currentValue: 0, targetValue: 10 }))).toBe(0);
  });

  it("returns a rounded integer between 0 and 100 for normal values", () => {
    expect(progressPercent(goal({ currentValue: 3, targetValue: 10 }))).toBe(30);
    expect(progressPercent(goal({ currentValue: 7, targetValue: 10 }))).toBe(70);
  });

  it("rounds to the nearest integer (no floats leak into UI)", () => {
    // 1/3 = 33.333...
    expect(progressPercent(goal({ currentValue: 1, targetValue: 3 }))).toBe(33);
    // 2/3 = 66.666...
    expect(progressPercent(goal({ currentValue: 2, targetValue: 3 }))).toBe(67);
  });

  it("clamps overflow to 100 when currentValue exceeds targetValue", () => {
    expect(progressPercent(goal({ currentValue: 999, targetValue: 10 }))).toBe(100);
  });

  it("returns 100 when the goal is explicitly completed, regardless of values", () => {
    expect(
      progressPercent(
        goal({
          currentValue: 0,
          targetValue: 10,
          completedAt: new Date("2026-04-15T00:00:00Z"),
        })
      )
    ).toBe(100);
  });

  it("returns 0 when targetValue is zero (avoids divide-by-zero / Infinity)", () => {
    expect(progressPercent(goal({ currentValue: 5, targetValue: 0 }))).toBe(0);
  });

  it("returns 0 when targetValue is negative (defensive — nonsense input)", () => {
    expect(progressPercent(goal({ currentValue: 5, targetValue: -10 }))).toBe(0);
  });

  it("clamps negative currentValue up to 0 (you can't regress past the start)", () => {
    expect(progressPercent(goal({ currentValue: -5, targetValue: 10 }))).toBe(0);
  });

  it("returns 100 when currentValue exactly equals targetValue", () => {
    expect(progressPercent(goal({ currentValue: 10, targetValue: 10 }))).toBe(100);
  });

  it("still honors completedAt when targetValue is zero (completed trumps math)", () => {
    expect(
      progressPercent(
        goal({
          currentValue: 0,
          targetValue: 0,
          completedAt: new Date("2026-04-15T00:00:00Z"),
        })
      )
    ).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isOverdue
// ─────────────────────────────────────────────────────────────────────────────
describe("isOverdue", () => {
  it("is false when the goal has no target date", () => {
    expect(isOverdue(goal({ targetDate: null }), new Date("2099-01-01"))).toBe(false);
  });

  it("is false when now is before the target date", () => {
    expect(
      isOverdue(
        goal({ targetDate: new Date("2026-05-01T00:00:00Z") }),
        new Date("2026-04-20T00:00:00Z")
      )
    ).toBe(false);
  });

  it("is false at the exact boundary (same instant as target date)", () => {
    const d = new Date("2026-05-01T00:00:00Z");
    expect(isOverdue(goal({ targetDate: d }), new Date(d.getTime()))).toBe(false);
  });

  it("is true one millisecond after the target date", () => {
    const d = new Date("2026-05-01T00:00:00Z");
    expect(isOverdue(goal({ targetDate: d }), new Date(d.getTime() + 1))).toBe(true);
  });

  it("is false for a completed goal even if the target date has passed", () => {
    expect(
      isOverdue(
        goal({
          targetDate: new Date("2026-05-01T00:00:00Z"),
          completedAt: new Date("2026-04-25T00:00:00Z"),
        }),
        new Date("2026-06-01T00:00:00Z")
      )
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// computeAggregateProgress
// ─────────────────────────────────────────────────────────────────────────────
describe("computeAggregateProgress", () => {
  it("returns zeros for an empty list", () => {
    expect(computeAggregateProgress([])).toEqual({
      completed: 0,
      active: 0,
      percent: 0,
    });
  });

  it("splits completed vs active goals correctly", () => {
    const goals = [
      goal({ id: "a", completedAt: new Date("2026-04-10") }),
      goal({ id: "b", completedAt: new Date("2026-04-11") }),
      goal({ id: "c", currentValue: 3, targetValue: 10 }),
    ];
    const result = computeAggregateProgress(goals);
    expect(result.completed).toBe(2);
    expect(result.active).toBe(1);
  });

  it("averages completion percent across every goal (completed counts as 100)", () => {
    // 100 + 100 + 30 = 230 / 3 = 76.67 → 77
    const goals = [
      goal({ id: "a", completedAt: new Date("2026-04-10") }),
      goal({ id: "b", completedAt: new Date("2026-04-11") }),
      goal({ id: "c", currentValue: 3, targetValue: 10 }),
    ];
    expect(computeAggregateProgress(goals).percent).toBe(77);
  });

  it("reports 100% when all goals are completed", () => {
    const goals = [
      goal({ id: "a", completedAt: new Date("2026-04-10") }),
      goal({ id: "b", completedAt: new Date("2026-04-11") }),
    ];
    expect(computeAggregateProgress(goals)).toEqual({
      completed: 2,
      active: 0,
      percent: 100,
    });
  });

  it("reports 0% when no progress has been made on any goal", () => {
    const goals = [
      goal({ id: "a", currentValue: 0, targetValue: 10 }),
      goal({ id: "b", currentValue: 0, targetValue: 5 }),
    ];
    expect(computeAggregateProgress(goals)).toEqual({
      completed: 0,
      active: 2,
      percent: 0,
    });
  });

  it("handles a mix including a zero-target goal (which contributes 0%)", () => {
    // 50 + 0 = 50 / 2 = 25
    const goals = [
      goal({ id: "a", currentValue: 5, targetValue: 10 }),
      goal({ id: "b", currentValue: 3, targetValue: 0 }),
    ];
    expect(computeAggregateProgress(goals).percent).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// daysRemaining
// ─────────────────────────────────────────────────────────────────────────────
describe("daysRemaining", () => {
  it("returns null when there is no target date", () => {
    expect(daysRemaining(goal({ targetDate: null }), new Date("2026-04-20"))).toBeNull();
  });

  it("returns a positive number of days before the target date", () => {
    expect(
      daysRemaining(
        goal({ targetDate: new Date("2026-05-01T00:00:00Z") }),
        new Date("2026-04-20T00:00:00Z")
      )
    ).toBe(11);
  });

  it("returns a negative number of days past the target date", () => {
    expect(
      daysRemaining(
        goal({ targetDate: new Date("2026-04-20T00:00:00Z") }),
        new Date("2026-04-25T00:00:00Z")
      )
    ).toBe(-5);
  });

  it("returns 0 on the target date itself", () => {
    const d = new Date("2026-05-01T00:00:00Z");
    expect(daysRemaining(goal({ targetDate: d }), new Date(d.getTime()))).toBe(0);
  });
});

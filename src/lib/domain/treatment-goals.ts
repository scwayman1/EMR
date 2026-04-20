// Treatment Goals — visual progress toward what patients want

export type GoalMetric = "pain" | "sleep" | "anxiety" | "mood" | "energy" | "nausea" | "appetite";
export type GoalDirection = "decrease" | "increase";

export interface TreatmentGoal {
  id: string;
  patientId: string;
  metric: GoalMetric;
  direction: GoalDirection;
  baseline: number; // 1-10 scale
  target: number; // 1-10 scale
  currentValue?: number;
  startedAt: string;
  targetDate?: string;
  status: "active" | "achieved" | "paused" | "abandoned";
}

export interface GoalProgress {
  goal: TreatmentGoal;
  percentComplete: number; // 0-100
  trend: "improving" | "steady" | "worsening";
  daysActive: number;
  isOnTrack: boolean;
}

export const GOAL_METRIC_LABELS: Record<GoalMetric, { label: string; emoji: string; unit: string }> = {
  pain: { label: "Less pain", emoji: "🌤️", unit: "pain level" },
  sleep: { label: "Better sleep", emoji: "😴", unit: "sleep quality" },
  anxiety: { label: "Less anxiety", emoji: "🧘", unit: "anxiety level" },
  mood: { label: "Better mood", emoji: "😊", unit: "mood score" },
  energy: { label: "More energy", emoji: "⚡", unit: "energy level" },
  nausea: { label: "Less nausea", emoji: "🌊", unit: "nausea level" },
  appetite: { label: "Better appetite", emoji: "🍽️", unit: "appetite" },
};

/**
 * Calculate progress toward a goal.
 */
export function calculateGoalProgress(goal: TreatmentGoal, currentValue: number): GoalProgress {
  const range = Math.abs(goal.target - goal.baseline);
  const progress = Math.abs(currentValue - goal.baseline);
  const percentComplete = range === 0 ? 100 : Math.min(100, Math.round((progress / range) * 100));

  let trend: GoalProgress["trend"] = "steady";
  if (goal.direction === "decrease") {
    trend = currentValue < goal.baseline ? "improving" : currentValue > goal.baseline ? "worsening" : "steady";
  } else {
    trend = currentValue > goal.baseline ? "improving" : currentValue < goal.baseline ? "worsening" : "steady";
  }

  const daysActive = Math.round((Date.now() - new Date(goal.startedAt).getTime()) / 86400000);

  // "On track" = making progress proportional to time elapsed (rough heuristic)
  const expectedProgress = goal.targetDate
    ? Math.min(100, (daysActive / Math.max(1, Math.round((new Date(goal.targetDate).getTime() - new Date(goal.startedAt).getTime()) / 86400000))) * 100)
    : 0;
  const isOnTrack = percentComplete >= expectedProgress - 10; // 10% grace

  return {
    goal,
    percentComplete,
    trend,
    daysActive,
    isOnTrack,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured TreatmentGoal records (backed by the Prisma `TreatmentGoal` model)
//
// The helpers above operate on the legacy in-memory `TreatmentGoal` type.
// The helpers below operate on the structured DB-backed record — these are
// what the card / list components and the `updateGoalProgress` server action
// consume.
// ─────────────────────────────────────────────────────────────────────────────

export type TargetMetric =
  | "pain_reduction"
  | "sleep_hours"
  | "anxiety_reduction"
  | "mood_improvement"
  | "custom";

/**
 * The shape of a persisted treatment goal. Keep this strictly the fields we
 * need for progress math + UI — the Prisma-generated type is a superset of
 * this (it adds createdAt/updatedAt). Accepting this narrower shape makes
 * the helpers trivially testable without Prisma.
 */
export interface TreatmentGoalRecord {
  id: string;
  patientId: string;
  organizationId: string;
  title: string;
  description: string;
  targetMetric: TargetMetric;
  targetValue: number;
  currentValue: number;
  startedAt: Date;
  targetDate: Date | null;
  completedAt: Date | null;
  createdByClinicianId: string | null;
}

/**
 * Progress toward a goal, 0–100.
 *
 * Rules:
 *   - A completed goal (completedAt set) is always 100.
 *   - A zero targetValue is treated as "no target" → 0 unless completed.
 *     (Without a target, there's no sensible progress fraction; we prefer
 *     zero to `NaN` / Infinity.)
 *   - Negative currentValue is clamped to 0 (you can't regress past the
 *     starting line in this model — product said so).
 *   - Progress above the target value clamps to 100.
 */
export function progressPercent(goal: TreatmentGoalRecord): number {
  if (goal.completedAt) return 100;
  if (!Number.isFinite(goal.targetValue) || goal.targetValue <= 0) return 0;
  const current = Number.isFinite(goal.currentValue) ? goal.currentValue : 0;
  const clamped = Math.max(0, current);
  const pct = (clamped / goal.targetValue) * 100;
  if (pct >= 100) return 100;
  if (pct <= 0) return 0;
  return Math.round(pct);
}

/**
 * Is the goal overdue?
 *
 * A goal is overdue when:
 *   - it has a targetDate,
 *   - it has not been completed, and
 *   - `now` is strictly after the targetDate (same instant = not yet overdue).
 */
export function isOverdue(goal: TreatmentGoalRecord, now: Date): boolean {
  if (!goal.targetDate) return false;
  if (goal.completedAt) return false;
  return now.getTime() > goal.targetDate.getTime();
}

export interface AggregateProgress {
  /** Number of goals that have been completed (completedAt set). */
  completed: number;
  /** Number of goals still in progress (not completed). */
  active: number;
  /**
   * Average completion percent across ALL goals (completed + active),
   * rounded to the nearest integer. Empty list → 0.
   */
  percent: number;
}

/**
 * Aggregate summary across a patient's goals.
 *
 * The `percent` is the mean of `progressPercent` for every goal. Completed
 * goals count as 100 (see `progressPercent`). An empty list returns
 * `{ completed: 0, active: 0, percent: 0 }`.
 */
export function computeAggregateProgress(
  goals: readonly TreatmentGoalRecord[]
): AggregateProgress {
  if (goals.length === 0) {
    return { completed: 0, active: 0, percent: 0 };
  }
  let completed = 0;
  let totalPct = 0;
  for (const g of goals) {
    if (g.completedAt) completed += 1;
    totalPct += progressPercent(g);
  }
  return {
    completed,
    active: goals.length - completed,
    percent: Math.round(totalPct / goals.length),
  };
}

/**
 * Days remaining until the target date, from `now`. Negative when overdue.
 * Returns null when no targetDate is set. Rounded toward zero (whole days).
 */
export function daysRemaining(
  goal: TreatmentGoalRecord,
  now: Date
): number | null {
  if (!goal.targetDate) return null;
  const ms = goal.targetDate.getTime() - now.getTime();
  return Math.trunc(ms / 86_400_000);
}

export const TARGET_METRIC_LABELS: Record<TargetMetric, string> = {
  pain_reduction: "Pain reduction",
  sleep_hours: "Sleep hours",
  anxiety_reduction: "Anxiety reduction",
  mood_improvement: "Mood improvement",
  custom: "Custom",
};

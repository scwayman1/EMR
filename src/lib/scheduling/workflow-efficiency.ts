/**
 * EMR-104 — Click counter / workflow efficiency tracking.
 *
 * Pure aggregation engine over UI click telemetry. Each recorded event
 * captures how many clicks and how long a given task ("start_visit",
 * "finalize_note", …) took a given user. These functions roll those events
 * up by task, by user, and by role so the practice can see where the EMR is
 * costing clinicians clicks — and flag any task whose average click count
 * has crept above its target ("average clicks to finalize a note: 7,
 * target 5"). No database, no clock reads — callers pass pre-fetched events.
 */
import { z } from "zod";

export const WorkflowRoleSchema = z.enum([
  "patient",
  "provider",
  "office_manager",
  "researcher",
  "system",
]);
export type WorkflowRole = z.infer<typeof WorkflowRoleSchema>;

export const ClickEventSchema = z.object({
  /** Stable identifier of the user who performed the task. */
  userId: z.string(),
  /** Role the user was acting as when the task was performed. */
  role: WorkflowRoleSchema,
  /** Task being measured, e.g. "start_visit" | "finalize_note" | "send_rx" | "check_labs". */
  taskType: z.string(),
  /** Number of clicks the user spent completing the task. */
  clicks: z.number().int().min(0),
  /** Wall-clock duration of the task in milliseconds. */
  durationMs: z.number().int().min(0),
  /** When the task was completed. */
  completedAt: z.date(),
});

export type ClickEvent = z.infer<typeof ClickEventSchema>;

export interface TaskAggregate {
  taskType: string;
  count: number;
  avgClicks: number;
  medianClicks: number;
  p90Clicks: number;
  avgDurationMs: number;
}

export interface UserAggregate {
  userId: string;
  sessions: number;
  totalClicks: number;
  avgClicksPerTask: number;
  avgDurationMs: number;
}

export interface RoleAggregate {
  role: WorkflowRole;
  sessions: number;
  totalClicks: number;
  avgClicksPerTask: number;
  avgDurationMs: number;
}

export interface RegressionFlag {
  taskType: string;
  avgClicks: number;
  target: number;
  overBy: number;
}

/**
 * Default per-task click budgets. These are the "this task should take no
 * more than N clicks" targets the workflow team agreed on; tasks whose
 * measured average exceeds the target are surfaced by flagRegressions.
 */
export const TASK_CLICK_TARGETS: Record<string, number> = {
  start_visit: 3,
  finalize_note: 5,
  send_rx: 4,
  check_labs: 3,
};

/**
 * Nearest-rank percentile over a list of numbers. `p` is a fraction in
 * [0, 1] (e.g. 0.5 for median, 0.9 for p90). Returns 0 for an empty list.
 * The input is not assumed to be sorted.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, p));
  // Nearest-rank: rank = ceil(p * N), 1-indexed; p=0 maps to the first element.
  const rank = Math.max(1, Math.ceil(clamped * sorted.length));
  return sorted[rank - 1];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Roll events up by taskType. Each row reports how many events were seen,
 * the mean/median/p90 click counts, and the mean duration. Sorted by event
 * count descending (the tasks we have the most signal on come first).
 */
export function aggregateByTask(events: ClickEvent[]): TaskAggregate[] {
  const groups = new Map<string, ClickEvent[]>();
  for (const event of events) {
    const bucket = groups.get(event.taskType);
    if (bucket) {
      bucket.push(event);
    } else {
      groups.set(event.taskType, [event]);
    }
  }

  const rows: TaskAggregate[] = [];
  for (const [taskType, bucket] of groups) {
    const clicks = bucket.map((e) => e.clicks);
    const durations = bucket.map((e) => e.durationMs);
    rows.push({
      taskType,
      count: bucket.length,
      avgClicks: round2(mean(clicks)),
      medianClicks: percentile(clicks, 0.5),
      p90Clicks: percentile(clicks, 0.9),
      avgDurationMs: round2(mean(durations)),
    });
  }

  rows.sort((a, b) => b.count - a.count);
  return rows;
}

/**
 * Roll events up by userId. `sessions` is the number of recorded events
 * (task completions) for that user; `avgClicksPerTask` is total clicks
 * divided by that count. Sorted by total clicks descending.
 */
export function aggregateByUser(events: ClickEvent[]): UserAggregate[] {
  const groups = new Map<string, ClickEvent[]>();
  for (const event of events) {
    const bucket = groups.get(event.userId);
    if (bucket) {
      bucket.push(event);
    } else {
      groups.set(event.userId, [event]);
    }
  }

  const rows: UserAggregate[] = [];
  for (const [userId, bucket] of groups) {
    const totalClicks = bucket.reduce((sum, e) => sum + e.clicks, 0);
    rows.push({
      userId,
      sessions: bucket.length,
      totalClicks,
      avgClicksPerTask: round2(totalClicks / bucket.length),
      avgDurationMs: round2(mean(bucket.map((e) => e.durationMs))),
    });
  }

  rows.sort((a, b) => b.totalClicks - a.totalClicks);
  return rows;
}

/**
 * Roll events up by role — same shape as aggregateByUser but keyed by the
 * acting role, so we can compare e.g. provider vs. office_manager workload.
 * Sorted by total clicks descending.
 */
export function aggregateByRole(events: ClickEvent[]): RoleAggregate[] {
  const groups = new Map<WorkflowRole, ClickEvent[]>();
  for (const event of events) {
    const bucket = groups.get(event.role);
    if (bucket) {
      bucket.push(event);
    } else {
      groups.set(event.role, [event]);
    }
  }

  const rows: RoleAggregate[] = [];
  for (const [role, bucket] of groups) {
    const totalClicks = bucket.reduce((sum, e) => sum + e.clicks, 0);
    rows.push({
      role,
      sessions: bucket.length,
      totalClicks,
      avgClicksPerTask: round2(totalClicks / bucket.length),
      avgDurationMs: round2(mean(bucket.map((e) => e.durationMs))),
    });
  }

  rows.sort((a, b) => b.totalClicks - a.totalClicks);
  return rows;
}

/**
 * Flag tasks whose average click count exceeds its target. Only tasks that
 * (a) have a target defined in `targets` and (b) are actually over that
 * target are returned. Sorted worst-first (largest `overBy` first).
 */
export function flagRegressions(
  events: ClickEvent[],
  targets: Record<string, number> = TASK_CLICK_TARGETS,
): RegressionFlag[] {
  const byTask = aggregateByTask(events);

  const flags: RegressionFlag[] = [];
  for (const row of byTask) {
    const target = targets[row.taskType];
    if (target === undefined) continue;
    if (row.avgClicks > target) {
      flags.push({
        taskType: row.taskType,
        avgClicks: row.avgClicks,
        target,
        overBy: round2(row.avgClicks - target),
      });
    }
  }

  flags.sort((a, b) => b.overBy - a.overBy);
  return flags;
}

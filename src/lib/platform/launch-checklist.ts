/**
 * EMR-173 — 15-day cannabis EMR launch checklist.
 *
 * Public-shape, marketing-friendly view of the day-by-day launch plan
 * defined in `launch-readiness.ts`. This module exposes:
 *   - a 15-day countdown with grouped phase themes
 *   - per-day daily-task lists ready to render
 *   - a blocker-alert resolver
 *   - a launch-day runbook for go-live morning
 *
 * The operator-facing /ops/launch surface uses this to render the
 * countdown view alongside the readiness score.
 */

import {
  LAUNCH_PLAN,
  type LaunchTask,
  type LaunchProgress,
  type LaunchDay,
  type TaskState,
  dayCompletion,
  overallReadiness,
  nextBlocker,
} from "@/lib/platform/launch-readiness";

// ---------------------------------------------------------------------------
// Phase grouping — bigger buckets the marketing site can show.
// ---------------------------------------------------------------------------

export type ChecklistPhase =
  | "compliance"
  | "data_migration"
  | "training"
  | "go_live";

export interface PhaseGroup {
  phase: ChecklistPhase;
  /** Display label. */
  label: string;
  /** One-line description. */
  description: string;
  /** Day numbers (1..15) that belong to this phase. */
  days: number[];
}

export const CHECKLIST_PHASES: PhaseGroup[] = [
  {
    phase: "compliance",
    label: "Compliance",
    description: "BAA, state cannabis rules, and EPCS verified before any patient data lands.",
    days: [1, 2, 3],
  },
  {
    phase: "data_migration",
    label: "Data migration",
    description: "Templates configured, billing wired, FHIR bridge ready for incoming records.",
    days: [4, 5, 6, 7, 8],
  },
  {
    phase: "training",
    label: "Training",
    description: "Marketplace linked, first real patient charted, outcome scales firing.",
    days: [9, 10, 11],
  },
  {
    phase: "go_live",
    label: "Go-live",
    description: "Marketing + audit dry-run + soft launch + public schedule open.",
    days: [12, 13, 14, 15],
  },
];

// ---------------------------------------------------------------------------
// Countdown — the 15-day marketing surface.
// ---------------------------------------------------------------------------

export interface CountdownDay {
  day: number;
  /** "Day 1" / "T-14" / "Launch day" — already display-formatted. */
  label: string;
  /** "T minus N days" — surfaces in countdown headers. */
  countdown: string;
  theme: string;
  exitCriteria: string;
  phase: ChecklistPhase;
  tasks: LaunchTask[];
  /** True for the final day. */
  isLaunchDay: boolean;
}

export function buildCountdown(): CountdownDay[] {
  return LAUNCH_PLAN.map((d) => {
    const phase = phaseForDay(d.day);
    return {
      day: d.day,
      label: d.day === 15 ? "Launch day" : `Day ${d.day}`,
      countdown: d.day === 15 ? "T-0" : `T-${15 - d.day}`,
      theme: d.theme,
      exitCriteria: d.exitCriteria,
      phase,
      tasks: d.tasks,
      isLaunchDay: d.day === 15,
    };
  });
}

export function phaseForDay(day: number): ChecklistPhase {
  for (const p of CHECKLIST_PHASES) {
    if (p.days.includes(day)) return p.phase;
  }
  return "go_live";
}

// ---------------------------------------------------------------------------
// Daily tasks rollup — used by the operator surface.
// ---------------------------------------------------------------------------

export interface DailyRollup {
  day: number;
  tasks: Array<{
    id: string;
    title: string;
    detail: string;
    owner: LaunchTask["owner"];
    surface: string;
    state: TaskState;
    isBlocker: boolean;
    etaMinutes: number;
  }>;
  total: number;
  done: number;
  blockersOpen: number;
  pct: number;
  ready: boolean;
}

export function dailyRollup(day: number, progress: LaunchProgress): DailyRollup {
  const planDay = LAUNCH_PLAN.find((d) => d.day === day);
  if (!planDay) {
    return { day, tasks: [], total: 0, done: 0, blockersOpen: 0, pct: 0, ready: false };
  }
  const completion = dayCompletion(day, progress);
  return {
    day,
    tasks: planDay.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      detail: t.detail,
      owner: t.owner,
      surface: t.surface,
      state: progress.states[t.id] ?? "pending",
      isBlocker: t.blocker,
      etaMinutes: t.etaMinutes,
    })),
    total: completion.total,
    done: completion.done,
    blockersOpen: completion.blockersOpen,
    pct: completion.pct,
    ready: completion.ready,
  };
}

// ---------------------------------------------------------------------------
// Blocker alerts — what the operator surface should yell about.
// ---------------------------------------------------------------------------

export interface BlockerAlert {
  taskId: string;
  day: number;
  title: string;
  detail: string;
  owner: LaunchTask["owner"];
  surface: string;
  /** Severity is purely a function of how close go-live is. */
  severity: "info" | "warn" | "critical";
}

export function blockerAlerts(progress: LaunchProgress): BlockerAlert[] {
  const alerts: BlockerAlert[] = [];
  for (const day of LAUNCH_PLAN) {
    for (const t of day.tasks) {
      if (!t.blocker) continue;
      const s = progress.states[t.id];
      if (s === "done") continue;
      const severity: BlockerAlert["severity"] =
        day.day >= 13 ? "critical" : day.day >= 8 ? "warn" : "info";
      alerts.push({
        taskId: t.id,
        day: day.day,
        title: t.title,
        detail: t.detail,
        owner: t.owner,
        surface: t.surface,
        severity,
      });
    }
  }
  return alerts;
}

// ---------------------------------------------------------------------------
// Launch-day runbook — what go-live morning looks like, hour-by-hour.
// ---------------------------------------------------------------------------

export interface RunbookStep {
  timeOfDay: string;
  title: string;
  description: string;
  owner: LaunchTask["owner"];
  /** When true, the next step doesn't begin until this one is signed off. */
  gate: boolean;
}

export const LAUNCH_RUNBOOK: RunbookStep[] = [
  {
    timeOfDay: "07:30",
    title: "Pre-flight: clearinghouse status",
    description:
      "Confirm clearinghouse is green. Run one synthetic claim through 999 + 277CA. Spot-check eligibility for two real patients.",
    owner: "biller",
    gate: true,
  },
  {
    timeOfDay: "08:00",
    title: "Standup: launch-day comms",
    description:
      "All-hands standup. Walk the day's schedule. Confirm on-call clinician + on-call CSM. Slack channel #launch-day open.",
    owner: "leafjourney_csm",
    gate: true,
  },
  {
    timeOfDay: "08:30",
    title: "Open public schedule",
    description:
      "Flip the public booking link live. Confirm ICS confirmations + SMS reminders firing on a test booking.",
    owner: "operator",
    gate: true,
  },
  {
    timeOfDay: "09:00",
    title: "First real visit",
    description:
      "Practice owner sees the day's first patient end-to-end. Intake → APSO → Rx → Combo Wheel → outcome scale.",
    owner: "clinician",
    gate: true,
  },
  {
    timeOfDay: "10:00",
    title: "First claim submitted",
    description:
      "Biller submits the first real claim. Verify 999 acknowledgment and 277CA in queue.",
    owner: "biller",
    gate: false,
  },
  {
    timeOfDay: "12:00",
    title: "Mid-day check-in",
    description:
      "CSM review with practice owner. What's working, what's hot, what's next. Adjust if a workflow is friction-heavy.",
    owner: "leafjourney_csm",
    gate: false,
  },
  {
    timeOfDay: "16:00",
    title: "End-of-day reconciliation",
    description:
      "Daily-close run. Confirm all visits closed, claims submitted, and patient communications fired.",
    owner: "operator",
    gate: true,
  },
  {
    timeOfDay: "17:00",
    title: "MIPS extrapolator check",
    description:
      "Verify first MIPS measure rows are landing. Even at low denominator, the rails are confirmed for Q1 reporting.",
    owner: "biller",
    gate: false,
  },
  {
    timeOfDay: "17:30",
    title: "Schedule 30-day review",
    description:
      "Calendar invite for a 30-day post-launch review with CSM. We tune what's not working at the end of the first month.",
    owner: "leafjourney_csm",
    gate: false,
  },
];

// ---------------------------------------------------------------------------
// Progress summary — for the operator surface header.
// ---------------------------------------------------------------------------

export interface CountdownSummary {
  /** Number of business days remaining until day 15 (assuming today is the active day). */
  businessDaysRemaining: number;
  /** Active day — first day with anything not done. */
  activeDay: number;
  pct: number;
  daysReady: number;
  totalTasks: number;
  doneTasks: number;
  remainingEtaHours: number;
  nextAction:
    | { day: number; title: string; surface: string; owner: LaunchTask["owner"] }
    | null;
}

export function countdownSummary(progress: LaunchProgress): CountdownSummary {
  const overall = overallReadiness(progress);
  let active = LAUNCH_PLAN.length;
  for (const d of LAUNCH_PLAN) {
    const dc = dayCompletion(d.day, progress);
    if (!dc.ready) {
      active = d.day;
      break;
    }
  }
  const blocker = nextBlocker(progress);
  return {
    businessDaysRemaining: Math.max(0, 15 - active + 1),
    activeDay: active,
    pct: overall.pct,
    daysReady: overall.daysReady,
    totalTasks: overall.totalTasks,
    doneTasks: overall.doneTasks,
    remainingEtaHours: Math.round((overall.remainingEtaMinutes / 60) * 10) / 10,
    nextAction: blocker
      ? {
          day: blocker.day,
          title: blocker.task.title,
          surface: blocker.task.surface,
          owner: blocker.task.owner,
        }
      : null,
  };
}

// Re-export shapes the page-level surface needs without forcing two imports.
export type { LaunchProgress, LaunchTask, LaunchDay, TaskState };

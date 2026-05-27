// EMR-137 — Fitness V3
// Exercise log, weekly summary, step goal tracking, and care-team trainer
// assignment. Workouts + base trainers still live in `@/lib/domain/fitness`;
// this module adds the journal layer that the patient interacts with daily.

import {
  CARE_TEAM_TRAINERS,
  WORKOUT_LIBRARY,
  suggestWorkouts,
  type Workout,
  type WorkoutFocus,
  type WorkoutLevel,
  type CareTeamTrainer,
} from "@/lib/domain/fitness";

export {
  CARE_TEAM_TRAINERS,
  WORKOUT_LIBRARY,
  suggestWorkouts,
  type Workout,
  type WorkoutFocus,
  type WorkoutLevel,
  type CareTeamTrainer,
};

export interface ExerciseLogEntry {
  id: string;
  occurredAt: string;
  workoutId?: string;
  customLabel?: string;
  durationMin: number;
  perceivedExertion: 1 | 2 | 3 | 4 | 5;
  steps?: number;
  notes?: string;
}

export interface StepGoal {
  dailyTarget: number;
  setBy: "patient" | "trainer" | "clinician";
  setAt: string;
}

export const DEFAULT_STEP_GOAL: StepGoal = {
  dailyTarget: 6000,
  setBy: "patient",
  setAt: new Date(0).toISOString(),
};

export interface WeeklyFitnessSummary {
  weekStart: string;
  totalMinutes: number;
  sessions: number;
  avgPerceivedExertion: number;
  totalSteps: number;
  goalSteps: number;
  goalPct: number;
  byFocus: Record<WorkoutFocus, number>;
}

export const EXERCISE_LOG_DEMO: ExerciseLogEntry[] = [
  {
    id: "x1",
    occurredAt: "2026-04-25T08:30:00.000Z",
    workoutId: "morning-mobility",
    durationMin: 12,
    perceivedExertion: 2,
    steps: 1840,
    notes: "Hip hike was tight on the right. Better by the end.",
  },
  {
    id: "x2",
    occurredAt: "2026-04-26T17:00:00.000Z",
    workoutId: "low-impact-cardio",
    durationMin: 22,
    perceivedExertion: 3,
    steps: 4120,
  },
  {
    id: "x3",
    occurredAt: "2026-04-28T09:15:00.000Z",
    workoutId: "post-dose-flow",
    durationMin: 15,
    perceivedExertion: 2,
    steps: 600,
    notes: "Tincture 45 min before. Felt grounded.",
  },
  {
    id: "x4",
    occurredAt: "2026-04-30T07:45:00.000Z",
    workoutId: "balance-fall-prevention",
    durationMin: 12,
    perceivedExertion: 2,
    steps: 800,
  },
];

export interface CareTeamTrainerAssignment {
  trainerId: string;
  patientId: string;
  assignedAt: string;
  assignedBy: string;
  focus: WorkoutFocus[];
  cadence: "weekly" | "biweekly" | "monthly";
  goal: string;
}

export function summarizeWeek(
  entries: ExerciseLogEntry[],
  weekStart: Date,
  goal: StepGoal = DEFAULT_STEP_GOAL,
): WeeklyFitnessSummary {
  const start = startOfDay(weekStart);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const week = entries.filter((e) => {
    const t = new Date(e.occurredAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });

  const byFocus: Record<WorkoutFocus, number> = {
    mobility: 0,
    strength: 0,
    cardio: 0,
    balance: 0,
    recovery: 0,
  };
  for (const e of week) {
    const w = WORKOUT_LIBRARY.find((wk) => wk.id === e.workoutId);
    if (w) byFocus[w.focus] += e.durationMin;
  }

  const totalMinutes = week.reduce((s, e) => s + e.durationMin, 0);
  const totalSteps = week.reduce((s, e) => s + (e.steps ?? 0), 0);
  const goalSteps = goal.dailyTarget * 7;
  const avgPerceivedExertion = week.length
    ? week.reduce((s, e) => s + e.perceivedExertion, 0) / week.length
    : 0;

  return {
    weekStart: start.toISOString().slice(0, 10),
    totalMinutes,
    sessions: week.length,
    avgPerceivedExertion: Math.round(avgPerceivedExertion * 10) / 10,
    totalSteps,
    goalSteps,
    goalPct: goalSteps > 0 ? Math.min(1, totalSteps / goalSteps) : 0,
    byFocus,
  };
}

function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  // Normalize to ISO-week Monday so the summary aligns with calendar weeks.
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  return next;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  focus: WorkoutFocus;
  workoutIds: string[];
  cadenceDescription: string;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "tpl-gentle-restart",
    title: "Gentle restart",
    focus: "mobility",
    workoutIds: ["morning-mobility", "post-dose-flow", "balance-fall-prevention"],
    cadenceDescription: "3 sessions per week, alternating days.",
  },
  {
    id: "tpl-pain-management",
    title: "Pain management",
    focus: "recovery",
    workoutIds: ["post-dose-flow", "balance-fall-prevention", "morning-mobility"],
    cadenceDescription: "Daily, kept short and well below pain threshold.",
  },
  {
    id: "tpl-build-strength",
    title: "Build a foundation",
    focus: "strength",
    workoutIds: ["bodyweight-strength", "low-impact-cardio", "morning-mobility"],
    cadenceDescription: "4 sessions per week, never two strength days back-to-back.",
  },
];

export function templateById(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((t) => t.id === id);
}

export function isStepGoalMet(
  steps: number,
  goal: StepGoal = DEFAULT_STEP_GOAL,
): boolean {
  return steps >= goal.dailyTarget;
}

export function trainerById(id: string): CareTeamTrainer | undefined {
  return CARE_TEAM_TRAINERS.find((t) => t.id === id);
}

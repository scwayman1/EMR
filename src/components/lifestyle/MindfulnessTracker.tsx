"use client";

// EMR-138 — Mindfulness Tracker
// Daily emoji grid covering meditation, gratitude, journaling, breathing.
// Streak tracking + gentle reminder copy. Stores per-day state in
// localStorage so the patient can build the habit before any server-side
// logging is wired up.

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const MINDFULNESS_PRACTICES = [
  {
    id: "meditation",
    emoji: "\u{1F9D8}",
    label: "Meditation",
    minDuration: "3 min",
    nudge: "Three slow breaths count.",
  },
  {
    id: "gratitude",
    emoji: "\u{1F64F}",
    label: "Gratitude",
    minDuration: "1 thing",
    nudge: "Name one good thing — small wins count.",
  },
  {
    id: "journaling",
    emoji: "\u{1F4D3}",
    label: "Journaling",
    minDuration: "1 line",
    nudge: "What did today feel like in one sentence?",
  },
  {
    id: "breathing",
    emoji: "\u{1F343}",
    label: "Breathing",
    minDuration: "60 sec",
    nudge: "Box breath: in 4, hold 4, out 4, rest 4.",
  },
] as const;

export type MindfulnessPractice = (typeof MINDFULNESS_PRACTICES)[number]["id"];

interface DayEntry {
  date: string; // YYYY-MM-DD
  practices: Partial<Record<MindfulnessPractice, true>>;
}

interface State {
  days: Record<string, DayEntry>;
}

const STORAGE_KEY = "lj-mindfulness-tracker";

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function readState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { days: {} };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as State) : { days: {} };
  } catch {
    return { days: {} };
  }
}

function writeState(state: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function computeStreak(state: State, today = new Date()): number {
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const key = todayKey(cursor);
    const entry = state.days[key];
    if (!entry || Object.keys(entry.practices).length === 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function MindfulnessTracker() {
  const [state, setState] = React.useState<State>({ days: {} });
  const [hydrated, setHydrated] = React.useState(false);
  const today = todayKey();

  React.useEffect(() => {
    setState(readState());
    setHydrated(true);
  }, []);

  const todayEntry: DayEntry = state.days[today] ?? {
    date: today,
    practices: {},
  };

  function toggle(id: MindfulnessPractice) {
    setState((prev) => {
      const day: DayEntry = prev.days[today]
        ? { ...prev.days[today], practices: { ...prev.days[today].practices } }
        : { date: today, practices: {} };
      if (day.practices[id]) {
        delete day.practices[id];
      } else {
        day.practices[id] = true;
      }
      const next: State = { ...prev, days: { ...prev.days, [today]: day } };
      writeState(next);
      return next;
    });
  }

  if (!hydrated) return null;

  const streak = computeStreak(state);
  const completedToday = Object.keys(todayEntry.practices).length;
  const allDone = completedToday === MINDFULNESS_PRACTICES.length;

  return (
    <Card tone="raised" className="overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle">
            Today
          </p>
          <h3 className="font-display text-xl text-text tracking-tight mt-0.5">
            Mindfulness check-in
          </h3>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-accent leading-none">
            {streak}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-subtle mt-1">
            day streak
          </p>
        </div>
      </div>

      <CardContent className="pb-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {MINDFULNESS_PRACTICES.map((p) => {
            const done = Boolean(todayEntry.practices[p.id]);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={done}
                aria-label={`${p.label} — ${done ? "done" : "not done"}`}
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                  "hover:-translate-y-0.5 hover:shadow-sm",
                  done
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface-muted/40",
                )}
              >
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {p.emoji}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done ? "text-accent" : "text-text",
                    )}
                  >
                    {p.label}
                  </p>
                  <p className="text-[11px] text-text-subtle">{p.minDuration}</p>
                  {!done && (
                    <p className="text-[11px] text-text-muted mt-1 leading-snug">
                      {p.nudge}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge tone={allDone ? "success" : "neutral"} className="text-[10px]">
              {completedToday}/{MINDFULNESS_PRACTICES.length} today
            </Badge>
            {streak >= 3 && (
              <Badge tone="accent" className="text-[10px]">
                {streak >= 7 ? "Weekly habit" : "Building"}
              </Badge>
            )}
          </div>
          <ReminderHint streak={streak} completedToday={completedToday} />
        </div>

        {allDone && (
          <div className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-center">
            <p className="text-sm text-accent font-medium">
              Full house today — kind to yourself, brain and body.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderHint({
  streak,
  completedToday,
}: {
  streak: number;
  completedToday: number;
}) {
  if (completedToday === 0) {
    return (
      <p className="text-[11px] text-text-subtle italic">
        One emoji is enough to count today.
      </p>
    );
  }
  if (streak === 1) {
    return (
      <p className="text-[11px] text-text-subtle italic">
        Day 1. Consistency over intensity.
      </p>
    );
  }
  if (streak >= 7) {
    return (
      <p className="text-[11px] text-text-subtle italic">
        Habit forming — share with your care team if you like.
      </p>
    );
  }
  return null;
}

interface ReminderProps {
  /** A small banner you can place near the bedtime / morning sections. */
  context?: "morning" | "evening" | "anytime";
}

export function MindfulnessReminder({ context = "anytime" }: ReminderProps) {
  const copy =
    context === "morning"
      ? "Three slow breaths before your first task — no app required."
      : context === "evening"
        ? "Name one thing that went right today. Even small ones."
        : "When was your last actual exhale?";
  return (
    <div className="rounded-xl border border-dashed border-accent/40 bg-accent-soft/40 px-4 py-3 flex items-center gap-3">
      <span className="text-xl" aria-hidden="true">
        {"\u{1F343}"}
      </span>
      <p className="text-sm text-text-muted leading-snug">{copy}</p>
      <Button size="sm" variant="ghost" className="ml-auto shrink-0">
        Open
      </Button>
    </div>
  );
}

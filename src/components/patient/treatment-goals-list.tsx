"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import {
  computeAggregateProgress,
  type TreatmentGoalRecord,
} from "@/lib/domain/treatment-goals";
import { TreatmentGoalCard } from "./treatment-goal-card";

export interface TreatmentGoalsListProps {
  goals: TreatmentGoalRecord[];
  /** Optional deterministic "now" — mostly useful for tests / SSR. */
  now?: Date;
  className?: string;
}

/**
 * Renders the aggregate summary plus a stack of goal cards. Empty states
 * get their own delightful card instead of an awkward blank region.
 */
export function TreatmentGoalsList({
  goals,
  now,
  className,
}: TreatmentGoalsListProps) {
  const agg = computeAggregateProgress(goals);
  const effectiveNow = now ?? new Date();

  if (goals.length === 0) {
    return (
      <Card className={cn("rounded-2xl text-center", className)}>
        <CardContent className="py-12">
          <p className="text-5xl mb-3">🎯</p>
          <p className="font-display text-lg text-text">No goals set yet</p>
          <p className="text-sm text-text-muted mt-2 max-w-sm mx-auto">
            Pick a target worth working toward — pain, sleep, mood. We'll
            track the progress for you.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <AggregateSummary
        active={agg.active}
        completed={agg.completed}
        percent={agg.percent}
      />
      <div className="space-y-4">
        {goals.map((goal) => (
          <TreatmentGoalCard key={goal.id} goal={goal} now={effectiveNow} />
        ))}
      </div>
    </div>
  );
}

function AggregateSummary({
  active,
  completed,
  percent,
}: {
  active: number;
  completed: number;
  percent: number;
}) {
  return (
    <Card className="rounded-2xl" tone="raised">
      <CardContent className="py-6 px-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold">
              Overall progress
            </p>
            <p className="font-display text-3xl text-text tracking-tight mt-1 tabular-nums">
              {percent}%
            </p>
          </div>
          <div className="flex gap-2">
            <SummaryPill label="Active" value={active} />
            <SummaryPill label="Completed" value={completed} highlight />
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall treatment-goal progress: ${percent}%`}
          className="h-3 w-full rounded-full bg-surface-muted overflow-hidden border border-border/60"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all duration-700 ease-out"
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl py-2 px-3 border text-center min-w-[74px]",
        highlight
          ? "bg-accent-soft border-accent/30 text-accent"
          : "bg-surface-muted border-border/60 text-text-muted"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
        {label}
      </p>
      <p className="text-xl font-display tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  progressPercent,
  isOverdue,
  daysRemaining,
  TARGET_METRIC_LABELS,
  type TreatmentGoalRecord,
} from "@/lib/domain/treatment-goals";

export interface TreatmentGoalCardProps {
  goal: TreatmentGoalRecord;
  /**
   * Optional "current time" for deterministic rendering in tests. Defaults
   * to `new Date()`. Client callers will usually leave this unset.
   */
  now?: Date;
  /**
   * Optional className forwarded to the outer Card.
   */
  className?: string;
}

/**
 * Single treatment-goal card — iOS-aesthetic, animated progress bar, large
 * touch targets. Green when the goal is complete; amber when overdue.
 */
export function TreatmentGoalCard({
  goal,
  now,
  className,
}: TreatmentGoalCardProps) {
  const effectiveNow = now ?? new Date();
  const percent = progressPercent(goal);
  const complete = percent >= 100 || !!goal.completedAt;
  const overdue = isOverdue(goal, effectiveNow);
  const remaining = daysRemaining(goal, effectiveNow);

  // Tone drives both the card border accent and the progress-bar gradient.
  // Completed wins over overdue; overdue wins over default.
  const tone: "complete" | "overdue" | "active" = complete
    ? "complete"
    : overdue
    ? "overdue"
    : "active";

  const cardTone =
    tone === "complete"
      ? "bg-accent-soft/40 border-accent/30"
      : tone === "overdue"
      ? "bg-highlight-soft/40 border-highlight/30"
      : "";

  const barGradient =
    tone === "complete"
      ? "from-accent/80 to-accent"
      : tone === "overdue"
      ? "from-amber-300 to-amber-500"
      : "from-accent/60 to-accent";

  return (
    <Card className={cn("rounded-2xl transition-colors", cardTone, className)}>
      <CardContent className="py-6 px-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg text-text tracking-tight truncate">
              {goal.title}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-text-subtle font-semibold mt-1">
              {TARGET_METRIC_LABELS[goal.targetMetric]}
            </p>
          </div>
          <ProgressBadge
            tone={tone}
            remaining={remaining}
            complete={complete}
          />
        </div>

        {goal.description && (
          <p className="text-sm text-text-muted leading-relaxed mb-4">
            {goal.description}
          </p>
        )}

        {/* Animated progress bar — iOS-aesthetic rounded track */}
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.title} progress: ${percent}%`}
          className="h-3 w-full rounded-full bg-surface-muted overflow-hidden border border-border/60"
        >
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
              barGradient
            )}
            style={{ width: `${Math.max(2, percent)}%` }}
          />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-xs text-text-muted tabular-nums">
            <span className="font-display text-xl text-text">
              {formatNumber(goal.currentValue)}
            </span>
            <span className="text-text-subtle"> / {formatNumber(goal.targetValue)}</span>
          </div>
          <span className="text-[11px] tabular-nums text-text-muted">
            {percent}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBadge({
  tone,
  remaining,
  complete,
}: {
  tone: "complete" | "overdue" | "active";
  remaining: number | null;
  complete: boolean;
}) {
  if (complete) return <Badge tone="success">Complete</Badge>;

  if (tone === "overdue" && remaining !== null) {
    const days = Math.abs(remaining);
    return (
      <Badge tone="warning">
        {days === 0 ? "Due today" : `${days}d overdue`}
      </Badge>
    );
  }

  if (remaining === null) return <Badge tone="neutral">No deadline</Badge>;
  if (remaining === 0) return <Badge tone="info">Due today</Badge>;
  return <Badge tone="info">{remaining}d left</Badge>;
}

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  // Avoid noisy trailing zeros — show decimals only when they matter.
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

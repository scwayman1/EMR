"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  isActiveToday,
  STREAK_LABELS,
  type StreakActivityKind,
  type StreakRecord,
} from "@/lib/domain/streaks";
import type { SerializableStreakRecord } from "@/app/actions/streakActions";

/**
 * StreakBadge — iOS-style pill showing "🔥 {n}-day streak".
 *
 * Renders a subtle pulse animation when `isActiveToday(record, now)` is
 * true (the patient has already logged today — reward visible immediately).
 * Renders muted when inactive (yesterday's streak still alive, or the
 * record is empty / broken) so the active case actually stands out.
 *
 * Accepts either a hydrated in-memory `StreakRecord` (where
 * lastActivityDate is a Date) or the wire-serialized shape returned
 * from server actions (where it's an ISO string).
 */
export interface StreakBadgeProps {
  record: StreakRecord | SerializableStreakRecord;
  /** Override "now" for tests / Storybook. Defaults to new Date() at render. */
  now?: Date;
  /** When true, hides the label and renders an icon-only pill. */
  compact?: boolean;
  className?: string;
}

function hydrate(record: StreakRecord | SerializableStreakRecord): StreakRecord {
  const last =
    record.lastActivityDate === null || record.lastActivityDate === undefined
      ? null
      : record.lastActivityDate instanceof Date
        ? record.lastActivityDate
        : new Date(record.lastActivityDate);
  return {
    patientId: record.patientId,
    activityKind: record.activityKind as StreakActivityKind,
    currentStreakDays: record.currentStreakDays,
    longestStreakDays: record.longestStreakDays,
    lastActivityDate: last,
  };
}

export function StreakBadge({ record, now, compact = false, className }: StreakBadgeProps) {
  const hydrated = hydrate(record);
  const resolvedNow = now ?? new Date();
  const active = isActiveToday(hydrated, resolvedNow);
  const days = hydrated.currentStreakDays;
  const meta = STREAK_LABELS[hydrated.activityKind];

  // Empty / never-logged state.
  if (days === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
          "bg-surface-muted text-text-muted border-border-strong/40",
          className,
        )}
        aria-label={`${meta.title}: no streak yet`}
      >
        <span aria-hidden="true" className="opacity-60">
          {meta.emoji}
        </span>
        <span>Start streak</span>
      </span>
    );
  }

  const label = compact ? `${days}` : `${days}-day streak`;

  return (
    <span
      className={cn(
        // iOS pill: rounded-full, high-density padding, subtle border.
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        "transition-colors",
        active
          ? "bg-[color:var(--accent-soft)] text-accent border-accent/25 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
          : "bg-surface-muted text-text border-border-strong/40",
        active && "lj-streak-pulse",
        className,
      )}
      aria-label={`${meta.title}: ${days}-day streak${active ? ", active today" : ""}`}
      title={active ? "You've logged today — keep it going!" : "Log today to extend your streak"}
    >
      <style>{`
        @keyframes ljStreakPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.35); }
          50%      { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.00); }
        }
        .lj-streak-pulse {
          animation: ljStreakPulse 1.8s ease-in-out infinite;
        }
        .reduce-motion .lj-streak-pulse {
          animation: none !important;
        }
      `}</style>
      <span aria-hidden="true">🔥</span>
      <span>{label}</span>
    </span>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  STREAK_ACTIVITY_KINDS,
  STREAK_LABELS,
  type StreakActivityKind,
  type StreakRecord,
} from "@/lib/domain/streaks";
import type { SerializableStreakRecord } from "@/app/actions/streakActions";
import { StreakBadge } from "./streak-badge";

/**
 * StreakSummary — patient-facing summary card listing every streak kind
 * with its pill badge + longest-ever highlight.
 *
 * Part of the Dr. Patel "Fun > friction" surface: make consistency
 * visible, celebrate the personal best. The "Best: N days" tag below
 * each row anchors the gamified loop — even when the current streak
 * resets, the lifetime best is still visible.
 *
 * Server component. Callers should pre-fetch `records` via
 * getStreakSummary(patientId) so this renders without a client round-trip.
 */
export interface StreakSummaryProps {
  records: ReadonlyArray<StreakRecord | SerializableStreakRecord>;
  /** When true, orders rows by current streak (desc) — useful when rendering in a sidebar. */
  sortByCurrent?: boolean;
  className?: string;
}

type AnyRecord = StreakRecord | SerializableStreakRecord;

function fillMissingKinds(records: ReadonlyArray<AnyRecord>): AnyRecord[] {
  const byKind = new Map<StreakActivityKind, AnyRecord>();
  for (const r of records) {
    byKind.set(r.activityKind as StreakActivityKind, r);
  }
  return STREAK_ACTIVITY_KINDS.map(
    (kind) =>
      byKind.get(kind) ?? {
        patientId: "",
        activityKind: kind,
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActivityDate: null,
      },
  );
}

export function StreakSummary({ records, sortByCurrent = false, className }: StreakSummaryProps) {
  const complete = fillMissingKinds(records);
  const ordered = sortByCurrent
    ? [...complete].sort((a, b) => b.currentStreakDays - a.currentStreakDays)
    : complete;

  const overallBest = complete.reduce(
    (max, r) => (r.longestStreakDays > max.longestStreakDays ? r : max),
    complete[0],
  );
  const hasAnyBest = overallBest && overallBest.longestStreakDays > 0;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-surface-raised p-5",
        "shadow-sm",
        className,
      )}
      aria-label="Your streaks"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg tracking-tight text-text">Your streaks</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Log something every day to keep the fire going.
          </p>
        </div>
        {hasAnyBest && (
          <div
            className="rounded-xl bg-highlight-soft px-3 py-2 text-right"
            aria-label={`Personal best: ${overallBest.longestStreakDays} days of ${STREAK_LABELS[overallBest.activityKind as StreakActivityKind].title}`}
          >
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              Personal best
            </div>
            <div className="mt-0.5 font-display text-base leading-none text-text">
              <span aria-hidden="true">🏆</span>{" "}
              {overallBest.longestStreakDays}
              <span className="ml-1 text-xs font-normal text-text-muted">
                days · {STREAK_LABELS[overallBest.activityKind as StreakActivityKind].emoji}
              </span>
            </div>
          </div>
        )}
      </header>

      <ul className="flex flex-col gap-3">
        {ordered.map((r) => {
          const kind = r.activityKind as StreakActivityKind;
          const meta = STREAK_LABELS[kind];
          const isOverallBest =
            hasAnyBest &&
            r.activityKind === overallBest.activityKind &&
            r.longestStreakDays === overallBest.longestStreakDays &&
            r.longestStreakDays > 0;
          return (
            <li
              key={kind}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3",
                isOverallBest
                  ? "border-highlight/40 bg-highlight-soft/40"
                  : "border-border-strong/30 bg-surface",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none" aria-hidden="true">
                  {meta.emoji}
                </span>
                <div>
                  <div className="text-sm font-medium text-text">{meta.title}</div>
                  <div className="text-[11px] text-text-muted">
                    Best: {r.longestStreakDays} {r.longestStreakDays === 1 ? "day" : "days"}
                  </div>
                </div>
              </div>
              <StreakBadge record={r} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

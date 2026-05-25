"use client";

/**
 * CalendarToolbar — header bar for the calendar primitive
 * --------------------------------------------------------
 * Layout (left → right):
 *   [← Today →]   [Month label]   [Date picker]   [Month | Week | Day]
 *
 * Reuses the project's DatePicker primitive (PR #463). No new deps.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { DatePicker, toISODate, fromISODate } from "@/components/ui/date-picker";
import type { CalendarView } from "./types";
import {
  addDays,
  addMonths,
  formatMonthYear,
  formatWeekRange,
  formatDayLong,
} from "./utils";

export interface CalendarToolbarProps {
  value: Date;
  view: CalendarView;
  onChange: (date: Date) => void;
  onViewChange?: (view: CalendarView) => void;
  /** Hide the view switcher (when the surface only supports one view). */
  views?: CalendarView[];
  className?: string;
}

export function CalendarToolbar({
  value,
  view,
  onChange,
  onViewChange,
  views = ["month", "week", "day"],
  className,
}: CalendarToolbarProps) {
  const isoValue = toISODate(value);

  function step(delta: number) {
    if (view === "month") onChange(addMonths(value, delta));
    else if (view === "week") onChange(addDays(value, delta * 7));
    else onChange(addDays(value, delta));
  }

  const label =
    view === "month"
      ? formatMonthYear(value)
      : view === "week"
        ? formatWeekRange(addDays(value, -value.getDay()))
        : formatDayLong(value);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 flex-wrap",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-md border border-border bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="h-9 px-2.5 text-text-subtle hover:bg-surface-muted hover:text-text transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onChange(new Date())}
            className="h-9 px-3 text-sm font-medium text-text border-l border-r border-border hover:bg-surface-muted transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="h-9 px-2.5 text-text-subtle hover:bg-surface-muted hover:text-text transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <h2 className="text-base font-display font-semibold text-text tracking-tight ml-1">
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-44">
          <DatePicker
            value={isoValue}
            onChange={(v) => {
              const d = fromISODate(v);
              if (d) onChange(d);
            }}
          />
        </div>
        {onViewChange && views.length > 1 && (
          <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
            {views.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onViewChange(v)}
                className={cn(
                  "h-8 px-3 text-xs font-semibold rounded-[5px] capitalize transition-colors",
                  view === v
                    ? "bg-accent text-accent-ink"
                    : "text-text-subtle hover:text-text"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

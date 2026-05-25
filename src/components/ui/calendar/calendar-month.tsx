"use client";

/**
 * CalendarMonth — 6-week month grid
 * ----------------------------------
 * Apple-Calendar styling: hairline grid, weekend tinted, today subtly
 * highlighted. Click a day to select; hover for preview. Keyboard arrow
 * keys move selection; Enter opens the day (caller decides via onSelect).
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { CalendarEvent } from "./types";
import { EventBlock } from "./event-block";
import {
  addDays,
  eventsForDay,
  formatDayNum,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
  weekdayLabels,
} from "./utils";

export interface CalendarMonthProps {
  /** Anchor date — any day within the displayed month. */
  value: Date;
  onChange?: (date: Date) => void;
  events?: CalendarEvent[];
  /** Maximum chips to render per day before showing "+N more". */
  maxEventsPerDay?: number;
  /** Called when user opens an event (click or Enter). */
  onEventClick?: (event: CalendarEvent) => void;
  /** Called when user activates a day (Enter or double-click). */
  onDayActivate?: (date: Date) => void;
  className?: string;
}

export function CalendarMonth({
  value,
  onChange,
  events = [],
  maxEventsPerDay = 3,
  onEventClick,
  onDayActivate,
  className,
}: CalendarMonthProps) {
  const monthStart = startOfMonth(value);
  const gridStart = startOfWeek(monthStart);
  const labels = React.useMemo(() => weekdayLabels(), []);
  const today = React.useMemo(() => new Date(), []);

  // 6 rows × 7 days = 42 cells — stable layout
  const cells = React.useMemo<Date[]>(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) arr.push(addDays(gridStart, i));
    return arr;
  }, [gridStart]);

  // Bucket events per ISO date string once
  const eventsByDay = React.useMemo<Map<string, CalendarEvent[]>>(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of cells) {
      const list = eventsForDay(events, day);
      if (list.length) map.set(day.toDateString(), list);
    }
    return map;
  }, [cells, events]);

  const [cursor, setCursor] = React.useState<Date>(value);
  React.useEffect(() => setCursor(value), [value]);

  function move(deltaDays: number) {
    const next = addDays(cursor, deltaDays);
    setCursor(next);
    onChange?.(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-7);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      move(7);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onDayActivate?.(cursor);
    }
  }

  return (
    <div
      role="grid"
      aria-label="Month calendar"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "w-full select-none rounded-xl border border-border bg-surface overflow-hidden",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        className
      )}
    >
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-surface-muted/40">
        {labels.map((lab, i) => (
          <div
            key={lab}
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wider text-text-subtle text-center py-2",
              (i === 0 || i === 6) && "text-text-subtle/70"
            )}
          >
            {lab}
          </div>
        ))}
      </div>

      {/* 6-week grid */}
      <div className="grid grid-cols-7 grid-rows-6">
        {cells.map((day, idx) => {
          const inMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, cursor);
          const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
          const overflow = dayEvents.length - maxEventsPerDay;
          const isLastCol = idx % 7 === 6;
          const isLastRow = idx >= 35;

          return (
            <button
              key={idx}
              type="button"
              role="gridcell"
              aria-current={isToday ? "date" : undefined}
              aria-selected={isSelected}
              onClick={() => {
                setCursor(day);
                onChange?.(day);
              }}
              onDoubleClick={() => onDayActivate?.(day)}
              className={cn(
                "relative flex flex-col items-stretch min-h-[88px] p-1.5 text-left",
                "border-b border-r border-border/60",
                isLastCol && "border-r-0",
                isLastRow && "border-b-0",
                isWeekend(day) && "bg-surface-muted/30",
                !inMonth && "bg-surface-muted/10 text-text-subtle/60",
                isSelected && "ring-2 ring-inset ring-accent/40 z-[1]",
                "hover:bg-surface-muted/50 transition-colors focus:outline-none"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "inline-flex items-center justify-center text-[12px] tabular-nums font-semibold leading-none",
                    isToday
                      ? "h-6 w-6 rounded-full bg-accent text-accent-ink"
                      : inMonth
                        ? "text-text"
                        : "text-text-subtle/50"
                  )}
                >
                  {formatDayNum(day)}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] tabular-nums text-text-subtle">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, maxEventsPerDay).map((ev) => (
                  <EventBlock
                    key={ev.id}
                    event={ev}
                    variant="chip"
                    onClick={onEventClick}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-[10px] text-text-subtle pl-1">
                    +{overflow} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

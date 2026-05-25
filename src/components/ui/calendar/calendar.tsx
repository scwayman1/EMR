"use client";

/**
 * <Calendar> — composed primitive
 * --------------------------------
 * Drop-in surface that wires the toolbar to the three views. Use this when
 * a page just wants "give me a calendar"; reach for the lower-level pieces
 * (CalendarMonth / CalendarWeek / CalendarDay) when you need to compose
 * something custom.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { CalendarEvent, CalendarView } from "./types";
import { CalendarMonth } from "./calendar-month";
import { CalendarWeek } from "./calendar-week";
import { CalendarDay } from "./calendar-day";
import { CalendarToolbar } from "./calendar-toolbar";

export interface CalendarProps {
  /** Current displayed/selected date. */
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date) => void;
  /** Current view; controlled. */
  view?: CalendarView;
  defaultView?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  views?: CalendarView[];
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onCreate?: (start: Date, end: Date) => void;
  /** Hide the toolbar entirely (callers can render their own). */
  hideToolbar?: boolean;
  className?: string;
  /** Forwarded to CalendarWeek/Day. */
  startHour?: number;
  endHour?: number;
}

export function Calendar({
  value,
  defaultValue,
  onChange,
  view,
  defaultView = "week",
  onViewChange,
  views = ["month", "week", "day"],
  events = [],
  onEventClick,
  onCreate,
  hideToolbar,
  className,
  startHour,
  endHour,
}: CalendarProps) {
  const [internalDate, setInternalDate] = React.useState<Date>(
    defaultValue ?? new Date()
  );
  const date = value ?? internalDate;
  function setDate(d: Date) {
    if (value === undefined) setInternalDate(d);
    onChange?.(d);
  }

  const [internalView, setInternalView] = React.useState<CalendarView>(defaultView);
  const currentView = view ?? internalView;
  function setView(v: CalendarView) {
    if (view === undefined) setInternalView(v);
    onViewChange?.(v);
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!hideToolbar && (
        <CalendarToolbar
          value={date}
          view={currentView}
          onChange={setDate}
          onViewChange={setView}
          views={views}
        />
      )}

      {currentView === "month" && (
        <CalendarMonth
          value={date}
          onChange={setDate}
          events={events}
          onEventClick={onEventClick}
          onDayActivate={(d) => {
            setDate(d);
            setView("day");
          }}
        />
      )}
      {currentView === "week" && (
        <CalendarWeek
          value={date}
          events={events}
          onCreate={onCreate}
          onEventClick={onEventClick}
          startHour={startHour}
          endHour={endHour}
        />
      )}
      {currentView === "day" && (
        <CalendarDay
          value={date}
          events={events}
          onCreate={onCreate}
          onEventClick={onEventClick}
          startHour={startHour}
          endHour={endHour}
        />
      )}
    </div>
  );
}

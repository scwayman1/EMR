"use client";

/**
 * CalendarWeek — 7-column day grid with hour rows
 * ------------------------------------------------
 * Drag the empty grid to create a block (calls `onCreate(start, end)`).
 * Click an event to open detail. Today is subtly highlighted. Weekend
 * columns tinted. Hairline grid throughout.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { CalendarEvent } from "./types";
import { EventBlock } from "./event-block";
import {
  addDays,
  eventEnd,
  eventStart,
  isSameDay,
  isWeekend,
  startOfDay,
  startOfWeek,
  useReducedMotion,
} from "./utils";

export interface CalendarWeekProps {
  /** Any date — the surrounding week (Sun..Sat) is rendered. */
  value: Date;
  events?: CalendarEvent[];
  onCreate?: (start: Date, end: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  /** Earliest displayed hour, default 7. */
  startHour?: number;
  /** Latest displayed hour (exclusive), default 20. */
  endHour?: number;
  /** Pixels per hour, default 56. */
  hourHeight?: number;
  className?: string;
}

const HALF_HOUR_MIN = 30;

export function CalendarWeek({
  value,
  events = [],
  onCreate,
  onEventClick,
  startHour = 7,
  endHour = 20,
  hourHeight = 56,
  className,
}: CalendarWeekProps) {
  const weekStart = React.useMemo(() => startOfWeek(value), [value]);
  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const totalMinutes = (endHour - startHour) * 60;
  const reduced = useReducedMotion();

  // Drag-to-create state
  const [drag, setDrag] = React.useState<{
    dayIdx: number;
    startMin: number;
    endMin: number;
  } | null>(null);

  const colRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  function pointerMinutes(e: React.PointerEvent<HTMLDivElement>, dayIdx: number): number {
    const el = colRefs.current[dayIdx];
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const minutes = (y / rect.height) * totalMinutes + startHour * 60;
    // Snap to half-hour increments
    return Math.round(minutes / HALF_HOUR_MIN) * HALF_HOUR_MIN;
  }

  function commitDrag() {
    if (!drag || !onCreate) {
      setDrag(null);
      return;
    }
    const day = days[drag.dayIdx];
    const lo = Math.min(drag.startMin, drag.endMin);
    const hi = Math.max(drag.startMin, drag.endMin);
    if (hi - lo < HALF_HOUR_MIN) {
      setDrag(null);
      return;
    }
    const s = startOfDay(day);
    s.setMinutes(lo);
    const e = startOfDay(day);
    e.setMinutes(hi);
    onCreate(s, e);
    setDrag(null);
  }

  const hours = React.useMemo(() => {
    const out: number[] = [];
    for (let h = startHour; h < endHour; h++) out.push(h);
    return out;
  }, [startHour, endHour]);

  // Current-time indicator
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface overflow-hidden",
        className
      )}
    >
      {/* Day header row */}
      <div
        className="grid border-b border-border/60 bg-surface-muted/30"
        style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}
      >
        <div className="h-12" />
        {days.map((d, i) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div
              key={i}
              className={cn(
                "h-12 flex flex-col items-center justify-center border-l border-border/60",
                isWeekend(d) && "bg-surface-muted/40"
              )}
            >
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold",
                  isToday ? "text-accent" : "text-text-subtle"
                )}
              >
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums leading-none mt-0.5",
                  isToday
                    ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-ink"
                    : "text-text"
                )}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div
        className="grid relative"
        style={{ gridTemplateColumns: `64px repeat(7, minmax(0, 1fr))` }}
      >
        {/* Time gutter */}
        <div className="relative">
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: hourHeight }}
              className="relative border-t border-border/40 first:border-t-0"
            >
              <span className="absolute -top-2 right-2 text-[10px] tabular-nums text-text-subtle bg-surface px-1">
                {formatHour(h)}
              </span>
            </div>
          ))}
        </div>

        {days.map((d, dayIdx) => (
          <DayColumn
            key={dayIdx}
            ref={(el) => {
              colRefs.current[dayIdx] = el;
            }}
            day={d}
            dayIdx={dayIdx}
            events={events.filter((ev) => isSameDay(eventStart(ev), d))}
            startHour={startHour}
            endHour={endHour}
            hourHeight={hourHeight}
            hours={hours}
            now={now}
            onEventClick={onEventClick}
            drag={drag?.dayIdx === dayIdx ? drag : null}
            reduced={reduced}
            onPointerDown={(e) => {
              if (!onCreate) return;
              if (e.button !== 0) return;
              if ((e.target as HTMLElement).closest("[data-event-block]")) return;
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              const m = pointerMinutes(e, dayIdx);
              setDrag({ dayIdx, startMin: m, endMin: m + HALF_HOUR_MIN });
            }}
            onPointerMove={(e) => {
              if (!drag || drag.dayIdx !== dayIdx) return;
              const m = pointerMinutes(e, dayIdx);
              setDrag((cur) => (cur ? { ...cur, endMin: m } : cur));
            }}
            onPointerUp={commitDrag}
            onPointerCancel={() => setDrag(null)}
          />
        ))}
      </div>
    </div>
  );
}

const DayColumn = React.forwardRef<
  HTMLDivElement,
  {
    day: Date;
    dayIdx: number;
    events: CalendarEvent[];
    startHour: number;
    endHour: number;
    hourHeight: number;
    hours: number[];
    now: Date;
    onEventClick?: (ev: CalendarEvent) => void;
    drag: { dayIdx: number; startMin: number; endMin: number } | null;
    reduced: boolean;
    onPointerDown: React.PointerEventHandler<HTMLDivElement>;
    onPointerMove: React.PointerEventHandler<HTMLDivElement>;
    onPointerUp: React.PointerEventHandler<HTMLDivElement>;
    onPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  }
>(function DayColumn(
  {
    day,
    events,
    startHour,
    endHour,
    hourHeight,
    hours,
    now,
    onEventClick,
    drag,
    reduced,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  },
  ref
) {
  const totalMinutes = (endHour - startHour) * 60;
  const totalPx = hours.length * hourHeight;
  const isToday = isSameDay(day, now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const showNowLine =
    isToday && minutesNow >= startHour * 60 && minutesNow <= endHour * 60;
  const nowOffset = ((minutesNow - startHour * 60) / totalMinutes) * totalPx;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        "relative border-l border-border/60 select-none touch-none",
        isWeekend(day) && "bg-surface-muted/30",
        isToday && "bg-accent-soft/20"
      )}
      style={{ height: totalPx }}
    >
      {/* Half-hour grid lines */}
      {hours.map((_, i) => (
        <React.Fragment key={i}>
          <div
            className="absolute left-0 right-0 border-t border-border/40"
            style={{ top: i * hourHeight }}
          />
          <div
            className="absolute left-0 right-0 border-t border-dashed border-border/25"
            style={{ top: i * hourHeight + hourHeight / 2 }}
          />
        </React.Fragment>
      ))}

      {/* Now-line */}
      {showNowLine && (
        <div
          className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{ top: nowOffset }}
        >
          <div className="relative h-px bg-rose-500">
            <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" />
          </div>
        </div>
      )}

      {/* Events */}
      {events.map((ev) => {
        const s = eventStart(ev);
        const e = eventEnd(ev);
        const sm = clamp(
          s.getHours() * 60 + s.getMinutes(),
          startHour * 60,
          endHour * 60
        );
        const em = clamp(
          e.getHours() * 60 + e.getMinutes(),
          startHour * 60,
          endHour * 60
        );
        const top = ((sm - startHour * 60) / totalMinutes) * totalPx;
        const height = Math.max(
          22,
          ((em - sm) / totalMinutes) * totalPx - 2
        );
        return (
          <div
            key={ev.id}
            data-event-block
            className="absolute left-1 right-1 z-[2]"
            style={{
              top,
              height,
              transition: reduced ? "none" : "top 120ms ease, height 120ms ease",
            }}
          >
            <EventBlock event={ev} variant="block" onClick={onEventClick} />
          </div>
        );
      })}

      {/* Drag preview */}
      {drag && (
        <div
          aria-hidden="true"
          className="absolute left-1 right-1 z-[1] rounded-lg border-2 border-dashed border-accent/60 bg-accent-soft/40 pointer-events-none"
          style={{
            top:
              ((Math.min(drag.startMin, drag.endMin) - startHour * 60) /
                totalMinutes) *
              totalPx,
            height:
              ((Math.abs(drag.endMin - drag.startMin)) / totalMinutes) * totalPx,
          }}
        />
      )}
    </div>
  );
});

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function formatHour(h: number): string {
  // 12-hour style with AM/PM, matches iOS Calendar gutter.
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

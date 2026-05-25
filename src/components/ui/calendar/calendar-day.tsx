"use client";

/**
 * CalendarDay — single-day timeline with half-hour increments
 * ------------------------------------------------------------
 * Drag a half-hour slot to create. Click event for detail.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import type { CalendarEvent } from "./types";
import { EventBlock } from "./event-block";
import {
  eventEnd,
  eventStart,
  formatDayLong,
  isSameDay,
  startOfDay,
  useReducedMotion,
} from "./utils";

export interface CalendarDayProps {
  value: Date;
  events?: CalendarEvent[];
  onCreate?: (start: Date, end: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  startHour?: number;
  endHour?: number;
  /** Pixels per hour, default 64. */
  hourHeight?: number;
  className?: string;
}

const HALF_HOUR_MIN = 30;

export function CalendarDay({
  value,
  events = [],
  onCreate,
  onEventClick,
  startHour = 7,
  endHour = 20,
  hourHeight = 64,
  className,
}: CalendarDayProps) {
  const totalMinutes = (endHour - startHour) * 60;
  const dayEvents = events.filter((ev) => isSameDay(eventStart(ev), value));
  const reduced = useReducedMotion();

  const hours = React.useMemo(() => {
    const out: number[] = [];
    for (let h = startHour; h < endHour; h++) out.push(h);
    return out;
  }, [startHour, endHour]);
  const totalPx = hours.length * hourHeight;

  const [drag, setDrag] = React.useState<{ startMin: number; endMin: number } | null>(null);
  const colRef = React.useRef<HTMLDivElement | null>(null);

  function pointerMinutes(e: React.PointerEvent<HTMLDivElement>): number {
    const el = colRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const minutes = (y / rect.height) * totalMinutes + startHour * 60;
    return Math.round(minutes / HALF_HOUR_MIN) * HALF_HOUR_MIN;
  }

  function commitDrag() {
    if (!drag || !onCreate) {
      setDrag(null);
      return;
    }
    const lo = Math.min(drag.startMin, drag.endMin);
    const hi = Math.max(drag.startMin, drag.endMin);
    if (hi - lo < HALF_HOUR_MIN) {
      setDrag(null);
      return;
    }
    const s = startOfDay(value);
    s.setMinutes(lo);
    const e = startOfDay(value);
    e.setMinutes(hi);
    onCreate(s, e);
    setDrag(null);
  }

  // Now line
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const isToday = isSameDay(value, now);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const showNowLine =
    isToday && minutesNow >= startHour * 60 && minutesNow <= endHour * 60;
  const nowOffset = ((minutesNow - startHour * 60) / totalMinutes) * totalPx;

  return (
    <div className={cn("rounded-xl border border-border bg-surface overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/60 bg-surface-muted/30">
        <h3 className="text-sm font-semibold text-text">{formatDayLong(value)}</h3>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: `64px 1fr` }}
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

        {/* Body column */}
        <div
          ref={colRef}
          onPointerDown={(e) => {
            if (!onCreate) return;
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).closest("[data-event-block]")) return;
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            const m = pointerMinutes(e);
            setDrag({ startMin: m, endMin: m + HALF_HOUR_MIN });
          }}
          onPointerMove={(e) => {
            if (!drag) return;
            const m = pointerMinutes(e);
            setDrag((cur) => (cur ? { ...cur, endMin: m } : cur));
          }}
          onPointerUp={commitDrag}
          onPointerCancel={() => setDrag(null)}
          className={cn("relative border-l border-border/60 select-none touch-none", isToday && "bg-accent-soft/20")}
          style={{ height: totalPx }}
        >
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

          {dayEvents.map((ev) => {
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
            const height = Math.max(24, ((em - sm) / totalMinutes) * totalPx - 2);
            return (
              <div
                key={ev.id}
                data-event-block
                className="absolute left-2 right-2 z-[2]"
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

          {drag && (
            <div
              aria-hidden="true"
              className="absolute left-2 right-2 z-[1] rounded-lg border-2 border-dashed border-accent/60 bg-accent-soft/40 pointer-events-none"
              style={{
                top:
                  ((Math.min(drag.startMin, drag.endMin) - startHour * 60) /
                    totalMinutes) *
                  totalPx,
                height:
                  (Math.abs(drag.endMin - drag.startMin) / totalMinutes) * totalPx,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function formatHour(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

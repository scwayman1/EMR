"use client";

/**
 * EventBlock — single rendered event chip
 * ----------------------------------------
 * Used by all three views (Month/Week/Day). Color-coded by `event.color`,
 * dimmed when the event has ended. If `href` is set it renders an <a>; else
 * it renders a <button> that fires `onClick`.
 */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { CalendarEvent } from "./types";
import { eventColorClasses, formatTime, eventStart, eventEnd, isEventPast } from "./utils";

export type EventBlockVariant = "chip" | "block";

export interface EventBlockProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  /** "chip" = single-line month-grid pill, "block" = stacked block for week/day */
  variant?: EventBlockVariant;
  /** Optional inline style (used by week/day grids for positioning). */
  style?: React.CSSProperties;
  className?: string;
  draggable?: boolean;
  onDragStart?: React.DragEventHandler<HTMLElement>;
  /** Hide the time label (useful for very short chips). */
  hideTime?: boolean;
}

export function EventBlock({
  event,
  onClick,
  variant = "chip",
  style,
  className,
  draggable,
  onDragStart,
  hideTime,
}: EventBlockProps) {
  const colors = eventColorClasses(event.color);
  const past = isEventPast(event);
  const start = eventStart(event);
  const end = eventEnd(event);

  const content = (
    <>
      {variant === "block" && (
        <span
          aria-hidden="true"
          className={cn("absolute left-0 top-1 bottom-1 w-[3px] rounded-r", colors.bar)}
        />
      )}
      <span
        className={cn(
          "block truncate font-semibold leading-tight",
          variant === "chip" ? "text-[11px]" : "text-[12px]"
        )}
      >
        {event.title}
      </span>
      {!hideTime && variant === "block" && (
        <span className="block truncate text-[10px] opacity-80 mt-0.5 tabular-nums">
          {formatTime(start)} – {formatTime(end)}
        </span>
      )}
      {variant === "chip" && !hideTime && (
        <span className="ml-1 text-[10px] opacity-70 tabular-nums shrink-0">
          {formatTime(start)}
        </span>
      )}
    </>
  );

  const baseClass = cn(
    "relative overflow-hidden text-left transition-colors",
    variant === "block"
      ? "block w-full rounded-lg border pl-2.5 pr-2 py-1.5 shadow-sm"
      : "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 max-w-full",
    colors.bg,
    colors.border,
    variant === "block" && "border",
    colors.text,
    "hover:brightness-95 dark:hover:brightness-110",
    past && "opacity-55 saturate-50",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
    className
  );

  const title = `${event.title} · ${formatTime(start)}–${formatTime(end)}${event.description ? ` · ${event.description}` : ""}`;

  if (event.href) {
    return (
      <Link
        href={event.href}
        title={title}
        className={baseClass}
        style={style}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      title={title}
      className={baseClass}
      style={style}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={() => onClick?.(event)}
    >
      {content}
    </button>
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventKind =
  | "visit"
  | "medication"
  | "assessment"
  | "milestone"
  | "task";

export interface TimelineEventData {
  id: string;
  kind: EventKind;
  date: string; // ISO string — serialized from server
  title: string;
  subtitle: string | null;
  badges: Array<{ label: string; tone: BadgeTone }>;
  detail: string | null;
  isMilestone?: boolean;
}

type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "highlight";

// ---------------------------------------------------------------------------
// Dot color per event kind
// ---------------------------------------------------------------------------

const DOT_CLASSES: Record<EventKind, string> = {
  visit: "bg-green-500 border-green-200",
  medication: "bg-purple-500 border-purple-200",
  assessment: "bg-blue-500 border-blue-200",
  milestone: "bg-amber-500 border-amber-200",
  task: "bg-gray-400 border-gray-200",
};

const DOT_GLOW: Record<EventKind, string> = {
  visit: "shadow-[0_0_8px_rgba(34,197,94,0.3)]",
  medication: "shadow-[0_0_8px_rgba(168,85,247,0.3)]",
  assessment: "shadow-[0_0_8px_rgba(59,130,246,0.3)]",
  milestone: "shadow-[0_0_10px_rgba(245,158,11,0.45)]",
  task: "",
};

const KIND_LABELS: Record<EventKind, string> = {
  visit: "Visit",
  medication: "Medication",
  assessment: "Assessment",
  milestone: "Milestone",
  task: "Task",
};

// ---------------------------------------------------------------------------
// Timeline Card
// ---------------------------------------------------------------------------

export function TimelineCard({ event }: { event: TimelineEventData }) {
  const [open, setOpen] = React.useState(false);
  const hasDetail = !!event.detail;

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = new Date(event.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[80px_24px_1fr] md:grid-cols-[120px_24px_1fr] gap-x-3 md:gap-x-5",
        event.isMilestone && "milestone-row"
      )}
    >
      {/* ---- Left: date label ---- */}
      <div className="text-right pt-1 pr-1">
        <p className="text-xs font-medium text-text-muted leading-tight">
          {formattedDate}
        </p>
        <p className="text-[10px] text-text-subtle">{formattedTime}</p>
      </div>

      {/* ---- Center: dot on the line ---- */}
      <div className="relative flex flex-col items-center">
        {/* The continuous vertical line is drawn by the parent; we just render the dot */}
        <span
          className={cn(
            "relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-shadow",
            DOT_CLASSES[event.kind],
            DOT_GLOW[event.kind],
            event.isMilestone && "h-5 w-5 mt-0.5"
          )}
          aria-hidden="true"
        />
      </div>

      {/* ---- Right: event card ---- */}
      <div className="pb-6 min-w-0">
        <button
          type="button"
          className={cn(
            "w-full text-left rounded-xl border px-4 py-3 transition-all duration-200",
            "bg-surface-raised border-border shadow-sm",
            hasDetail && "cursor-pointer hover:shadow-md hover:border-accent/30",
            event.isMilestone &&
              "ring-1 ring-amber-300/40 border-amber-200/60 bg-gradient-to-br from-surface-raised to-amber-50/30",
            !hasDetail && "cursor-default"
          )}
          onClick={() => hasDetail && setOpen(!open)}
          aria-expanded={hasDetail ? open : undefined}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    event.kind === "visit" && "text-green-600",
                    event.kind === "medication" && "text-purple-600",
                    event.kind === "assessment" && "text-blue-600",
                    event.kind === "milestone" && "text-amber-600",
                    event.kind === "task" && "text-gray-500"
                  )}
                >
                  {KIND_LABELS[event.kind]}
                </span>
                {event.badges.map((b) => (
                  <Badge key={b.label} tone={b.tone}>
                    {b.label}
                  </Badge>
                ))}
              </div>
              <p className="text-sm font-medium text-text mt-1 leading-snug">
                {event.title}
              </p>
              {event.subtitle && (
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  {event.subtitle}
                </p>
              )}
            </div>
            {hasDetail && (
              <span
                className={cn(
                  "mt-1 text-text-subtle transition-transform duration-200 text-xs shrink-0",
                  open && "rotate-180"
                )}
                aria-hidden="true"
              >
                &#9662;
              </span>
            )}
          </div>

          {/* Expandable detail */}
          {hasDetail && open && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">
                {event.detail}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline wrapper — renders the vertical line and all cards
// ---------------------------------------------------------------------------

export function Timeline({ events }: { events: TimelineEventData[] }) {
  if (events.length === 0) return null;

  return (
    <div className="relative">
      {/* Continuous vertical line behind the dots */}
      <div
        className="absolute left-[calc(80px+12px+6px)] md:left-[calc(120px+20px+6px)] top-0 bottom-0 w-px bg-gradient-to-b from-accent/30 via-border-strong/40 to-transparent print:bg-gray-300"
        aria-hidden="true"
      />

      {events.map((event) => (
        <TimelineCard key={event.id} event={event} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar (client-side)
// ---------------------------------------------------------------------------

const ALL_KINDS: EventKind[] = [
  "visit",
  "medication",
  "assessment",
  "milestone",
  "task",
];

const FILTER_LABELS: Record<EventKind, string> = {
  visit: "Visits",
  medication: "Medications",
  assessment: "Assessments",
  milestone: "Milestones",
  task: "Tasks",
};

const FILTER_DOT: Record<EventKind, string> = {
  visit: "bg-green-500",
  medication: "bg-purple-500",
  assessment: "bg-blue-500",
  milestone: "bg-amber-500",
  task: "bg-gray-400",
};

export function TimelineWithFilters({
  events,
}: {
  events: TimelineEventData[];
}) {
  const [activeFilters, setActiveFilters] = React.useState<Set<EventKind>>(
    () => new Set(ALL_KINDS)
  );

  const toggleFilter = (kind: EventKind) => {
    setActiveFilters((prev: Set<EventKind>) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        // Don't allow deselecting all
        if (next.size > 1) next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  const filtered = events.filter((e) => activeFilters.has(e.kind));

  // Count per kind
  const counts: Record<EventKind, number> = {
    visit: 0,
    medication: 0,
    assessment: 0,
    milestone: 0,
    task: 0,
  };
  for (const e of events) {
    counts[e.kind]++;
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6 print:hidden">
        {ALL_KINDS.map((kind) => {
          if (counts[kind] === 0) return null;
          const active = activeFilters.has(kind);
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggleFilter(kind)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                active
                  ? "bg-surface-raised border-border-strong shadow-sm text-text"
                  : "bg-transparent border-border/50 text-text-subtle opacity-60 hover:opacity-100"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  FILTER_DOT[kind],
                  !active && "opacity-40"
                )}
              />
              {FILTER_LABELS[kind]}
              <span className="text-text-subtle">({counts[kind]})</span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <Timeline events={filtered} />
      ) : (
        <p className="text-sm text-text-muted text-center py-8">
          No events match your current filters.
        </p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { acknowledgeObservation } from "@/app/actions/observationActions";
import { cn } from "@/lib/utils/cn";

/**
 * Client-side renderer for the "fleet is noticing" observation strip in
 * the Schedule peek. Each row has a subtle "Ack" affordance that
 * optimistically hides the observation and fires the server action.
 *
 * If the server action fails we log and restore the row so the peek
 * never loses data silently — the ack is non-destructive server-side
 * either way.
 */

export interface PeekObservation {
  id: string;
  severity: string;
  category: string;
  summary: string;
  actionSuggested: string | null;
  createdAt: Date;
}

export function SchedulePeekObservations({
  observations,
}: {
  observations: PeekObservation[];
}) {
  // Local hidden-set drives optimistic UI. We never mutate the prop.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();

  const visible = observations.filter((o) => !hiddenIds.has(o.id));

  if (visible.length === 0) return null;

  const handleAck = (id: string) => {
    // Optimistic: hide immediately.
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    startTransition(async () => {
      try {
        const result = await acknowledgeObservation(id);
        if (!result.ok) {
          console.warn("[peek] acknowledge failed:", result.error);
          // Re-show on failure so the clinician isn't silently dropped.
          setHiddenIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      } catch (err) {
        console.error("[peek] acknowledge threw:", err);
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  return (
    <div className="mt-3 border-t border-border/60 pt-2.5">
      <p className="text-[11px] uppercase tracking-[0.1em] text-text-subtle font-semibold">
        The fleet is noticing
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {visible.map((o) => (
          <li
            key={o.id}
            className="group/obs flex items-baseline gap-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0 translate-y-[-2px]",
                o.severity === "urgent" && "bg-red-500",
                o.severity === "concern" && "bg-amber-500",
                o.severity === "notable" && "bg-accent",
                o.severity === "info" && "bg-border-strong/60",
              )}
            />
            <p className="text-xs text-text line-clamp-2 leading-snug flex-1">
              {o.summary}
            </p>
            <button
              type="button"
              onClick={(e) => {
                // The peek row is inside a <Link>; don't navigate when acking.
                e.preventDefault();
                e.stopPropagation();
                handleAck(o.id);
              }}
              disabled={isPending}
              aria-label="Acknowledge observation"
              className={cn(
                "shrink-0 text-[11px] text-text-subtle hover:text-accent",
                "opacity-0 group-hover/obs:opacity-100 focus:opacity-100",
                "transition-opacity disabled:cursor-not-allowed disabled:opacity-50",
                "px-1 py-0.5 rounded",
              )}
            >
              Ack
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

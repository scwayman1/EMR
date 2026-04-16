"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/utils/cn";
import {
  QUEUE_STATUS_CONFIG,
  calculateWaitTime,
  type QueueEntry,
  type QueueStatus,
} from "@/lib/domain/queue-board";

const COLUMN_ORDER: QueueStatus[] = [
  "scheduled",
  "arrived",
  "rooming",
  "in_visit",
  "checkout",
  "completed",
];

function modalityIcon(modality: QueueEntry["modality"]): string {
  switch (modality) {
    case "video":
      return "📹";
    case "phone":
      return "📞";
    case "in_person":
    default:
      return "🏥";
  }
}

function waitToneClass(minutes: number | null | undefined): string {
  if (minutes == null) return "text-text-subtle";
  if (minutes < 10) return "text-success";
  if (minutes <= 20) return "text-[color:var(--highlight-hover)]";
  return "text-danger font-medium";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QueueBoard({ entries }: { entries: QueueEntry[] }) {
  const router = useRouter();
  // Bumping this state forces React to re-render the wait-time calculations
  // every minute without doing a full server round-trip in between refreshes.
  const [, setTick] = useState(0);

  useEffect(() => {
    // 30-second auto-refresh from the server (per spec).
    const refresh = setInterval(() => router.refresh(), 30_000);
    // 60-second tick to keep wait-time chips moving between server refreshes.
    const tick = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [router]);

  // Bucket the entries by status so each column only iterates its own list.
  const byStatus = useMemo(() => {
    const map: Record<QueueStatus, QueueEntry[]> = {
      scheduled: [],
      arrived: [],
      rooming: [],
      in_visit: [],
      checkout: [],
      completed: [],
    };
    for (const e of entries) {
      // Recompute wait time at render time so the chip is always live.
      const live = calculateWaitTime(e.scheduledFor, e.status);
      map[e.status].push({ ...e, minutesWaiting: live ?? undefined });
    }
    return map;
  }, [entries]);

  const inRooms =
    byStatus.rooming.length + byStatus.in_visit.length;
  const waiting = byStatus.scheduled.length + byStatus.arrived.length;
  const done = byStatus.completed.length;

  return (
    <>
      <PageHeader
        eyebrow="Front desk"
        title="Today's Queue"
        description={`${inRooms} in rooms · ${waiting} waiting · ${done} completed today`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {COLUMN_ORDER.map((status) => (
          <QueueColumn
            key={status}
            status={status}
            entries={byStatus[status]}
          />
        ))}
      </div>

      <p className="mt-6 text-[11px] text-text-subtle text-center">
        Auto-refreshes every 30 seconds
      </p>
    </>
  );
}

function QueueColumn({
  status,
  entries,
}: {
  status: QueueStatus;
  entries: QueueEntry[];
}) {
  const config = QUEUE_STATUS_CONFIG[status];

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
          {config.label}
        </p>
        <Badge tone="neutral" className="tabular-nums">
          {entries.length}
        </Badge>
      </div>

      <div className="space-y-2 min-h-[80px] rounded-xl bg-surface-muted/40 p-2">
        {entries.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-text-subtle italic">
            empty
          </div>
        ) : (
          entries.map((entry) => (
            <QueueCard key={entry.encounterId} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

function QueueCard({ entry }: { entry: QueueEntry }) {
  const wait = entry.minutesWaiting;
  const waitClass = waitToneClass(wait);

  return (
    <Card tone="raised" className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm font-medium text-text truncate flex-1">
          {entry.patientName}
        </p>
        <span aria-hidden="true" className="text-base shrink-0" title={entry.modality}>
          {modalityIcon(entry.modality)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-text-muted tabular-nums">
        <span>{formatTime(entry.scheduledFor)}</span>
        {entry.provider && (
          <>
            <span aria-hidden="true">·</span>
            <span className="truncate">{entry.provider}</span>
          </>
        )}
      </div>

      {entry.reason && (
        <p className="text-[11px] text-text-subtle mt-1 line-clamp-1">
          {entry.reason}
        </p>
      )}

      {entry.status !== "completed" && wait != null && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <span className={cn("text-[11px] tabular-nums", waitClass)}>
            {wait === 0 ? "on time" : `${wait}m wait`}
          </span>
          {entry.room && (
            <span className="text-[10px] text-text-subtle">
              Room {entry.room}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

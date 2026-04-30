"use client";

import * as React from "react";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/ui/collapsible";

// EMR-158: Collapsible / Expandable Patient Outcomes Check-Ins
//
// The patient outcomes log is dense — a single chronic-pain patient may
// have 200+ entries over a year. Showing them as one flat table buries
// the signal: "is my mood trending up?" gets lost in the wall of rows.
// We group rows by metric, each with a one-line summary (count, avg,
// trend arrow) so the full list collapses into a glanceable index that
// expands per-metric on demand.

interface LogEntry {
  id: string;
  loggedAt: string;
  metric: string;
  value: number;
  note: string | null;
}

interface MetricGroup {
  metric: string;
  logs: LogEntry[];
  avg: number;
  trend: "up" | "down" | "flat";
  /** Difference between the latest entry and the prior — positive = increase. */
  delta: number;
}

function groupByMetric(logs: LogEntry[]): MetricGroup[] {
  const buckets = new Map<string, LogEntry[]>();
  for (const log of logs) {
    if (!buckets.has(log.metric)) buckets.set(log.metric, []);
    buckets.get(log.metric)!.push(log);
  }
  const groups: MetricGroup[] = [];
  for (const [metric, group] of buckets) {
    const sorted = [...group].sort(
      (a, b) =>
        new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime(),
    );
    const avg = sorted.reduce((s, l) => s + l.value, 0) / sorted.length;
    const latest = sorted[0]?.value ?? 0;
    const prior = sorted[1]?.value ?? latest;
    const delta = latest - prior;
    const trend: MetricGroup["trend"] =
      Math.abs(delta) < 0.3 ? "flat" : delta > 0 ? "up" : "down";
    groups.push({ metric, logs: sorted, avg, trend, delta });
  }
  // Most-logged metric first — gives the patient the densest signal up top.
  groups.sort((a, b) => b.logs.length - a.logs.length);
  return groups;
}

export function RecentCheckIns({ logs }: { logs: LogEntry[] }) {
  const groups = React.useMemo(() => groupByMetric(logs), [logs]);
  const [allOpen, setAllOpen] = React.useState(false);
  // Per-metric controlled state so toggling "expand all" overrides
  // individual user toggles, and individual toggles still work after.
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (allOpen) {
      const next: Record<string, boolean> = {};
      for (const g of groups) next[g.metric] = true;
      setOpenMap(next);
    }
  }, [allOpen, groups]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-text-muted italic px-1">
        No check-ins yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const next = !allOpen;
            setAllOpen(next);
            if (!next) setOpenMap({});
          }}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>
      {groups.map((g) => (
        <Collapsible
          key={g.metric}
          open={openMap[g.metric] ?? false}
          onOpenChange={(next) =>
            setOpenMap((prev) => ({ ...prev, [g.metric]: next }))
          }
          tone="muted"
          title={
            <span className="flex items-center gap-3">
              <span className="capitalize">{g.metric.replace(/_/g, " ")}</span>
              <span className="text-[11px] text-text-subtle font-normal">
                {g.logs.length} check-in{g.logs.length === 1 ? "" : "s"}
              </span>
            </span>
          }
          meta={
            <span className="flex items-center gap-3">
              <span className="text-text-muted">
                avg{" "}
                <span className="font-display text-text">{g.avg.toFixed(1)}</span>
                <span className="text-text-subtle">/10</span>
              </span>
              <TrendArrow trend={g.trend} delta={g.delta} />
            </span>
          }
        >
          <div className="overflow-x-auto -mx-4 mt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-4 py-2">
                    Date
                  </th>
                  <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-4 py-2">
                    Value
                  </th>
                  <th className="text-left text-[11px] font-medium text-text-subtle uppercase tracking-wider px-4 py-2">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {g.logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-surface/60 transition-colors"
                  >
                    <td className="px-4 py-2 text-text-muted whitespace-nowrap">
                      {formatDate(new Date(log.loggedAt))}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-display text-base text-accent">
                        {log.value.toFixed(1)}
                      </span>
                      <span className="text-text-subtle text-xs ml-1">/ 10</span>
                    </td>
                    <td className="px-4 py-2 text-text-muted max-w-xs truncate">
                      {log.note || "--"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}

function TrendArrow({
  trend,
  delta,
}: {
  trend: "up" | "down" | "flat";
  delta: number;
}) {
  if (trend === "flat") {
    return (
      <span className="inline-flex items-center gap-1 text-text-subtle">
        <span aria-hidden="true">→</span>
        <span className="text-[11px] tabular-nums">±0</span>
      </span>
    );
  }
  // The semantics of "up is good" vs "up is bad" depend on the metric
  // (pain up = bad; mood up = good). We show direction neutrally and let
  // the patient/clinician interpret in context.
  const symbol = trend === "up" ? "↑" : "↓";
  return (
    <span className="inline-flex items-center gap-1 text-text-muted">
      <span aria-hidden="true">{symbol}</span>
      <span className="text-[11px] tabular-nums">
        {delta > 0 ? "+" : ""}
        {delta.toFixed(1)}
      </span>
    </span>
  );
}

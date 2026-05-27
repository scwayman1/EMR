"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Collapsible } from "@/components/ui/collapsible";
import { Sparkline } from "@/components/ui/sparkline";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";

// EMR-158 — Collapsible / Expandable Patient Outcomes
//
// Sister component to /portal/outcomes/recent-check-ins.tsx. The portal
// version is patient-facing and groups by metric. This one is the
// clinician-side accordion: per-check-in rows that collapse to a glanceable
// summary line ("Mar 14 · pain 6 · sleep 4") and expand into the full
// per-metric breakdown for that day. Two reasons we don't reuse the portal
// component verbatim:
//
//   1. Clinicians read by *visit*, not by metric. They open the chart and
//      scan recent days; the per-metric aggregate is secondary signal.
//   2. We want one file the design team can iterate on without touching
//      patient-side state machines.

export type OutcomeMetricKey =
  | "pain"
  | "sleep"
  | "anxiety"
  | "mood"
  | "nausea"
  | "appetite"
  | "energy"
  | "adherence"
  | "side_effects";

export interface OutcomeEntry {
  id: string;
  loggedAt: string | Date;
  metric: OutcomeMetricKey | string;
  value: number;
  note?: string | null;
}

interface DayBucket {
  /** YYYY-MM-DD in patient local time — used as the React key. */
  dayKey: string;
  date: Date;
  entries: OutcomeEntry[];
}

const METRIC_LABEL: Record<string, string> = {
  pain: "Pain",
  sleep: "Sleep",
  anxiety: "Anxiety",
  mood: "Mood",
  nausea: "Nausea",
  appetite: "Appetite",
  energy: "Energy",
  adherence: "Adherence",
  side_effects: "Side effects",
};

function dayKeyOf(date: Date): string {
  // Local-time YYYY-MM-DD. We bucket by local day because patients log
  // "this morning" / "before bed" — UTC midnight rolls would split a
  // single day across two cards.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function bucketByDay(entries: OutcomeEntry[]): DayBucket[] {
  const map = new Map<string, DayBucket>();
  for (const raw of entries) {
    const date = raw.loggedAt instanceof Date ? raw.loggedAt : new Date(raw.loggedAt);
    const key = dayKeyOf(date);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { dayKey: key, date, entries: [] };
      map.set(key, bucket);
    }
    bucket.entries.push(raw);
    if (date.getTime() > bucket.date.getTime()) bucket.date = date;
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

function summaryLine(bucket: DayBucket): string {
  // One-line glance: pick the three metrics with the highest "informational
  // value" — distinct metrics, latest entry per metric, value in brackets.
  // Most patients only log 1-3 metrics per day so this collapses cleanly.
  const latestByMetric = new Map<string, OutcomeEntry>();
  for (const e of bucket.entries) {
    const prior = latestByMetric.get(e.metric);
    const t = e.loggedAt instanceof Date ? e.loggedAt.getTime() : new Date(e.loggedAt).getTime();
    if (!prior) {
      latestByMetric.set(e.metric, e);
    } else {
      const priorT = prior.loggedAt instanceof Date ? prior.loggedAt.getTime() : new Date(prior.loggedAt).getTime();
      if (t > priorT) latestByMetric.set(e.metric, e);
    }
  }
  const parts = [...latestByMetric.values()]
    .slice(0, 3)
    .map((e) => `${METRIC_LABEL[e.metric] ?? e.metric} ${e.value.toFixed(1)}`);
  if (latestByMetric.size > 3) parts.push(`+${latestByMetric.size - 3} more`);
  return parts.join(" · ");
}

function buildSparkline(entries: OutcomeEntry[], metric: string): number[] {
  return entries
    .filter((e) => e.metric === metric)
    .sort((a, b) => {
      const at = a.loggedAt instanceof Date ? a.loggedAt.getTime() : new Date(a.loggedAt).getTime();
      const bt = b.loggedAt instanceof Date ? b.loggedAt.getTime() : new Date(b.loggedAt).getTime();
      return at - bt;
    })
    .map((e) => e.value);
}

export interface OutcomesAccordionProps {
  entries: OutcomeEntry[];
  /** When true, the most recent day is open on first render. */
  defaultOpenLatest?: boolean;
  className?: string;
}

export function OutcomesAccordion({
  entries,
  defaultOpenLatest = true,
  className,
}: OutcomesAccordionProps) {
  const buckets = React.useMemo(() => bucketByDay(entries), [entries]);
  const [openMap, setOpenMap] = React.useState<Record<string, boolean>>(() => {
    if (!defaultOpenLatest || buckets.length === 0) return {};
    return { [buckets[0].dayKey]: true };
  });
  const [allOpen, setAllOpen] = React.useState(false);

  React.useEffect(() => {
    if (allOpen) {
      const next: Record<string, boolean> = {};
      for (const b of buckets) next[b.dayKey] = true;
      setOpenMap(next);
    }
  }, [allOpen, buckets]);

  if (buckets.length === 0) {
    return (
      <p className="text-sm text-text-muted italic px-1">
        No check-ins yet — encourage the patient to log from the portal.
      </p>
    );
  }

  // Cross-day sparkline per metric — gives the clinician a fast trend read
  // before they expand any individual day.
  const allMetrics = [...new Set(entries.map((e) => e.metric))];
  const trendlines = allMetrics
    .map((metric) => ({ metric, values: buildSparkline(entries, metric) }))
    .filter((t) => t.values.length >= 2);

  return (
    <div className={cn("space-y-3", className)}>
      {trendlines.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-3">
            Trends across all check-ins
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
            {trendlines.map(({ metric, values }) => (
              <div key={metric} className="flex items-center gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-text capitalize">
                    {METRIC_LABEL[metric] ?? metric}
                  </p>
                  <p className="text-[10px] text-text-subtle tabular-nums">
                    {values[values.length - 1].toFixed(1)} latest
                  </p>
                </div>
                <Sparkline data={values} width={120} height={28} showDots={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-text-subtle font-medium">
          Per-day check-ins · {buckets.length}
        </p>
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

      {buckets.map((bucket) => (
        <Collapsible
          key={bucket.dayKey}
          tone="muted"
          open={openMap[bucket.dayKey] ?? false}
          onOpenChange={(next) =>
            setOpenMap((prev) => ({ ...prev, [bucket.dayKey]: next }))
          }
          title={
            <span className="flex items-center gap-3">
              <span className="font-display text-text">{formatDate(bucket.date)}</span>
              <span className="text-[11px] text-text-subtle font-normal truncate">
                {summaryLine(bucket)}
              </span>
            </span>
          }
          meta={
            <span className="text-text-subtle">
              {bucket.entries.length} entr{bucket.entries.length === 1 ? "y" : "ies"}
            </span>
          }
        >
          <ul className="divide-y divide-border/40">
            {bucket.entries
              .slice()
              .sort((a, b) => {
                const at = a.loggedAt instanceof Date ? a.loggedAt.getTime() : new Date(a.loggedAt).getTime();
                const bt = b.loggedAt instanceof Date ? b.loggedAt.getTime() : new Date(b.loggedAt).getTime();
                return bt - at;
              })
              .map((e) => (
                <li key={e.id} className="py-2.5 flex items-baseline gap-4">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-subtle w-24 shrink-0">
                    {METRIC_LABEL[e.metric] ?? e.metric}
                  </span>
                  <span className="font-display text-base text-accent tabular-nums shrink-0">
                    {e.value.toFixed(1)}
                    <span className="text-text-subtle text-xs ml-0.5">/10</span>
                  </span>
                  {e.note && (
                    <span className="text-sm text-text-muted leading-snug min-w-0 flex-1">
                      {e.note}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </Collapsible>
      ))}
    </div>
  );
}

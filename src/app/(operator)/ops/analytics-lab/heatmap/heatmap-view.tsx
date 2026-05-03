"use client";

import { useState, useMemo } from "react";
import type { HeatmapCell } from "@/lib/domain/overnight-batch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type Metric = "pain" | "sleep" | "anxiety" | "mood" | "nausea";

const METRICS: { key: Metric; label: string; emoji: string }[] = [
  { key: "pain", label: "Pain", emoji: "🩹" },
  { key: "sleep", label: "Sleep", emoji: "😴" },
  { key: "anxiety", label: "Anxiety", emoji: "😰" },
  { key: "mood", label: "Mood", emoji: "😊" },
  { key: "nausea", label: "Nausea", emoji: "🤢" },
];

// Symptom-style metrics — lower scores mean fewer symptoms / improvement.
// Sleep and mood are the inverse: higher scores are better. The Set is
// shared between cellTone (per-cell coloring) and the summary counters
// below so the displayed totals always match the cell tones — Codex
// flagged that they had drifted apart for nausea.
const LOWER_IS_BETTER = new Set<Metric>(["pain", "anxiety", "nausea"]);

function cellTone(metric: Metric, value: number, hasData: boolean): string {
  if (!hasData) return "bg-surface-muted border-border/50";
  const lowerIsBetter = LOWER_IS_BETTER.has(metric);
  const improving = lowerIsBetter ? value <= 3 : value >= 7;
  const worsening = lowerIsBetter ? value >= 7 : value <= 3;
  if (improving) {
    if (value <= 2 || value >= 8) return "bg-emerald-500 border-emerald-600";
    return "bg-emerald-300 border-emerald-400";
  }
  if (worsening) {
    if (value <= 2 || value >= 8) return "bg-red-500 border-red-600";
    return "bg-red-300 border-red-400";
  }
  return "bg-amber-300 border-amber-400";
}

export function HeatmapView({
  data,
}: {
  data: Record<Metric, HeatmapCell[]>;
}) {
  const [metric, setMetric] = useState<Metric>("pain");
  const [hover, setHover] = useState<HeatmapCell | null>(null);

  const cells = data[metric];

  const { improving, steady, worsening, withData } = useMemo(() => {
    let improving = 0;
    let steady = 0;
    let worsening = 0;
    let withData = 0;
    for (const c of cells) {
      if (!c.hasData) continue;
      withData++;
      const lowerIsBetter = LOWER_IS_BETTER.has(metric);
      const isImproving = lowerIsBetter ? c.value <= 3 : c.value >= 7;
      const isWorsening = lowerIsBetter ? c.value >= 7 : c.value <= 3;
      if (isImproving) improving++;
      else if (isWorsening) worsening++;
      else steady++;
    }
    return { improving, steady, worsening, withData };
  }, [cells, metric]);

  // Arrange cells in rows of 15
  const rows: HeatmapCell[][] = [];
  const PER_ROW = 15;
  for (let i = 0; i < cells.length; i += PER_ROW) {
    rows.push(cells.slice(i, i + PER_ROW));
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-medium border transition-all",
              metric === m.key
                ? "bg-accent text-accent-ink border-accent shadow-sm"
                : "bg-surface-raised text-text-muted border-border hover:border-accent/40"
            )}
          >
            <span className="mr-1.5">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
              Days with data
            </p>
            <p className="font-display text-3xl text-text mt-1">{withData}</p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
              Improving
            </p>
            <p className="font-display text-3xl text-emerald-600 mt-1">
              {improving}
            </p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
              Steady
            </p>
            <p className="font-display text-3xl text-amber-600 mt-1">{steady}</p>
          </CardContent>
        </Card>
        <Card tone="raised">
          <CardContent className="pt-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle font-medium">
              Worsening
            </p>
            <p className="font-display text-3xl text-red-600 mt-1">
              {worsening}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card tone="raised" className="mb-6">
        <CardHeader>
          <CardTitle>90-day outcome grid</CardTitle>
          <CardDescription>
            Each square is one day of cohort-wide {metric} score. Hover for
            details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-1.5">
                {row.map((cell) => (
                  <button
                    key={cell.date}
                    onMouseEnter={() => setHover(cell)}
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      "w-8 h-8 rounded border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent/40",
                      cellTone(metric, cell.value, cell.hasData)
                    )}
                    aria-label={`${cell.date}: ${cell.value}/10`}
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" /> Improving
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-300" /> Steady
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-500" /> Worsening
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-surface-muted border border-border" />{" "}
              No data
            </div>
          </div>

          {hover && (
            <div className="mt-6 p-4 rounded-lg bg-surface-muted border border-border">
              <p className="text-xs uppercase tracking-[0.14em] text-text-subtle font-medium">
                {hover.date}
              </p>
              <div className="mt-2 flex items-center gap-4">
                <span className="font-display text-2xl text-text">
                  {hover.hasData ? `${hover.value}/10` : "No data"}
                </span>
                {hover.hasData && (
                  <Badge tone="accent">
                    ~{Math.max(3, Math.round(hover.value * 4))} patients
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

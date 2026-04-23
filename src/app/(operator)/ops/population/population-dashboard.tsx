"use client";

import { useState } from "react";
import {
  generatePopulationMetrics,
  generateCohortBreakdown,
  generateConditionPrevalence,
  OUTCOME_METRICS,
  type MetricTimeframe,
} from "@/lib/domain/population-health";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const TIMEFRAMES: { label: string; value: MetricTimeframe }[] = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "1y", value: "1y" },
];

export function PopulationDashboard({ totalPatients }: { totalPatients: number }) {
  const [timeframe, setTimeframe] = useState<MetricTimeframe>("30d");

  const metrics = generatePopulationMetrics(totalPatients);
  const cohorts = generateCohortBreakdown(totalPatients);
  const conditions = generateConditionPrevalence(totalPatients);
  const maxConditionPct = Math.max(...conditions.map((c) => c.percentage));

  return (
    <div className="space-y-8">
      {/* ── Timeframe selector ── */}
      <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-lg w-fit">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setTimeframe(tf.value)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
              timeframe === tf.value
                ? "bg-accent text-accent-ink shadow-sm"
                : "text-text-muted hover:text-text hover:bg-surface"
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* ── Metric cards grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="relative overflow-hidden">
            <CardContent className="pt-5 pb-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                {m.label}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-2xl text-text tabular-nums">
                  {typeof m.value === "number" && m.value % 1 !== 0
                    ? m.value.toFixed(1)
                    : m.value}
                </span>
                {m.unit && (
                  <span className="text-xs text-text-subtle">{m.unit}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    m.trendIsGood ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {m.trend === "up" && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 2.5L10 7H2L6 2.5Z" fill="currentColor" />
                    </svg>
                  )}
                  {m.trend === "down" && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M6 9.5L2 5H10L6 9.5Z" fill="currentColor" />
                    </svg>
                  )}
                  {m.trend === "flat" && <span>--</span>}
                </span>
                {m.previousValue !== undefined && (
                  <span className="text-[11px] text-text-subtle tabular-nums">
                    prev:{" "}
                    {typeof m.previousValue === "number" && m.previousValue % 1 !== 0
                      ? m.previousValue.toFixed(1)
                      : m.previousValue}
                    {m.unit}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Cohort breakdown ── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Cohort Breakdown</CardTitle>
          <CardDescription>
            Patient segments by engagement status ({timeframe} window)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stacked bar */}
          <div className="h-10 rounded-lg overflow-hidden flex mb-4">
            {cohorts.map((c) => (
              <div
                key={c.segment}
                className={cn("transition-all duration-500", c.color)}
                style={{ width: `${c.percentage}%` }}
                title={`${c.label}: ${c.count} (${c.percentage}%)`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {cohorts.map((c) => (
              <div key={c.segment} className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-sm", c.color)} />
                <span className="text-sm text-text-muted">
                  {c.label}{" "}
                  <span className="font-medium text-text tabular-nums">
                    {c.count}
                  </span>{" "}
                  <span className="text-text-subtle">({c.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Condition prevalence ── */}
      <Card tone="raised">
        <CardHeader>
          <CardTitle>Condition Prevalence</CardTitle>
          <CardDescription>
            Most common qualifying conditions across the population
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conditions.map((c) => (
              <div key={c.icd10} className="flex items-center gap-4">
                <div className="w-40 shrink-0">
                  <p className="text-sm font-medium text-text truncate">
                    {c.condition}
                  </p>
                  <p className="text-[11px] text-text-subtle font-mono">
                    {c.icd10}
                  </p>
                </div>
                <div className="flex-1 h-6 bg-surface-muted rounded-md overflow-hidden">
                  <div
                    className="h-full bg-emerald-500/80 rounded-md transition-all duration-500"
                    style={{ width: `${(c.percentage / maxConditionPct) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-text tabular-nums w-16 text-right">
                  {c.percentage}%
                </span>
                <Badge tone="neutral" className="shrink-0">
                  {c.count} pts
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Outcome trends (coming soon) ── */}
      <Card tone="outlined">
        <CardHeader>
          <CardTitle>Outcome Trends</CardTitle>
          <CardDescription>
            Population-level trends for {OUTCOME_METRICS.join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-surface-muted flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-text-subtle"
                aria-hidden="true"
              >
                <path
                  d="M3 17L9 11L13 15L21 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 7H21V11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-muted">
              Outcome trend charts coming soon
            </p>
            <p className="text-xs text-text-subtle mt-1 max-w-sm">
              Longitudinal outcome visualizations with cohort comparisons
              and statistical significance indicators are under development.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eyebrow, EditorialRule, LeafSprig } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";
import type { CohortBenchmark } from "@/lib/domain/clinical-intelligence";

// ---------------------------------------------------------------------------
// Cohort view — client component
// ---------------------------------------------------------------------------
// Renders the "Patients like you" hero plus a tile per metric showing where
// the patient ranks vs the cohort. The bar visualization is plain CSS so
// there are no external chart deps — keeps the interaction crisp.
// ---------------------------------------------------------------------------

const METRIC_DISPLAY: Record<
  string,
  { label: string; emoji: string; lowerIsBetter: boolean; topQuartileEncouragement: string; midEncouragement: string; lowEncouragement: string }
> = {
  pain: {
    label: "Pain",
    emoji: "🌿",
    lowerIsBetter: true,
    topQuartileEncouragement: "You're managing pain better than 75% of similar patients.",
    midEncouragement: "Your pain levels are right in line with similar patients.",
    lowEncouragement: "Your pain is running higher than the cohort — your team can help.",
  },
  sleep: {
    label: "Sleep quality",
    emoji: "🌙",
    lowerIsBetter: false,
    topQuartileEncouragement: "You're in the top 25% for sleep quality!",
    midEncouragement: "Your sleep is on par with similar patients.",
    lowEncouragement: "Sleep is an area worth talking about with your care team.",
  },
  anxiety: {
    label: "Anxiety",
    emoji: "🌤️",
    lowerIsBetter: true,
    topQuartileEncouragement: "You're managing anxiety better than 75% of similar patients.",
    midEncouragement: "Your anxiety levels match the typical patient pattern.",
    lowEncouragement: "Your anxiety is running higher than most — extra support is available.",
  },
  mood: {
    label: "Mood",
    emoji: "😊",
    lowerIsBetter: false,
    topQuartileEncouragement: "Your mood is in the top quarter — keep doing what you're doing.",
    midEncouragement: "Your mood is right in line with similar patients.",
    lowEncouragement: "Mood scores are lower than typical — a gentle nudge to check in with your team.",
  },
};

// Display percentile so "higher is better" — for metrics where a low raw
// score is good (pain, anxiety) we invert the percentile we got from the
// helper so the bar always reads "further right = doing better".
function displayPercentile(b: CohortBenchmark): number {
  const display = METRIC_DISPLAY[b.metric];
  if (display?.lowerIsBetter) return Math.max(0, Math.min(100, 100 - b.percentile));
  return b.percentile;
}

function encouragementFor(b: CohortBenchmark): string {
  const display = METRIC_DISPLAY[b.metric];
  if (!display) return "";
  const dp = displayPercentile(b);
  if (dp >= 75) return display.topQuartileEncouragement;
  if (dp >= 40) return display.midEncouragement;
  return display.lowEncouragement;
}

function rankBadgeTone(dp: number): "success" | "highlight" | "neutral" {
  if (dp >= 75) return "success";
  if (dp >= 40) return "highlight";
  return "neutral";
}

function rankBadgeLabel(dp: number): string {
  if (dp >= 75) return "Top quartile";
  if (dp >= 40) return "On par";
  return "Below average";
}

function PercentileBar({ percentile }: { percentile: number }) {
  const clamped = Math.max(2, Math.min(98, percentile));
  return (
    <div className="relative w-full h-3 rounded-full bg-surface-muted/70 border border-border/60 overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-soft to-accent/70"
        style={{ width: `${clamped}%` }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-accent shadow-md ring-2 ring-surface"
        style={{ left: `${clamped}%` }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
          Lower
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-subtle">
          Higher
        </span>
      </div>
    </div>
  );
}

function MetricCard({ b }: { b: CohortBenchmark }) {
  const display = METRIC_DISPLAY[b.metric] ?? {
    label: b.metric,
    emoji: "✨",
    lowerIsBetter: false,
    topQuartileEncouragement: "",
    midEncouragement: "",
    lowEncouragement: "",
  };
  const dp = displayPercentile(b);

  return (
    <Card tone="raised" className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {display.emoji}
            </span>
            <h3 className="font-display text-lg text-text tracking-tight capitalize">
              {display.label}
            </h3>
          </div>
          <Badge tone={rankBadgeTone(dp)}>{rankBadgeLabel(dp)}</Badge>
        </div>

        <div className="flex items-baseline gap-3 mb-5">
          <p
            className={cn(
              "font-display text-5xl tabular-nums",
              "text-accent",
            )}
          >
            {b.yourValue.toFixed(1)}
          </p>
          <p className="text-xs text-text-subtle">your average / 10</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
              Cohort mean
            </p>
            <p className="text-text mt-0.5 tabular-nums">
              {b.cohortMean.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
              Cohort median
            </p>
            <p className="text-text mt-0.5 tabular-nums">
              {b.cohortMedian.toFixed(1)}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <PercentileBar percentile={dp} />
        </div>
        <p className="text-xs text-text-subtle text-center mb-4">
          You rank in the {dp}th percentile
        </p>

        <p className="text-sm text-text-muted leading-relaxed">
          {encouragementFor(b)}
        </p>
      </CardContent>
    </Card>
  );
}

export function CohortView({
  benchmarks,
  firstName,
  condition,
}: {
  benchmarks: CohortBenchmark[];
  firstName: string;
  condition: string;
}) {
  const cohortSize = benchmarks[0]?.cohortSize ?? 0;

  return (
    <>
      <PatientSectionNav section="health" />

      {/* Hero */}
      <Card tone="ambient" className="mb-8">
        <CardContent className="py-10 px-8 text-center">
          <LeafSprig size={28} className="text-accent mx-auto mb-4" />
          <Eyebrow className="mb-3 justify-center">Patients like you</Eyebrow>
          <h1 className="font-display text-3xl md:text-4xl text-text tracking-tight leading-tight">
            How you&apos;re doing vs patients like you
          </h1>
          <p className="text-sm text-text-muted mt-3 max-w-xl mx-auto leading-relaxed">
            {firstName}, here&apos;s how your wellbeing scores stack up against
            other people walking a similar path. It&apos;s a snapshot, not a
            scorecard — every journey is its own.
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="mb-8 rounded-lg border border-border/70 bg-surface-muted/50 px-4 py-3 text-xs text-text-muted leading-relaxed">
        <span className="font-medium text-text">Compared to {cohortSize} other patients</span>{" "}
        with similar conditions ({condition}). All data is de-identified per HIPAA Safe
        Harbor and used only for benchmarking — never for clinical decisions
        about other patients.
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {benchmarks.map((b) => (
          <MetricCard key={b.metric} b={b} />
        ))}
      </div>

      <EditorialRule className="my-10" />

      <p className="text-center text-xs text-text-subtle italic max-w-md mx-auto leading-relaxed">
        Cohort comparisons are updated as more patients log outcomes. The more
        you log, the better the picture gets — for you and for everyone else.
      </p>
    </>
  );
}

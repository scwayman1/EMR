"use client";

import { useEffect, useState } from "react";

type ChartingTimerProps = {
  /**
   * Optional ISO timestamp the encounter started at. When provided, the
   * timer resumes from server time so navigating between chart tabs no
   * longer "resets" the clock — the clinician sees true wall time spent
   * documenting this visit.
   */
  startedAtIso?: string | null;
  /**
   * Optional benchmark in seconds — typically the org's median charting
   * duration over the trailing window — so the clinician sees relative
   * performance, not just an absolute number. Compared as a "vs Epic
   * 15-min average" badge when omitted.
   */
  benchmarkSeconds?: number | null;
};

/**
 * Charting Timer — EMR-132
 *
 * Visible timer showing how long the provider has been documenting this
 * encounter. When the encounter has a server-recorded startedAt, the
 * timer resumes from that wall time across page navigations (was
 * previously a per-mount timer that always reset). Renders a benchmark
 * comparison so it doubles as a marketing artifact.
 */
export function ChartingTimer({ startedAtIso, benchmarkSeconds }: ChartingTimerProps = {}) {
  const startMs = startedAtIso ? Date.parse(startedAtIso) : Date.now();
  const initial = Math.max(0, Math.round((Date.now() - startMs) / 1000));
  const [seconds, setSeconds] = useState(initial);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(Math.max(0, Math.round((Date.now() - startMs) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startMs]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${String(secs).padStart(2, "0")}`;

  // Industry average from KLAS / AMA panel: ~15 min per ambulatory note.
  // Keep the comparison live until the org has its own benchmark.
  const benchSec = benchmarkSeconds ?? 15 * 60;
  const ratio = benchSec > 0 ? seconds / benchSec : 0;
  const tone =
    ratio < 0.4 ? "success" : ratio < 0.8 ? "highlight" : ratio < 1.2 ? "warning" : "danger";
  const toneClass =
    tone === "success"
      ? "bg-success"
      : tone === "highlight"
        ? "bg-highlight"
        : tone === "warning"
          ? "bg-warning"
          : "bg-danger";
  const benchLabel =
    benchmarkSeconds == null
      ? `vs 15:00 industry avg`
      : `vs ${formatMinSec(benchSec)} clinic median`;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted/60 border border-border/60"
      title={`${display} in chart — ${benchLabel}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${toneClass}`} />
      <span className="text-[11px] font-mono tabular-nums text-text-subtle tracking-wide">
        {display}
      </span>
      <span className="text-[9px] text-text-subtle uppercase tracking-wider">
        in chart · {benchLabel}
      </span>
    </div>
  );
}

function formatMinSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

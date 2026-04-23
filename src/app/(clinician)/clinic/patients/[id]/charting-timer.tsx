"use client";

import { useEffect, useState } from "react";

/**
 * Charting Timer — EMR-132
 *
 * Visible timer showing how long the provider has been in this patient's
 * chart. Starts when the chart opens, ticks every second. The timer is
 * a marketing differentiator: "average visit completed in 4 minutes on
 * Leafjourney vs. 15+ on Epic."
 *
 * Renders as a compact, non-intrusive monospace readout in the chart
 * header. The physician sees it peripherally — not distracting, but
 * always visible. Resets on page navigation (intentional — each chart
 * visit is a fresh session).
 */
export function ChartingTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-muted/60 border border-border/60">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          mins < 5 ? "bg-success" : mins < 10 ? "bg-highlight" : "bg-danger"
        }`}
      />
      <span className="text-[11px] font-mono tabular-nums text-text-subtle tracking-wide">
        {display}
      </span>
      <span className="text-[9px] text-text-subtle uppercase tracking-wider">
        in chart
      </span>
    </div>
  );
}

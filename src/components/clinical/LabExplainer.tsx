"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  explainLabValue,
  type LabStatus,
} from "@/lib/domain/lab-explainer";

// ---------------------------------------------------------------------------
// EMR-155 — Hover-Over Lab/Result Explanations
// ---------------------------------------------------------------------------
// Tooltip/popover that explains a lab value in patient-friendly language
// when the user hovers (or focuses) it. Adds trend arrows from a small
// history series, normal-range bar, and clinical-significance note.
//
// Usage:
//   <LabExplainer name="A1C" value={6.2} history={[5.8, 6.0, 6.2]}>
//     6.2%
//   </LabExplainer>
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<LabStatus, string> = {
  low: "bg-blue-50 border-blue-200 text-blue-800",
  normal: "bg-emerald-50 border-emerald-200 text-emerald-800",
  high: "bg-amber-50 border-amber-200 text-amber-800",
  unknown: "bg-gray-50 border-gray-200 text-gray-800",
};

const STATUS_LABEL: Record<LabStatus, string> = {
  low: "Below range",
  normal: "Normal",
  high: "Above range",
  unknown: "No value",
};

type TrendDirection = "up" | "down" | "flat" | "none";

interface LabExplainerProps {
  /** Lab name or abbreviation (matches `findLab` in domain/lab-explainer). */
  name: string;
  /** Current numeric value, if known. */
  value?: number;
  /** Most-recent-last history series for trend arrows. */
  history?: number[];
  /** Optional clinical-significance line for the clinician. */
  clinicalNote?: string;
  /** Audience — flips the explanation between plain-language and clinician-facing. */
  audience?: "patient" | "clinician";
  className?: string;
  children: React.ReactNode;
}

export function LabExplainer({
  name,
  value,
  history,
  clinicalNote,
  audience = "patient",
  className,
  children,
}: LabExplainerProps) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Hooks must run unconditionally — call useId before the early
  // return below, then assemble the id once we have an explanation.
  const generatedId = React.useId().replace(/:/g, "");
  const result = explainLabValue(name, value);

  const onEnter = React.useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);
  const onLeave = React.useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, []);

  if (!result) return <>{children}</>;
  const { explanation, status, message } = result;
  const trend = computeTrend(history);

  const tooltipId = `lab-${explanation.abbreviation}-${generatedId}`;

  return (
    <span
      className={cn("relative inline-block cursor-help", className)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      tabIndex={0}
      role="button"
      aria-describedby={tooltipId}
    >
      <span className="border-b border-dashed border-accent/40 hover:border-accent transition-colors inline-flex items-center gap-1">
        {children}
        {trend.direction !== "none" && <TrendArrow direction={trend.direction} status={status} />}
      </span>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 rounded-xl border border-border bg-surface-raised shadow-xl p-4"
          style={{ animation: "labExplainerFade 160ms ease-out" }}
        >
          {/* Header */}
          <span className="flex items-center gap-2 mb-2">
            <span className="text-xl" aria-hidden>
              {explanation.emoji}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-display text-sm font-medium text-text">
                {explanation.name}
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-text-subtle">
                {explanation.abbreviation} · {explanation.unit}
              </span>
            </span>
            {trend.direction !== "none" && (
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <TrendArrow direction={trend.direction} status={status} />
                {trend.delta !== null && (
                  <span className="tabular-nums">
                    {trend.delta > 0 ? "+" : ""}
                    {trend.delta.toFixed(1)}
                  </span>
                )}
              </span>
            )}
          </span>

          {/* Plain-language explanation */}
          <span className="block text-xs text-text-muted leading-relaxed mb-3">
            {audience === "clinician"
              ? `${explanation.simpleExplanation} Reference range ${explanation.normalRange.low}–${explanation.normalRange.high} ${explanation.unit}.`
              : explanation.simpleExplanation}
          </span>

          {/* Status badge with current message */}
          {value !== undefined && (
            <span className={`block text-xs rounded-md border px-3 py-2 ${STATUS_TONE[status]}`}>
              <span className="font-medium">{STATUS_LABEL[status]}</span>
              {" — "}
              {message}
            </span>
          )}

          {/* Range visualization */}
          {value !== undefined && (
            <RangeBar
              value={value}
              low={explanation.normalRange.low}
              high={explanation.normalRange.high}
              status={status}
            />
          )}

          {/* History sparkline */}
          {history && history.length > 1 && (
            <span className="block mt-3">
              <Sparkline values={history} />
              <span className="block text-[10px] text-text-subtle mt-1">
                Last {history.length} results
              </span>
            </span>
          )}

          {/* Clinical significance for clinicians */}
          {audience === "clinician" && clinicalNote && (
            <span className="block mt-3 text-[11px] text-text-muted italic border-t border-border pt-2">
              {clinicalNote}
            </span>
          )}

          {/* Tail */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <svg width="12" height="6" viewBox="0 0 12 6" fill="none">
              <path d="M6 6L0 0H12L6 6Z" fill="var(--surface-raised, white)" />
            </svg>
          </span>
        </span>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes labExplainerFade { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }",
        }}
      />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Trend arrows                                                               */
/* -------------------------------------------------------------------------- */

function computeTrend(history?: number[]): { direction: TrendDirection; delta: number | null } {
  if (!history || history.length < 2) return { direction: "none", delta: null };
  const last = history[history.length - 1]!;
  const prev = history[history.length - 2]!;
  const delta = last - prev;
  const epsilon = Math.abs(prev) * 0.02; // 2% noise floor
  if (Math.abs(delta) <= epsilon) return { direction: "flat", delta };
  return { direction: delta > 0 ? "up" : "down", delta };
}

function TrendArrow({
  direction,
  status,
}: {
  direction: TrendDirection;
  status: LabStatus;
}) {
  if (direction === "none") return null;
  // Color the arrow by whether the trend is moving toward normal.
  const color =
    direction === "flat"
      ? "text-text-subtle"
      : status === "normal"
        ? "text-emerald-600"
        : (status === "high" && direction === "down") ||
            (status === "low" && direction === "up")
          ? "text-emerald-600"
          : "text-amber-600";
  const path =
    direction === "up"
      ? "M4 12l4-4 4 4M8 8v8"
      : direction === "down"
        ? "M4 4l4 4 4-4M8 4v8"
        : "M4 8h8";
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={color}
    >
      <path d={path} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Range bar                                                                  */
/* -------------------------------------------------------------------------- */

function RangeBar({
  value,
  low,
  high,
  status,
}: {
  value: number;
  low: number;
  high: number;
  status: LabStatus;
}) {
  // Render the patient's value relative to the normal range. The track
  // extends 25% below low / above high for visual context.
  const pad = (high - low) * 0.5 || 1;
  const min = Math.min(low - pad, value);
  const max = Math.max(high + pad, value);
  const span = max - min || 1;

  const lowPct = ((low - min) / span) * 100;
  const highPct = ((high - min) / span) * 100;
  const valuePct = ((value - min) / span) * 100;

  const dotColor =
    status === "normal"
      ? "bg-emerald-500"
      : status === "high"
        ? "bg-amber-500"
        : status === "low"
          ? "bg-blue-500"
          : "bg-gray-400";

  return (
    <span className="block mt-3">
      <span className="relative block h-2 rounded-full bg-surface-muted overflow-hidden">
        <span
          className="absolute top-0 h-full bg-emerald-200/70"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
          aria-hidden
        />
        <span
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full ring-2 ring-surface-raised ${dotColor}`}
          style={{ left: `${Math.max(2, Math.min(98, valuePct))}%` }}
          aria-hidden
        />
      </span>
      <span className="flex justify-between text-[10px] text-text-subtle mt-1 tabular-nums">
        <span>{low.toFixed(1)}</span>
        <span>{high.toFixed(1)}</span>
      </span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiny inline sparkline                                                      */
/* -------------------------------------------------------------------------- */

function Sparkline({ values }: { values: number[] }) {
  const w = 240;
  const h = 32;
  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const dx = (w - pad * 2) / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = pad + i * dx;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      />
      {values.map((v, i) => {
        const x = pad + i * dx;
        const y = pad + (1 - (v - min) / span) * (h - pad * 2);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === values.length - 1 ? 2.5 : 1.5}
            className={i === values.length - 1 ? "fill-accent" : "fill-accent/60"}
          />
        );
      })}
    </svg>
  );
}

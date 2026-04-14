"use client";

import { useState, useRef, useCallback } from "react";
import { explainLabValue, type LabStatus } from "@/lib/domain/lab-explainer";

// ---------------------------------------------------------------------------
// LabTooltip — EMR-32 / EMR-155
// ---------------------------------------------------------------------------
// Hover over any lab value → popup explains what it means at 3rd-grade level.
//
// Usage:
//   <LabTooltip name="A1C" value={6.2}>6.2%</LabTooltip>
//   <LabTooltip name="LDL" value={142}>142 mg/dL</LabTooltip>
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<LabStatus, string> = {
  low: "bg-blue-50 border-blue-200 text-blue-800",
  normal: "bg-green-50 border-green-200 text-green-800",
  high: "bg-amber-50 border-amber-200 text-amber-800",
  unknown: "bg-gray-50 border-gray-200 text-gray-800",
};

const STATUS_LABELS: Record<LabStatus, string> = {
  low: "Below range",
  normal: "Normal",
  high: "Above range",
  unknown: "No value",
};

interface LabTooltipProps {
  name: string;
  value?: number;
  children: React.ReactNode;
  className?: string;
}

export function LabTooltip({ name, value, children, className }: LabTooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const result = explainLabValue(name, value);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  }, []);

  if (!result) return <>{children}</>;

  const { explanation, status, message } = result;

  return (
    <span
      className={`relative inline-block cursor-help ${className ?? ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      tabIndex={0}
      role="button"
      aria-describedby={`lab-tip-${explanation.abbreviation}`}
    >
      <span className="border-b border-dashed border-accent/40 hover:border-accent transition-colors">
        {children}
      </span>

      {open && (
        <span
          id={`lab-tip-${explanation.abbreviation}`}
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-xl border border-border bg-surface-raised shadow-lg p-4 animate-in fade-in duration-150"
          style={{ animation: "fadeIn 150ms ease-out" }}
        >
          {/* Header */}
          <span className="flex items-center gap-2 mb-2">
            <span className="text-lg">{explanation.emoji}</span>
            <span className="font-display text-sm font-medium text-text">
              {explanation.name}
            </span>
          </span>

          {/* What it measures */}
          <span className="block text-xs text-text-muted leading-relaxed mb-3">
            {explanation.simpleExplanation}
          </span>

          {/* Status badge + message */}
          {value !== undefined && (
            <span className={`block text-xs rounded-lg border px-3 py-2 ${STATUS_COLORS[status]}`}>
              <span className="font-medium">{STATUS_LABELS[status]}</span>
              {" \u2014 "}
              {message}
            </span>
          )}

          {/* Normal range */}
          <span className="block text-[10px] text-text-subtle mt-2">
            Normal range: {explanation.normalRange.low}–{explanation.normalRange.high} {explanation.unit}
          </span>

          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <svg width="12" height="6" viewBox="0 0 12 6" fill="none">
              <path d="M6 6L0 0H12L6 6Z" fill="var(--surface-raised, white)" />
            </svg>
          </span>
        </span>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }` }} />
    </span>
  );
}

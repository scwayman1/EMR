"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ClaudeProcessingProps = {
  /** Optional one-line label, e.g. "Drafting note from transcript". */
  label?: string;
  /** Compact (inline) variant — no border, no padding box. */
  inline?: boolean;
  className?: string;
};

/**
 * Stable Claude processing indicator (EMR-157). Uses a CSS-animated SVG
 * inside a fixed-size container so it cannot induce layout shift or
 * scroll-anchor jumps when it mounts/unmounts mid-stream. Consumers
 * should give it a fixed slot in the layout (height already reserved)
 * to avoid the scroll glitch the prior GIF implementation caused —
 * spinning the GIF inside a flow-sized container made the page jump
 * when the GIF loaded later than its surrounding text.
 */
export function ClaudeProcessing({ label, inline, className }: ClaudeProcessingProps) {
  if (inline) {
    return (
      <span
        role="status"
        aria-live="polite"
        className={cn("inline-flex items-center gap-2 text-text-subtle", className)}
      >
        <Spinner />
        {label && <span className="text-xs">{label}</span>}
      </span>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-muted/60 border border-border/60",
        className
      )}
      style={{ minHeight: 28, contain: "layout paint" }}
    >
      <Spinner />
      <span className="text-[11px] uppercase tracking-wider text-text-subtle font-medium">
        {label ?? "Claude is thinking"}
      </span>
    </div>
  );
}

/**
 * Fixed-size, GPU-friendly spinner. Pure CSS rotation on a containing
 * SVG so we don't depend on a network-loaded GIF (the source of the
 * scroll-anchor glitch fixed in EMR-157).
 */
function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center"
      style={{ width: 14, height: 14 }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        style={{ animationDuration: "900ms" }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.5"
        />
        <path
          d="M21 12a9 9 0 0 1-9 9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

"use client";

// EMR-152 — Ambient heart-pulse indicator (Article IV).
//
// A small, calm SVG heart that beats at a cadence pulled from the
// compassion-index scoring in @/lib/platform/consciousness. The pulse
// slows as the practice's compassion index climbs and quickens as
// stress rises. Respects the user's prefers-reduced-motion setting:
// the heart still glows but doesn't beat.

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  pulseBpm,
  pulseDurationSeconds,
} from "@/lib/platform/consciousness";

export interface HeartPulseProps {
  /** 0–100 compassion index from computeCompassionMetrics. */
  compassionIndex: number;
  /** Optional stress modifier — open criticals, on-call load, etc. */
  stress?: number;
  /** Pixel size of the heart glyph. */
  size?: number;
  /** Optional small caption rendered below — eg the BPM number. */
  showBpmLabel?: boolean;
  className?: string;
}

export function HeartPulse({
  compassionIndex,
  stress = 0,
  size = 28,
  showBpmLabel = false,
  className,
}: HeartPulseProps) {
  const bpm = pulseBpm(compassionIndex, stress);
  const duration = pulseDurationSeconds(bpm);
  const reducedMotion = useReducedMotion();

  // Color the heart from amber (high stress) → rose (calm/healthy).
  const hue = 350 - Math.max(0, Math.min(100, compassionIndex)) * 0.4;
  const color = `hsl(${hue} 78% 56%)`;
  const glow = `hsl(${hue} 78% 70% / 0.45)`;

  return (
    <span
      className={cn("inline-flex flex-col items-center", className)}
      title={`Compassion index ${compassionIndex} · ${bpm} bpm`}
      aria-label={`Heart pulse, ${bpm} beats per minute`}
    >
      <span
        aria-hidden="true"
        style={
          {
            display: "inline-block",
            width: size,
            height: size,
            color,
            ["--heart-glow" as string]: glow,
            ["--heart-duration" as string]: `${duration}s`,
          } as React.CSSProperties
        }
        className={reducedMotion ? "lj-heart lj-heart-static" : "lj-heart"}
      >
        <svg
          viewBox="0 0 24 24"
          width={size}
          height={size}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
        >
          <path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.5 1.1 4.4 2.5C11.7 6.1 13.2 5 15.2 5 18.6 5 20.6 8.5 19.2 11.8 17 16.4 12 21 12 21z" />
        </svg>
      </span>
      {showBpmLabel && (
        <span className="mt-1 text-[10px] tabular-nums text-text-subtle">
          {bpm} bpm
        </span>
      )}
      <style>{`
        @keyframes lj-heart-pulse {
          0%   { transform: scale(1);    filter: drop-shadow(0 0 0 transparent); }
          18%  { transform: scale(1.18); filter: drop-shadow(0 0 6px var(--heart-glow)); }
          28%  { transform: scale(0.96); filter: drop-shadow(0 0 1px var(--heart-glow)); }
          42%  { transform: scale(1.10); filter: drop-shadow(0 0 4px var(--heart-glow)); }
          58%  { transform: scale(1);    filter: drop-shadow(0 0 0 transparent); }
          100% { transform: scale(1);    filter: drop-shadow(0 0 0 transparent); }
        }
        .lj-heart {
          transform-origin: center;
          animation: lj-heart-pulse var(--heart-duration, 1s) ease-in-out infinite;
          will-change: transform, filter;
        }
        .lj-heart-static {
          animation: none;
          filter: drop-shadow(0 0 6px var(--heart-glow));
        }
      `}</style>
    </span>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

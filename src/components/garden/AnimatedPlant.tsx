"use client";

/**
 * AnimatedPlant V2 — EMR-043
 *
 * A pure CSS / SVG animated cannabis plant. Successor to the V1
 * `HealthPlant` component, this one focuses on:
 *   - smooth growth interpolation when the score changes
 *   - per-stage idle animations (sway, sparkle, wilt)
 *   - reduced-motion respect via `prefers-reduced-motion`
 *   - Lottie-friendly contract: same growthFraction (0–1) drives every visual
 *
 * If a Lottie player is wired in later, the same `growthFraction` and
 * `stage` props can be forwarded into a Lottie file without changing
 * any consumer code.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type PlantStageV2 =
  | "seed"
  | "sprout"
  | "growing"
  | "healthy"
  | "flowering"
  | "thriving";

export interface AnimatedPlantProps {
  /** 0–1 growth fraction. Drives stem height, leaf count, color saturation. */
  growthFraction: number;
  /** Display stage — drives flowers, sparkles, weather. */
  stage?: PlantStageV2;
  /** "hero" sizing or a small "tile". */
  size?: "tile" | "hero";
  /** Optional accent that tints the foliage. Defaults to LeafJourney green. */
  accent?: string;
  /** className passthrough. */
  className?: string;
}

const STAGE_FROM_FRACTION = (f: number): PlantStageV2 => {
  if (f <= 0.15) return "seed";
  if (f <= 0.3) return "sprout";
  if (f <= 0.5) return "growing";
  if (f <= 0.7) return "healthy";
  if (f <= 0.85) return "flowering";
  return "thriving";
};

const SIZES: Record<NonNullable<AnimatedPlantProps["size"]>, { w: number; h: number }> = {
  tile: { w: 120, h: 180 },
  hero: { w: 280, h: 420 },
};

export function AnimatedPlant({
  growthFraction,
  stage,
  size = "hero",
  accent = "#3A8560",
  className,
}: AnimatedPlantProps) {
  const reduced = usePrefersReducedMotion();
  const f = clamp01(growthFraction);
  const computedStage = stage ?? STAGE_FROM_FRACTION(f);

  const { w, h } = SIZES[size];
  const vw = 240;
  const vh = 360;

  // Interpolated geometry.
  const stemHeight = 30 + 200 * f;
  const stemBase = vh - 96;
  const stemTop = stemBase - stemHeight;
  const leafColor = mixColor("#8FB07A", accent, f); // pale → accent
  const leafCount = Math.round(2 + 10 * f);
  const hasFlowers = computedStage === "flowering" || computedStage === "thriving";
  const isThriving = computedStage === "thriving";
  const isStruggling = computedStage === "seed" || computedStage === "sprout";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${vw} ${vh}`}
      role="img"
      aria-label={`Animated cannabis plant — ${computedStage}, ${(f * 100).toFixed(0)}% grown`}
      className={cn("select-none", className)}
    >
      <style>{`
        @keyframes ap-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(2.4deg); }
        }
        @keyframes ap-sway-back {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-2deg); }
        }
        @keyframes ap-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes ap-rise {
          0% { transform: translateY(8px) scaleY(0.96); opacity: 0; }
          100% { transform: translateY(0) scaleY(1); opacity: 1; }
        }
        @keyframes ap-wilt {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg); }
        }
        .ap-stem {
          transform-origin: ${vw / 2}px ${stemBase}px;
          animation: ap-sway 6s ease-in-out infinite;
          transition: d 800ms ease-in-out;
        }
        .ap-leaves {
          transform-origin: ${vw / 2}px ${stemBase}px;
          animation: ap-sway-back 7s ease-in-out infinite;
        }
        .ap-wilt {
          transform-origin: ${vw / 2}px ${stemBase}px;
          animation: ap-wilt 8s ease-in-out infinite;
        }
        .ap-grow-in {
          transform-origin: ${vw / 2}px ${stemBase}px;
          animation: ap-rise 700ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .ap-stem, .ap-leaves, .ap-wilt {
            animation: none !important;
          }
        }
      `}</style>

      <defs>
        <linearGradient id="ap-pot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4854A" />
          <stop offset="100%" stopColor="#8E5E20" />
        </linearGradient>
        <linearGradient id="ap-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={lighten(leafColor, 0.18)} />
          <stop offset="100%" stopColor={leafColor} />
        </linearGradient>
        <radialGradient id="ap-flower" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#E0B4F0" />
          <stop offset="100%" stopColor="#8E50B8" />
        </radialGradient>
        <radialGradient id="ap-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {isThriving && (
        <ellipse
          cx={vw / 2}
          cy={stemTop + stemHeight * 0.4}
          rx={130}
          ry={150}
          fill="url(#ap-glow)"
        />
      )}

      <g className={isStruggling && !reduced ? "ap-wilt" : ""}>
        {/* Pot */}
        <path
          d={`M ${vw / 2 - 56} ${vh - 90}
              L ${vw / 2 - 42} ${vh - 12}
              Q ${vw / 2 - 42} ${vh - 4} ${vw / 2 - 34} ${vh - 4}
              L ${vw / 2 + 34} ${vh - 4}
              Q ${vw / 2 + 42} ${vh - 4} ${vw / 2 + 42} ${vh - 12}
              L ${vw / 2 + 56} ${vh - 90} Z`}
          fill="url(#ap-pot)"
        />
        <rect x={vw / 2 - 60} y={vh - 96} width={120} height={10} rx={5} fill="#C4854A" />
        <ellipse cx={vw / 2} cy={vh - 84} rx={52} ry={8} fill="#5A4830" />

        {/* Stem */}
        <path
          className={!reduced ? "ap-stem" : ""}
          d={`M ${vw / 2} ${stemBase} Q ${vw / 2 + 4} ${stemBase - stemHeight / 2} ${vw / 2} ${stemTop}`}
          stroke="#2A5E3F"
          strokeWidth={3 + 1.5 * f}
          strokeLinecap="round"
          fill="none"
        />

        {/* Leaves */}
        <g className={!reduced ? "ap-leaves" : ""}>
          {Array.from({ length: leafCount }).map((_, i) => {
            const t = 0.18 + (i / Math.max(leafCount - 1, 1)) * 0.74;
            const y = stemBase - stemHeight * t;
            const side = i % 2 === 0 ? -1 : 1;
            const offset = 14 + (1 - t) * 8;
            const scale = 0.55 + (1 - t) * 0.5;
            return (
              <g
                key={i}
                transform={`translate(${vw / 2 + side * offset}, ${y}) rotate(${side * (15 + t * 22)}) scale(${side < 0 ? -scale : scale}, ${scale})`}
                className={!reduced ? "ap-grow-in" : ""}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <path
                  d="M 0 0 C -2 -10, -3 -20, 0 -28 C 3 -20, 2 -10, 0 0 Z"
                  fill="url(#ap-leaf)"
                />
                <path
                  d="M 0 -2 C -7 -12, -10 -18, -7 -24 C -4 -18, -2 -12, 0 -2 Z"
                  fill="url(#ap-leaf)"
                  opacity="0.85"
                />
                <path
                  d="M 0 -2 C 7 -12, 10 -18, 7 -24 C 4 -18, 2 -12, 0 -2 Z"
                  fill="url(#ap-leaf)"
                  opacity="0.85"
                />
                <path
                  d="M 0 0 C -9 -6, -14 -12, -13 -19 C -9 -14, -4 -8, 0 0 Z"
                  fill="url(#ap-leaf)"
                  opacity="0.7"
                />
                <path
                  d="M 0 0 C 9 -6, 14 -12, 13 -19 C 9 -14, 4 -8, 0 0 Z"
                  fill="url(#ap-leaf)"
                  opacity="0.7"
                />
              </g>
            );
          })}
        </g>

        {/* Flowers */}
        {hasFlowers && (
          <g>
            <circle cx={vw / 2} cy={stemTop + 4} r={9} fill="url(#ap-flower)" />
            {isThriving && (
              <>
                <circle cx={vw / 2 - 18} cy={stemTop + 16} r={6} fill="url(#ap-flower)" />
                <circle cx={vw / 2 + 18} cy={stemTop + 14} r={6} fill="url(#ap-flower)" />
              </>
            )}
          </g>
        )}

        {/* Sparkles for thriving */}
        {isThriving && !reduced && (
          <g>
            {[
              { cx: vw / 2 - 30, cy: stemTop + 30, delay: "0s" },
              { cx: vw / 2 + 32, cy: stemTop + 56, delay: "1s" },
              { cx: vw / 2 - 18, cy: stemTop - 8, delay: "1.6s" },
            ].map((s, i) => (
              <g
                key={i}
                style={{
                  animation: `ap-sparkle 2.6s ease-in-out infinite`,
                  animationDelay: s.delay,
                  transformOrigin: `${s.cx}px ${s.cy}px`,
                }}
              >
                <circle cx={s.cx} cy={s.cy} r={2} fill="#F6D365" />
                <line x1={s.cx - 4} y1={s.cy} x2={s.cx + 4} y2={s.cy} stroke="#F6D365" strokeWidth={0.8} />
                <line x1={s.cx} y1={s.cy - 4} x2={s.cx} y2={s.cy + 4} stroke="#F6D365" strokeWidth={0.8} />
              </g>
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}

// ---------- helpers ---------------------------------------------------------

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mql.matches);
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}
function mixColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex(
    ar + (br - ar) * k,
    ag + (bg - ag) * k,
    ab + (bb - ab) * k,
  );
}
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const k = clamp01(amount);
  return rgbToHex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
}

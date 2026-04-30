"use client";

import * as React from "react";

/**
 * EMR-176: a fun, low-key celebration moment that drops a handful of
 * leaves + soft confetti from the top of its container. Mounted on
 * patient win-states (check-in saved, goal hit, intake done).
 *
 * Honors prefers-reduced-motion via the existing globals.css media
 * query — the lm-confetti-piece keyframe collapses to no-op there.
 */

const PIECES = 22;
const COLORS = [
  "var(--accent)",
  "var(--accent-strong)",
  "var(--highlight)",
  "var(--success)",
  "var(--sage-deep)",
  "var(--peach-deep)",
];
const LEAVES = ["🌿", "🍃", "🌱"];

interface Piece {
  i: number;
  isLeaf: boolean;
  emoji: string;
  color: string;
  cx: string;
  cr: string;
  delay: string;
  left: string;
  size: number;
}

function buildPieces(seedOffset: number): Piece[] {
  return Array.from({ length: PIECES }, (_, i) => {
    // Deterministic pseudo-random — keeps SSR/CSR markup identical.
    const seed = (i + 1 + seedOffset) * 9301 + 49297;
    const r = (seed % 233280) / 233280;
    const r2 = ((seed * 17) % 233280) / 233280;
    const isLeaf = r2 < 0.45;
    return {
      i,
      isLeaf,
      emoji: LEAVES[Math.floor(r * LEAVES.length)],
      color: COLORS[i % COLORS.length],
      cx: `${Math.round((r - 0.5) * 360)}px`,
      cr: `${Math.round(r * 720 - 180)}deg`,
      delay: `${Math.round(r * 350)}ms`,
      left: `${5 + Math.round(r * 90)}%`,
      size: isLeaf ? 14 + Math.round(r * 8) : 6,
    };
  });
}

export function LeafCelebration({ keySeed = 0 }: { keySeed?: number }) {
  const [pieces, setPieces] = React.useState<Piece[]>(() => buildPieces(0));

  // Bumping the key re-runs the animation on demand.
  React.useEffect(() => {
    setPieces(buildPieces(keySeed));
  }, [keySeed]);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[280px] overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={`${keySeed}-${p.i}`}
          className="lm-confetti-piece absolute top-2 inline-flex items-center justify-center"
          style={{
            left: p.left,
            width: p.isLeaf ? p.size : 6,
            height: p.isLeaf ? p.size : 10,
            fontSize: p.isLeaf ? `${p.size}px` : undefined,
            background: p.isLeaf ? "transparent" : p.color,
            borderRadius: p.isLeaf ? 0 : 2,
            animationDelay: p.delay,
            ["--lm-cx" as string]: p.cx,
            ["--lm-cr" as string]: p.cr,
          }}
        >
          {p.isLeaf ? p.emoji : null}
        </span>
      ))}
    </span>
  );
}

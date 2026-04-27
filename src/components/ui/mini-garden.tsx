"use client";

import { cn } from "@/lib/utils/cn";

type Leaf = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate: number;
  hue: string;
};

// Nine leaves climb the stem — left, right, alternating — culminating in a
// crown sprig. Grow order = visual sequence (bottom → top), which makes any
// number of checks read as "started growing".
const LEAVES: Leaf[] = [
  { cx: 70,  cy: 200, rx: 22, ry: 11, rotate: -30, hue: "#3A8560" },
  { cx: 130, cy: 188, rx: 22, ry: 11, rotate: 30,  hue: "#4A9970" },
  { cx: 65,  cy: 162, rx: 22, ry: 11, rotate: -25, hue: "#3A8560" },
  { cx: 135, cy: 146, rx: 22, ry: 11, rotate: 25,  hue: "#4A9970" },
  { cx: 70,  cy: 122, rx: 20, ry: 10, rotate: -20, hue: "#5BA77E" },
  { cx: 130, cy: 108, rx: 20, ry: 10, rotate: 20,  hue: "#5BA77E" },
  { cx: 78,  cy: 86,  rx: 18, ry: 9,  rotate: -15, hue: "#6BB58C" },
  { cx: 122, cy: 76,  rx: 18, ry: 9,  rotate: 15,  hue: "#6BB58C" },
  { cx: 100, cy: 56,  rx: 16, ry: 8,  rotate: 0,   hue: "#7BC79B" },
];

export type MiniGardenProps = {
  /** Number of leaves grown (0..LEAVES.length). Values are clamped. */
  grown: number;
  /** Total leaf slots. Defaults to 9. */
  total?: number;
  className?: string;
};

export function MiniGarden({ grown, total = LEAVES.length, className }: MiniGardenProps) {
  const max = Math.min(LEAVES.length, total);
  const safe = Math.max(0, Math.min(max, grown));
  const flowering = safe === max;

  return (
    <svg
      viewBox="0 0 200 240"
      role="img"
      aria-label={`Garden plant with ${safe} of ${max} leaves grown`}
      className={cn("w-full h-auto select-none", className)}
    >
      <defs>
        <radialGradient id="mini-garden-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#5BA77E" stopOpacity={flowering ? 0.35 : 0.18} />
          <stop offset="100%" stopColor="#5BA77E" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="mini-garden-stem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7BC79B" />
          <stop offset="100%" stopColor="#3A8560" />
        </linearGradient>
      </defs>

      <circle cx={100} cy={140} r={95} fill="url(#mini-garden-glow)" />

      {/* Pot */}
      <path
        d="M 60 220 L 70 240 L 130 240 L 140 220 Z"
        fill="#A87B5A"
        opacity={0.85}
      />
      <rect x={58} y={216} width={84} height={6} rx={1.5} fill="#8C6443" />

      {/* Stem (curving) */}
      <path
        d="M 100 218 C 96 180, 104 150, 100 110 C 96 80, 104 60, 100 40"
        stroke="url(#mini-garden-stem)"
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Leaves */}
      {LEAVES.slice(0, max).map((leaf, i) => {
        const isGrown = i < safe;
        return (
          <g
            key={i}
            style={{
              transformOrigin: `${leaf.cx}px ${leaf.cy}px`,
              transform: isGrown ? "scale(1)" : "scale(0)",
              opacity: isGrown ? 1 : 0,
              transition:
                "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-out",
              transitionDelay: isGrown ? `${i * 40}ms` : "0ms",
            }}
          >
            <ellipse
              cx={leaf.cx}
              cy={leaf.cy}
              rx={leaf.rx}
              ry={leaf.ry}
              fill={leaf.hue}
              transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
            />
            <ellipse
              cx={leaf.cx}
              cy={leaf.cy}
              rx={leaf.rx * 0.55}
              ry={leaf.ry * 0.4}
              fill="#FFFFFF"
              opacity={0.18}
              transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy}) translate(-${leaf.rx * 0.2} -${leaf.ry * 0.25})`}
            />
          </g>
        );
      })}

      {/* Flower crown — appears only when fully grown */}
      <g
        style={{
          transformOrigin: "100px 40px",
          transform: flowering ? "scale(1)" : "scale(0)",
          opacity: flowering ? 1 : 0,
          transition: "transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 360ms, opacity 500ms ease-out 360ms",
        }}
      >
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx={100}
            cy={28}
            rx={5}
            ry={9}
            fill="#F4B6C8"
            transform={`rotate(${deg} 100 40)`}
          />
        ))}
        <circle cx={100} cy={40} r={4} fill="#F4D06F" />
      </g>
    </svg>
  );
}

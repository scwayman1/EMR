import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Large marketing-hero artwork. An abstract botanical composition with
 * layered organic forms, a subtle grain, and minimal decorative accents.
 * Rendered entirely in SVG so it's crisp at any size and theme-aware
 * (colors follow the CSS variables).
 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 540"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-auto select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="forest" x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-strong)" />
        </linearGradient>
        <linearGradient id="amber" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--highlight)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#E2A862" stopOpacity="0.8" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="var(--highlight-soft)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mist" cx="30%" cy="70%" r="70%">
          <stop offset="0%" stopColor="var(--accent-soft)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
          <feColorMatrix values="0 0 0 0 0.11  0 0 0 0 0.10  0 0 0 0 0.08  0 0 0 0.09 0" />
        </filter>
      </defs>

      {/* Ambient wash */}
      <rect width="600" height="540" fill="var(--bg)" />
      <circle cx="380" cy="230" r="280" fill="url(#glow)" />
      <circle cx="180" cy="380" r="220" fill="url(#mist)" />

      {/* Primary organic form — a large abstract leaf/bloom */}
      <path
        d="M 190 90
           C 340 70, 470 150, 495 290
           C 510 400, 420 460, 300 460
           C 165 460, 95 360, 115 225
           C 130 140, 160 100, 190 90 Z"
        fill="url(#forest)"
      />

      {/* Inner highlight — warmer secondary shape */}
      <path
        d="M 275 155
           C 370 155, 430 220, 415 310
           C 398 385, 325 405, 260 370
           C 190 325, 205 215, 275 155 Z"
        fill="url(#amber)"
        opacity="0.85"
      />

      {/* Inner sprout — tiny offset circle */}
      <circle cx="345" cy="265" r="38" fill="var(--accent-soft)" opacity="0.85" />
      <circle cx="345" cy="265" r="16" fill="var(--highlight-soft)" />

      {/* Stem line — a single confident curve */}
      <path
        d="M 300 460 Q 318 390, 335 300"
        stroke="var(--highlight-soft)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Thin side veins */}
      <path
        d="M 300 460 Q 240 420, 180 430"
        stroke="var(--accent-strong)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M 300 460 Q 360 420, 420 440"
        stroke="var(--accent-strong)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* Decorative dots — composition rhythm */}
      <circle cx="120" cy="110" r="3.5" fill="var(--highlight)" opacity="0.7" />
      <circle cx="495" cy="420" r="5" fill="var(--accent)" opacity="0.55" />
      <circle cx="165" cy="445" r="2.5" fill="var(--accent)" opacity="0.45" />
      <circle cx="510" cy="130" r="2.5" fill="var(--highlight)" opacity="0.6" />
      <circle cx="75" cy="240" r="2" fill="var(--accent)" opacity="0.35" />
      <circle cx="540" cy="280" r="2" fill="var(--highlight)" opacity="0.4" />

      {/* Small arc accents */}
      <path
        d="M 85 260 Q 125 240, 155 252"
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.25"
      />
      <path
        d="M 500 295 Q 535 275, 560 285"
        stroke="var(--highlight)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Paper grain overlay */}
      <rect width="600" height="540" filter="url(#hero-grain)" opacity="0.4" />
    </svg>
  );
}

/**
 * Smaller ambient artwork for dashboard hero cards — softer, quieter,
 * designed to sit behind a greeting headline.
 */
export function AmbientOrb({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 280"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="orb-forest" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="orb-amber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--highlight)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--highlight)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="310" cy="130" r="160" fill="url(#orb-forest)" />
      <circle cx="110" cy="200" r="120" fill="url(#orb-amber)" />
      {/* wispy stem */}
      <path
        d="M 50 260 Q 130 150, 260 120 T 380 60"
        stroke="var(--accent)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.28"
      />
      <circle cx="260" cy="120" r="3" fill="var(--highlight)" opacity="0.8" />
      <circle cx="130" cy="150" r="2" fill="var(--accent)" opacity="0.6" />
      <circle cx="350" cy="80" r="2.5" fill="var(--highlight)" opacity="0.7" />
    </svg>
  );
}

/**
 * CategoryIcon — small abstract SVG glyph per Leafmart category.
 *
 * Used on category cards (homepage + shop) to give each shelf its own
 * symbolic identity at a glance. 18×18 viewBox; uses currentColor so the
 * caller can tint it (typically with the category's stamp colour).
 *
 * Falls back to a leaf glyph for any unmapped slug.
 */

interface Props {
  slug: string;
  size?: number;
  className?: string;
}

type IconRenderer = () => React.ReactNode;

const ICONS: Record<string, IconRenderer> = {
  /* Goals / Symptoms ─────────────────────────────────────────── */

  // Crescent moon — wind-down, evening
  rest: () => (
    <path
      d="M14 11.2A6 6 0 1 1 6.8 4a5 5 0 0 0 7.2 7.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  // Backwards-compat alias for legacy "sleep" slug seed rows.
  sleep: () => (
    <path
      d="M14 11.2A6 6 0 1 1 6.8 4a5 5 0 0 0 7.2 7.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),

  // Cross-bandage — pain support
  "pain-support": () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="7" width="12" height="4" rx="1.5" transform="rotate(-30 9 9)" />
      <line x1="6" y1="6" x2="8" y2="8" />
      <line x1="10" y1="10" x2="12" y2="12" />
    </g>
  ),

  // Heart in steady wave — anxiety
  anxiety: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 9.5h2L6 7l1.5 5L9 6l1.5 5.5L12 9.5h3.5" />
    </g>
  ),

  // Tea cup with steam — nausea / settling
  nausea: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9h9v3a3 3 0 0 1-3 3H6.5a3 3 0 0 1-3-3V9z" />
      <path d="M12.5 10h1.5a1.5 1.5 0 0 1 0 3h-1.5" />
      <path d="M6 6.5c0-1 1-1 1-2M9 6.5c0-1 1-1 1-2" />
    </g>
  ),

  // Concentric circles — zen / calm
  calm: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="9" r="6" />
      <circle cx="9" cy="9" r="2.5" />
    </g>
  ),

  // Target / crosshair — focus
  focus: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9" cy="9" r="6" />
      <circle cx="9" cy="9" r="2" />
      <line x1="9" y1="2" x2="9" y2="4" />
      <line x1="9" y1="14" x2="9" y2="16" />
      <line x1="2" y1="9" x2="4" y2="9" />
      <line x1="14" y1="9" x2="16" y2="9" />
    </g>
  ),

  // Refresh / circular arrow — recovery
  recovery: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 9a5.5 5.5 0 1 1-1.6-3.9" />
      <polyline points="13.5,3 13,5.5 10.5,5" />
    </g>
  ),

  // Sun rays — energy
  energy: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="9" cy="9" r="3.2" />
      <line x1="9" y1="2" x2="9" y2="3.5" />
      <line x1="9" y1="14.5" x2="9" y2="16" />
      <line x1="2" y1="9" x2="3.5" y2="9" />
      <line x1="14.5" y1="9" x2="16" y2="9" />
      <line x1="4" y1="4" x2="5.2" y2="5.2" />
      <line x1="12.8" y1="12.8" x2="14" y2="14" />
      <line x1="4" y1="14" x2="5.2" y2="12.8" />
      <line x1="12.8" y1="5.2" x2="14" y2="4" />
    </g>
  ),

  // Flower with petal — skin
  skin: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M9 5c-1.5 0-2.5 1.2-2.5 2.5S7.5 10 9 10s2.5-1.2 2.5-2.5S10.5 5 9 5z" />
      <path d="M9 5V3M11.5 7.5l1.5-1M9 12.5V14M6.5 10.5l-1.5 1M11.5 10.5l1.5 1M6.5 7.5l-1.5-1" />
    </g>
  ),

  /* Formats ───────────────────────────────────────────────────── */

  // Dropper — tinctures
  tinctures: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7.5" y="2" width="3" height="6" rx="0.5" />
      <path d="M7 8h4l-1 4a1 1 0 0 1-1 .8h0a1 1 0 0 1-1-.8L7 8z" />
      <path d="M9 13.5v2.5" />
    </g>
  ),

  // Stacked rounded square — edibles / chocolate
  edibles: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="11" height="11" rx="2" />
      <line x1="9" y1="3.5" x2="9" y2="14.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="3.5" y1="9" x2="14.5" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </g>
  ),

  // Hand-holding-drop — topicals
  topicals: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3c-1.6 2.4-3 4.2-3 6a3 3 0 0 0 6 0c0-1.8-1.4-3.6-3-6z" />
    </g>
  ),

  // Capsule — capsules
  capsules: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="6.5" width="13" height="5" rx="2.5" transform="rotate(-15 9 9)" />
      <line x1="9" y1="6" x2="9" y2="12" transform="rotate(-15 9 9)" />
    </g>
  ),

  // Vapor wisps — vaporizers
  vaporizers: () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 14c0-1.5 1-1.5 1-3s-1-1.5-1-3 1-1.5 1-3" />
      <path d="M9 14c0-1.5 1-1.5 1-3s-1-1.5-1-3 1-1.5 1-3" />
      <path d="M13 14c0-1.5 1-1.5 1-3s-1-1.5-1-3 1-1.5 1-3" />
    </g>
  ),

  /* Collections ───────────────────────────────────────────────── */

  // Checkmark in circle — clinician-picks
  "clinician-picks": () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="6.5" />
      <path d="M5.8 9.2L8 11.4L12.4 6.8" />
    </g>
  ),

  // Filled star — best-sellers
  "best-sellers": () => (
    <path
      d="M9 2.5l2 4.4 4.8.4-3.7 3.2 1.2 4.6L9 12.7 4.7 15.1l1.2-4.6L2.2 7.3l4.8-.4L9 2.5z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  ),

  // Sprout — beginner-friendly
  "beginner-friendly": () => (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15V8" />
      <path d="M9 8c-2 0-3.5-1.5-3.5-3.5h2C7.5 6 8 6.5 9 6.5s1.5-.5 1.5-2h2C12.5 6.5 11 8 9 8z" />
      <path d="M9 11c2-1 4-1 5 0" />
    </g>
  ),
};

const FALLBACK: IconRenderer = () => (
  <path
    d="M9 2c-1.5 3-4.5 4.5-6 7.5C2.5 13 5 16 9 16s6.5-3 6-6.5C13.5 6.5 10.5 5 9 2z"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinejoin="round"
  />
);

export function CategoryIcon({ slug, size = 18, className }: Props) {
  const render = ICONS[slug] ?? FALLBACK;
  return (
    <svg
      viewBox="0 0 18 18"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {render()}
    </svg>
  );
}

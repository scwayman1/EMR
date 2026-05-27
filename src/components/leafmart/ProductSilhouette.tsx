"use client";

/**
 * SVG product silhouettes — the visual stand-in for product photography.
 *
 * TWO rendering modes:
 *   • **full** (height ≥ 120px) — detailed shapes with labels, white info
 *     panels, and fine detail lines. Used on product cards and PDP.
 *   • **compact** (height < 120px) — bold simplified shapes stripped of
 *     text, detail lines, and inner panels. Crisp at 48–72px for cart
 *     drawer, checkout sidebar, and thumbnails.
 *
 * Each shape is an abstracted, tactile bottle/can/jar/tin/serum/box that
 * reads at any size and sits on a pastel background.
 */

type Shape = "bottle" | "can" | "jar" | "tin" | "serum" | "box";

interface ProductSilhouetteProps {
  shape?: Shape;
  bg?: string;
  deep?: string;
  height?: number;
  label?: string;
  big?: boolean;
  className?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   Compact SVGs — bold shapes, no text, no detail lines.
   ViewBox is 80×80 so every pixel counts at small sizes.
   ───────────────────────────────────────────────────────────────────────── */

function CompactBottle({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="32" y="8" width="16" height="8" rx="2" fill={deep} opacity="0.8" />
      <rect x="35" y="4" width="10" height="6" rx="2" fill={deep} opacity="0.6" />
      <path d="M26 20 Q26 16 30 16 H50 Q54 16 54 20 V68 Q54 74 48 74 H32 Q26 74 26 68 Z" fill={deep} />
      <rect x="30" y="36" width="20" height="24" rx="2" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function CompactCan({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="40" cy="12" rx="18" ry="4" fill={deep} opacity="0.6" />
      <rect x="22" y="12" width="36" height="56" fill={deep} />
      <ellipse cx="40" cy="68" rx="18" ry="4" fill={deep} opacity="0.8" />
      <rect x="28" y="26" width="24" height="30" rx="2" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function CompactJar({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="22" y="20" width="36" height="10" rx="3" fill={deep} />
      <rect x="20" y="28" width="40" height="44" rx="4" fill={deep} />
      <rect x="26" y="38" width="28" height="24" rx="2" fill="rgba(255,255,255,0.85)" />
      <circle cx="40" cy="62" r="4" fill="none" stroke={deep} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

function CompactTin({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="40" cy="42" rx="28" ry="10" fill={deep} opacity="0.5" />
      <rect x="12" y="42" width="56" height="22" fill={deep} />
      <ellipse cx="40" cy="64" rx="28" ry="10" fill={deep} />
      <ellipse cx="40" cy="42" rx="22" ry="7" fill="rgba(255,255,255,0.88)" />
    </svg>
  );
}

function CompactSerum({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="35" y="6" width="10" height="14" rx="2" fill={deep} opacity="0.75" />
      <rect x="33" y="18" width="14" height="6" rx="1.5" fill={deep} />
      <rect x="28" y="24" width="24" height="50" rx="4" fill={deep} />
      <rect x="32" y="36" width="16" height="28" rx="2" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

function CompactBox({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="16" y="18" width="48" height="54" rx="4" fill={deep} />
      <rect x="22" y="28" width="36" height="34" rx="2" fill="rgba(255,255,255,0.88)" />
      <circle cx="40" cy="58" r="4" fill={deep} opacity="0.35" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Full SVGs — detailed shapes with labels and fine detail lines.
   Used at 120px+ on product cards, PDP, and category cards.
   ───────────────────────────────────────────────────────────────────────── */

function FullBottle({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <rect x="78" y="32" width="44" height="20" rx="3" fill={deep} />
      <rect x="84" y="20" width="32" height="14" rx="3" fill={deep} opacity="0.85" />
      <path d="M62 60 Q62 52 70 52 H130 Q138 52 138 60 V250 Q138 262 126 262 H74 Q62 262 62 250 Z" fill={deep} />
      <rect x="74" y="120" width="52" height="92" rx="3" fill="rgba(255,255,255,0.85)" />
      <rect x="80" y="132" width="40" height="2" fill={deep} opacity="0.5" />
      <rect x="80" y="142" width="28" height="2" fill={deep} opacity="0.4" />
      <rect x="80" y="180" width="20" height="6" fill={deep} opacity="0.6" />
    </svg>
  );
}

function FullCan({ deep, label }: { deep: string; label: string }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <ellipse cx="100" cy="44" rx="42" ry="8" fill={deep} opacity="0.7" />
      <rect x="58" y="44" width="84" height="216" fill={deep} />
      <ellipse cx="100" cy="260" rx="42" ry="8" fill={deep} opacity="0.85" />
      <rect x="68" y="100" width="64" height="120" rx="3" fill="rgba(255,255,255,0.88)" />
      <text x="100" y="148" textAnchor="middle" fontFamily="Fraunces" fontSize="20" fontWeight="500" fill={deep}>
        {label || "still"}
      </text>
      <rect x="80" y="170" width="40" height="2" fill={deep} opacity="0.4" />
      <rect x="86" y="180" width="28" height="2" fill={deep} opacity="0.3" />
      <rect x="84" y="200" width="32" height="8" rx="2" fill={deep} opacity="0.55" />
    </svg>
  );
}

function FullJar({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <rect x="50" y="80" width="100" height="22" rx="4" fill={deep} />
      <rect x="46" y="100" width="108" height="160" rx="6" fill={deep} />
      <rect x="58" y="130" width="84" height="100" rx="3" fill="rgba(255,255,255,0.85)" />
      <rect x="68" y="146" width="64" height="3" fill={deep} opacity="0.55" />
      <rect x="68" y="158" width="48" height="3" fill={deep} opacity="0.4" />
      <circle cx="100" cy="200" r="14" fill="none" stroke={deep} strokeWidth="2" opacity="0.6" />
    </svg>
  );
}

function FullTin({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <ellipse cx="100" cy="170" rx="80" ry="22" fill={deep} opacity="0.6" />
      <rect x="20" y="170" width="160" height="60" fill={deep} />
      <ellipse cx="100" cy="230" rx="80" ry="22" fill={deep} />
      <ellipse cx="100" cy="170" rx="68" ry="16" fill="rgba(255,255,255,0.9)" />
      <text x="100" y="175" textAnchor="middle" fontFamily="Fraunces" fontSize="14" fontWeight="500" fill={deep}>
        field balm № 4
      </text>
    </svg>
  );
}

function FullSerum({ deep }: { deep: string }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <rect x="86" y="20" width="28" height="40" rx="3" fill={deep} opacity="0.85" />
      <rect x="82" y="56" width="36" height="14" rx="2" fill={deep} />
      <rect x="68" y="70" width="64" height="190" rx="6" fill={deep} />
      <rect x="78" y="120" width="44" height="110" rx="3" fill="rgba(255,255,255,0.88)" />
      <text x="100" y="160" textAnchor="middle" fontFamily="Fraunces" fontSize="14" fontWeight="500" fill={deep}>
        gold
      </text>
      <text x="100" y="178" textAnchor="middle" fontFamily="Fraunces" fontSize="11" fill={deep} opacity="0.7">
        serum
      </text>
    </svg>
  );
}

function FullBox({ deep, label }: { deep: string; label: string }) {
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
      <rect x="40" y="80" width="120" height="170" rx="6" fill={deep} />
      <rect x="52" y="110" width="96" height="120" rx="3" fill="rgba(255,255,255,0.9)" />
      <text x="100" y="150" textAnchor="middle" fontFamily="Fraunces" fontSize="13" fontWeight="500" fill={deep}>
        {label || "edibles"}
      </text>
      <rect x="68" y="170" width="64" height="2" fill={deep} opacity="0.45" />
      <rect x="76" y="180" width="48" height="2" fill={deep} opacity="0.35" />
      <circle cx="100" cy="210" r="8" fill={deep} opacity="0.4" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main component — auto-switches between compact and full at 120px.
   ───────────────────────────────────────────────────────────────────────── */

export function ProductSilhouette({
  shape = "bottle",
  bg = "var(--sage)",
  deep = "var(--leaf)",
  height = 280,
  label = "",
  big = false,
  className = "",
}: ProductSilhouetteProps) {
  const isCompact = height < 120;
  const radius = isCompact ? Math.min(16, Math.round(height * 0.2)) : 28;
  const pad = isCompact ? 6 : 24;
  const innerWidth = isCompact ? "85%" : big ? "70%" : "62%";

  let svg: React.ReactNode;

  if (isCompact) {
    switch (shape) {
      case "bottle": svg = <CompactBottle deep={deep} />; break;
      case "can":    svg = <CompactCan deep={deep} />;    break;
      case "jar":    svg = <CompactJar deep={deep} />;    break;
      case "tin":    svg = <CompactTin deep={deep} />;    break;
      case "serum":  svg = <CompactSerum deep={deep} />;  break;
      case "box":    svg = <CompactBox deep={deep} />;    break;
      default:       svg = <svg viewBox="0 0 80 80" />;
    }
  } else {
    switch (shape) {
      case "bottle": svg = <FullBottle deep={deep} />;             break;
      case "can":    svg = <FullCan deep={deep} label={label} />;  break;
      case "jar":    svg = <FullJar deep={deep} />;                break;
      case "tin":    svg = <FullTin deep={deep} />;                break;
      case "serum":  svg = <FullSerum deep={deep} />;              break;
      case "box":    svg = <FullBox deep={deep} label={label} />;  break;
      default:       svg = <svg viewBox="0 0 200 280" />;
    }
  }

  // Atmospheric gradient — pastel at top, 18% blend toward the stamp at the
  // bottom. Gives every shelf subtle depth without per-shape SVG work.
  // color-mix is supported in Chrome 111+/Safari 16.2+.
  const backgroundImage = `linear-gradient(180deg, ${bg} 0%, color-mix(in srgb, ${bg} 82%, ${deep}) 100%)`;

  return (
    <div
      className={className}
      style={{
        backgroundImage,
        backgroundColor: bg, /* fallback for browsers without color-mix */
        borderRadius: radius,
        position: "relative",
        overflow: "hidden",
        height,
        display: "flex",
        alignItems: isCompact ? "center" : "flex-end",
        justifyContent: "center",
        padding: `0 ${pad}px`,
      }}
    >
      <div
        style={{
          width: innerWidth,
          height: isCompact ? "75%" : "100%",
          display: "flex",
          alignItems: isCompact ? "center" : "flex-end",
          justifyContent: "center",
        }}
      >
        {svg}
      </div>
    </div>
  );
}

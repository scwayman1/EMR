"use client";

/**
 * SVG product silhouettes — the visual stand-in for product photography.
 * Each shape is an abstracted, tactile bottle/can/jar/tin/serum/box that
 * reads at any size and sits on a pastel background. Based on the design
 * system field guide (leafmart-medvi.jsx L13-93).
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

export function ProductSilhouette({
  shape = "bottle",
  bg = "var(--sage)",
  deep = "var(--leaf)",
  height = 280,
  label = "",
  big = false,
  className = "",
}: ProductSilhouetteProps) {
  let svg: React.ReactNode;
  switch (shape) {
    case "bottle":
      svg = (
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
      break;
    case "jar":
      svg = (
        <svg viewBox="0 0 200 280" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
          <rect x="50" y="80" width="100" height="22" rx="4" fill={deep} />
          <rect x="46" y="100" width="108" height="160" rx="6" fill={deep} />
          <rect x="58" y="130" width="84" height="100" rx="3" fill="rgba(255,255,255,0.85)" />
          <rect x="68" y="146" width="64" height="3" fill={deep} opacity="0.55" />
          <rect x="68" y="158" width="48" height="3" fill={deep} opacity="0.4" />
          <circle cx="100" cy="200" r="14" fill="none" stroke={deep} strokeWidth="2" opacity="0.6" />
        </svg>
      );
      break;
    case "can":
      svg = (
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
      break;
    case "serum":
      svg = (
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
      break;
    case "tin":
      svg = (
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
      break;
    case "box":
      svg = (
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
      break;
    default:
      svg = <svg viewBox="0 0 200 280" />;
  }

  return (
    <div
      className={className}
      style={{
        background: bg,
        borderRadius: 28,
        position: "relative",
        overflow: "hidden",
        height,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          width: big ? "70%" : "62%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        {svg}
      </div>
    </div>
  );
}

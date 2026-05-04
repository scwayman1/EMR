"use client";

// EMR-277 — Five-leaf cannabis rating row.
//
// Component name kept as `StarRating` to avoid a fan-out rename across
// every product card and review surface. The rendered glyph is now a
// stylized cannabis leaf. Fractional fill via clip-path so half-leaves
// still work for averaged ratings.

interface Props {
  rating: number;
  size?: number;
  className?: string;
}

export function StarRating({ rating, size = 16, className = "" }: Props) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[var(--leaf)] ${className}`}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 leaves`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return <Leaf key={i} size={size} fill={fill} />;
      })}
    </span>
  );
}

export const LeafRating = StarRating;

function Leaf({ size, fill }: { size: number; fill: number }) {
  // Seven-finger cannabis leaf silhouette in a 24×24 viewBox.
  const path =
    "M12 1.5c-.6 2.6-1.6 4.5-2.7 5.8.4-2.1.2-4-.6-5.6-.4 2.7-1.5 4.7-3 6.1.8-1.6.9-3.4.4-5.4-1.4 2.6-2.5 4.6-3.4 6 1 .1 1.9.5 2.7 1.2-1.4-.1-2.7.3-3.9 1.2 2.1.4 3.7 1.2 4.7 2.4-1.5 0-2.9.5-4.1 1.6 2 .2 3.6.7 4.8 1.6L5.5 17.5l3.5-.6L8.5 19l3-1.4-.2 3 .7.4.7-.4-.2-3 3 1.4-.5-2.1 3.5.6-1.3-1.6c1.2-.9 2.8-1.4 4.8-1.6-1.2-1.1-2.6-1.6-4.1-1.6 1-1.2 2.6-2 4.7-2.4-1.2-.9-2.5-1.3-3.9-1.2.8-.7 1.7-1.1 2.7-1.2-.9-1.4-2-3.4-3.4-6-.5 2-.4 3.8.4 5.4-1.5-1.4-2.6-3.4-3-6.1-.8 1.6-1 3.5-.6 5.6-1.1-1.3-2.1-3.2-2.7-5.8z";
  const id = `leafclip-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {fill > 0 && (
        <>
          <defs>
            <clipPath id={id}>
              <rect x="0" y="0" width={24 * fill} height="24" />
            </clipPath>
          </defs>
          <path d={path} fill="currentColor" clipPath={`url(#${id})`} />
        </>
      )}
    </svg>
  );
}

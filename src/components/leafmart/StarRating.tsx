"use client";

// EMR-277: Star ratings replaced with cannabis-leaf ratings per Dr. Patel.
// The export name stays `StarRating` for backward compatibility with the
// many call sites; `LeafRating` is the preferred forward-facing name.

interface Props {
  rating: number;
  size?: number;
  className?: string;
}

/** Five-leaf rating row. Renders fractional fill via a clip-path so
 *  half-leaves work the same way half-stars did. */
export function LeafRating({ rating, size = 16, className = "" }: Props) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[var(--leaf)] ${className}`}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return <Leaf key={i} size={size} fill={fill} />;
      })}
    </span>
  );
}

// Backward-compat alias — many existing call sites import StarRating.
export const StarRating = LeafRating;

function Leaf({ size, fill }: { size: number; fill: number }) {
  // 5-leaflet cannabis silhouette in a 24x24 viewBox. The path traces
  // the outer leaflets first (left → top → right) then returns along
  // the bottom stem so a single clip rect produces a clean partial fill.
  const path =
    "M12 2C12 2 10 6 8 8C6 10 4 11 2 11C4 13 6 13 8 14C6 16 5 18 5 21C7 19 9 18 11 17C11 19 11 21 12 22C13 21 13 19 13 17C15 18 17 19 19 21C19 18 18 16 16 14C18 13 20 13 22 11C20 11 18 10 16 8C14 6 12 2 12 2Z";
  const id = `leaf-clip-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
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

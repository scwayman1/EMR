"use client";

interface Props {
  rating: number;
  size?: number;
  className?: string;
}

/** Five-star row. Renders fractional fill via a clip-path so half-stars work. */
export function StarRating({ rating, size = 16, className = "" }: Props) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[var(--leaf)] ${className}`}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, clamped - i));
        return <Star key={i} size={size} fill={fill} />;
      })}
    </span>
  );
}

function Star({ size, fill }: { size: number; fill: number }) {
  const path =
    "M12 2.5l2.95 6.13 6.55.87-4.78 4.59 1.18 6.5L12 17.6l-6.0 2.99 1.18-6.5L2.5 9.5l6.55-.87L12 2.5z";
  const id = `clip-${Math.random().toString(36).slice(2, 9)}`;
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

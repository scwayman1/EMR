import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Compact star rating. Renders 5 stars with the filled portion clipped to
 * the fractional rating, plus an optional review count. Pure / SSR-safe.
 */
export function StarRating({
  rating,
  reviewCount,
  size = 14,
  className,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex" aria-hidden="true">
        <span className="flex text-border-strong">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} width={size} height={size} className="fill-current" />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-[color:var(--highlight)]"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} width={size} height={size} className="fill-current shrink-0" />
          ))}
        </span>
      </span>
      <span className="text-[12px] tabular-nums text-text-muted">
        {clamped.toFixed(1)}
        {typeof reviewCount === "number" && (
          <span className="text-text-subtle"> ({reviewCount.toLocaleString()})</span>
        )}
      </span>
      <span className="sr-only">
        {clamped.toFixed(1)} out of 5 stars
        {typeof reviewCount === "number" ? `, ${reviewCount} reviews` : ""}
      </span>
    </span>
  );
}

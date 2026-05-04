import { cn } from "@/lib/utils/cn";

// EMR-277 — Cannabis-leaf rating glyph used across the marketplace.
// Five filled or hollow leaves stand in for the legacy stars; the
// component name `RatingStars` is preserved so existing imports keep
// working.

interface RatingStarsProps {
  rating: number;
  count?: number;
  className?: string;
}

export function RatingStars({ rating, count, className }: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const fullLeaves = Math.round(clamped);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className="text-sm text-[color:var(--leaf,#3f8a3a)]"
        aria-label={`${clamped} out of 5 leaves`}
      >
        {Array.from({ length: 5 }, (_, i) => (i < fullLeaves ? "🌿" : "·")).join(" ")}
      </span>
      {typeof count === "number" && (
        <span className="text-xs text-text-subtle">({count})</span>
      )}
    </span>
  );
}

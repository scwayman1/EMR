import { cn } from "@/lib/utils/cn";

interface RatingStarsProps {
  rating: number;
  count?: number;
  className?: string;
}

export function RatingStars({ rating, count, className }: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(5, rating));
  const fullStars = Math.round(clamped);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="text-sm text-warning" aria-label={`${clamped} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, i) =>
          i < fullStars ? "\u2605" : "\u2606"
        ).join("")}
      </span>
      {typeof count === "number" && (
        <span className="text-xs text-text-subtle">({count})</span>
      )}
    </span>
  );
}

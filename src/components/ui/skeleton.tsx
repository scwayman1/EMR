import { cn } from "@/lib/utils/cn";

/**
 * Shimmer-based skeleton placeholder. Used in loading.tsx files
 * across the operator dashboards.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}

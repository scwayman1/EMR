import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * TileGrid — a responsive CSS grid sized for the Command Center.
 *
 * Three columns on desktop, two on tablet, one on mobile. Tiles size
 * themselves via their `span` prop; the grid just provides the track.
 * Row height is generous so 1x1 tiles feel substantial rather than
 * cramped.
 */

export function TileGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
        "auto-rows-[minmax(180px,auto)]",
        className
      )}
    >
      {children}
    </div>
  );
}

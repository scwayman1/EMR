"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { useDensity, densityClass } from "@/lib/ui/density";

/**
 * Thin client wrapper that toggles a density class on the
 * communications-hub channel card grid so each Card's children pick up
 * the tighter padding via the descendant selectors in `kpi-card.tsx`
 * pattern, plus the `--density-card-gap` variable for inter-card spacing.
 */
export function ChannelsDensityFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const { density } = useDensity();
  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-3 density-grid mb-8",
        densityClass(density),
      )}
    >
      {children}
    </div>
  );
}

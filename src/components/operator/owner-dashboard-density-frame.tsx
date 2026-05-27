"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { useDensity, densityClass } from "@/lib/ui/density";

/**
 * Thin client wrapper so the otherwise-server-only OwnerDashboard can
 * adopt the user's Comfortable/Dense preference without forcing the
 * whole tree (and its KpiCard children) to become client components.
 *
 * Just toggles a density class on the grid container; the KpiCard
 * descendant selector `[.density-dense_&]` in `kpi-card.tsx` handles
 * the actual padding swap.
 */
export function OwnerDashboardDensityFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const { density } = useDensity();
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 density-grid",
        densityClass(density),
      )}
    >
      {children}
    </div>
  );
}

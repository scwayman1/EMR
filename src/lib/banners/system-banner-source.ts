"use client";

/**
 * system-banner-source.ts — single hook that resolves the set of active
 * system banners for the current surface.
 *
 * v1 derives strictly from `src/lib/banners/config.ts`. The hook is shaped
 * around a future swap to `/api/status` (PR #479 follow-up):
 *
 *   useActiveSystemBanners({ surface }) ->
 *     1. Filter SYSTEM_BANNERS by `enabled`.
 *     2. Filter by surface (if a banner declares a `surfaces` allowlist).
 *     3. Filter by active time window (`startsAt` / `endsAt`).
 *     4. TODO(PR #479 follow-up): merge in system-health banners
 *        derived from `/api/status` when overall state !== "operational".
 *
 * The hook is intentionally synchronous + dependency-free for v1 so it
 * can render in any client component without a Suspense boundary.
 */

import { useMemo } from "react";
import {
  SYSTEM_BANNERS,
  type SystemBannerConfig,
} from "./config";

export type ActiveBannerSurface = "clinician" | "operator" | "super-admin";

export interface UseActiveSystemBannersOptions {
  /** Which mount surface is asking. Used to gate `surfaces` allowlists. */
  surface: ActiveBannerSurface;
  /**
   * Optional clock override for testing. Defaults to `Date.now()`. The
   * hook does not subscribe to a clock tick — banners cross their
   * start/end window on the next render rather than on the wall clock.
   */
  now?: number;
}

function isWithinWindow(b: SystemBannerConfig, now: number): boolean {
  if (b.startsAt) {
    const start = Date.parse(b.startsAt);
    if (Number.isFinite(start) && now < start) return false;
  }
  if (b.endsAt) {
    const end = Date.parse(b.endsAt);
    if (Number.isFinite(end) && now > end) return false;
  }
  return true;
}

function matchesSurface(
  b: SystemBannerConfig,
  surface: ActiveBannerSurface,
): boolean {
  if (!b.surfaces || b.surfaces.length === 0) return true;
  return b.surfaces.includes(surface);
}

/**
 * Returns the banners that should render right now for `surface`.
 * Stable identity across renders when inputs are unchanged.
 */
export function useActiveSystemBanners({
  surface,
  now,
}: UseActiveSystemBannersOptions): readonly SystemBannerConfig[] {
  return useMemo(() => {
    const ts = now ?? Date.now();
    return SYSTEM_BANNERS.filter(
      (b) => b.enabled && matchesSurface(b, surface) && isWithinWindow(b, ts),
    );
  }, [surface, now]);
}

/**
 * Server-friendly variant — same filter logic, but callable from a server
 * component or a server action. Mirrors the hook signature so a future
 * swap to `/api/status` can be slotted in here without touching callers.
 */
export function getActiveSystemBanners(
  options: UseActiveSystemBannersOptions,
): readonly SystemBannerConfig[] {
  const ts = options.now ?? Date.now();
  return SYSTEM_BANNERS.filter(
    (b) =>
      b.enabled && matchesSurface(b, options.surface) && isWithinWindow(b, ts),
  );
}

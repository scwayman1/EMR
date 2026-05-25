"use client";

/**
 * useDensity — single source of truth for the Comfortable / Dense UI mode.
 *
 * Reads/writes `localStorage.emr.prefs.v1.density` (same key as the
 * preferences screen in `src/app/(clinician)/settings/preferences/`).
 *
 * Cross-tab/in-tab sync:
 *   - `storage` events: native cross-tab.
 *   - Custom DOM event `emr:density-change`: dispatched on every setter,
 *     so other consumers in the SAME tab pick up changes immediately
 *     (the native `storage` event does NOT fire in the originating tab).
 *
 * SSR-safe: defaults to "comfortable" until first useEffect runs.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Density = "comfortable" | "dense";

export const DENSITY_STORAGE_KEY = "emr.prefs.v1.density"; // gitleaks:allow
const DENSITY_EVENT = "emr:density-change";

function isDensity(v: unknown): v is Density {
  return v === "comfortable" || v === "dense";
}

function readDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  try {
    const v = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return isDensity(v) ? v : "comfortable";
  } catch {
    return "comfortable";
  }
}

function writeDensity(next: Density): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
  } catch {
    // Safari private mode etc. — silently no-op.
  }
  try {
    window.dispatchEvent(
      new CustomEvent<Density>(DENSITY_EVENT, { detail: next }),
    );
  } catch {
    // Ancient browsers — sync still happens on next render.
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === DENSITY_STORAGE_KEY) callback();
  };
  const onCustom = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(DENSITY_EVENT, onCustom as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DENSITY_EVENT, onCustom as EventListener);
  };
}

function getServerSnapshot(): Density {
  return "comfortable";
}

/**
 * Subscribe to the persisted density preference.
 *
 * - `density` updates whenever localStorage is mutated (here, in another
 *   tab via `storage`, or anywhere via the custom event).
 * - `setDensity(next)` persists + broadcasts.
 */
export function useDensity(): {
  density: Density;
  setDensity: (next: Density) => void;
} {
  const density = useSyncExternalStore(subscribe, readDensity, getServerSnapshot);

  const setDensity = useCallback((next: Density) => {
    writeDensity(next);
  }, []);

  // Keep <html data-density> mirrored so global CSS can hook on it if it
  // wants to (preferences page already does this on its own mount, but
  // any other route that hydrates first should also reflect the choice).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  return { density, setDensity };
}

/**
 * Resolve a class name for a container that should adopt density.
 * Pass to `cn()` alongside your other classes.
 */
export function densityClass(density: Density): string {
  return density === "dense" ? "density-dense" : "density-comfortable";
}

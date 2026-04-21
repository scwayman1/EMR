"use client";

import * as React from "react";
import {
  PINS_STORAGE_KEY,
  RECENT_STORAGE_KEY,
  addPin,
  parsePins,
  parseRecents,
  recordVisit,
  removePin,
  reorderPin,
  type PinnedEntry,
  type RecentEntry,
  type ReorderDirection,
} from "@/lib/domain/nav-prefs";

/**
 * Client-side nav personalization state. Lives entirely in localStorage —
 * no server round-trip, no cookies. SSR-safe: initial render is always
 * empty, then the first client effect hydrates from storage.
 *
 *   pins        — pinned routes, user-ordered (new pins land at top), cap 8.
 *   recents     — last 5 distinct visited routes, newest first.
 *   pin/unpin   — mutate pins by href.
 *   movePin     — shift a pin one slot up or down.
 *   isPinned    — cheap lookup for star-toggle state.
 *   visit       — record a route visit (used by NavVisitTracker).
 *   clearAll    — nuke both lists + their storage keys (Manage action).
 *
 * Writes are debounced 250ms so rapid toggles don't hammer localStorage.
 */

export interface NavPrefsValue {
  pins: PinnedEntry[];
  recents: RecentEntry[];
  pin: (entry: { href: string; label: string }) => void;
  unpin: (href: string) => void;
  movePin: (href: string, direction: ReorderDirection) => void;
  isPinned: (href: string) => boolean;
  visit: (entry: { href: string; label: string }) => void;
  clearAll: () => void;
  hydrated: boolean;
}

const NavPrefsCtx = React.createContext<NavPrefsValue | null>(null);

const WRITE_DEBOUNCE_MS = 250;

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — non-fatal */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

export function NavPrefsProvider({ children }: { children: React.ReactNode }) {
  const [pins, setPins] = React.useState<PinnedEntry[]>([]);
  const [recents, setRecents] = React.useState<RecentEntry[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  // Read-once on mount. Malformed / missing payloads become [].
  React.useEffect(() => {
    setPins(parsePins(safeGet(PINS_STORAGE_KEY)));
    setRecents(parseRecents(safeGet(RECENT_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  // Debounced writes — one timer per key, reset on each change.
  const pinsTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentsTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!hydrated) return;
    if (pinsTimer.current) clearTimeout(pinsTimer.current);
    pinsTimer.current = setTimeout(() => {
      safeSet(PINS_STORAGE_KEY, JSON.stringify(pins));
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (pinsTimer.current) clearTimeout(pinsTimer.current);
    };
  }, [pins, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (recentsTimer.current) clearTimeout(recentsTimer.current);
    recentsTimer.current = setTimeout(() => {
      safeSet(RECENT_STORAGE_KEY, JSON.stringify(recents));
    }, WRITE_DEBOUNCE_MS);
    return () => {
      if (recentsTimer.current) clearTimeout(recentsTimer.current);
    };
  }, [recents, hydrated]);

  const pin = React.useCallback(
    (entry: { href: string; label: string }) => {
      setPins((prev) => addPin(prev, entry));
    },
    [],
  );

  const unpin = React.useCallback((href: string) => {
    setPins((prev) => removePin(prev, href));
  }, []);

  const movePin = React.useCallback(
    (href: string, direction: ReorderDirection) => {
      setPins((prev) => reorderPin(prev, href, direction));
    },
    [],
  );

  const visit = React.useCallback((entry: { href: string; label: string }) => {
    setRecents((prev) => recordVisit(prev, entry));
  }, []);

  const clearAll = React.useCallback(() => {
    setPins([]);
    setRecents([]);
    safeRemove(PINS_STORAGE_KEY);
    safeRemove(RECENT_STORAGE_KEY);
  }, []);

  // isPinned is recomputed from `pins`; Set membership keeps toggles O(1).
  const pinnedHrefs = React.useMemo(
    () => new Set(pins.map((p) => p.href)),
    [pins],
  );
  const isPinned = React.useCallback(
    (href: string) => pinnedHrefs.has(href),
    [pinnedHrefs],
  );

  const value = React.useMemo<NavPrefsValue>(
    () => ({
      pins,
      recents,
      pin,
      unpin,
      movePin,
      isPinned,
      visit,
      clearAll,
      hydrated,
    }),
    [pins, recents, pin, unpin, movePin, isPinned, visit, clearAll, hydrated],
  );

  return <NavPrefsCtx.Provider value={value}>{children}</NavPrefsCtx.Provider>;
}

/**
 * Read the nav-prefs context. Returns null outside the provider so callers
 * can gracefully degrade (e.g. server-rendered sub-trees).
 */
export function useNavPrefs(): NavPrefsValue | null {
  return React.useContext(NavPrefsCtx);
}

/**
 * Strict form — throws when used outside the provider. Prefer this in
 * client components that always render inside the AppShell tree.
 */
export function useNavPrefsStrict(): NavPrefsValue {
  const ctx = React.useContext(NavPrefsCtx);
  if (!ctx) {
    throw new Error("useNavPrefsStrict must be used inside <NavPrefsProvider>");
  }
  return ctx;
}

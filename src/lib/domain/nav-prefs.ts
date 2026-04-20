/**
 * Pure helpers for the sidebar's Pinned + Recent personalization strips.
 *
 * Both collections are persisted to localStorage (see keys below). These
 * helpers are framework-free so they can be exercised by the node-only
 * vitest suite; the React provider (`NavPrefsContext`) composes them with
 * SSR-safe hydration + debounced writes.
 *
 *   PinnedEntry    — route the user explicitly starred. Dedup by href, bump
 *                    to top on re-pin, cap at 8.
 *   RecentEntry    — last N visited distinct routes, newest first, cap at 5.
 *
 * Caps are low intentionally: the Pinned + Recent surfaces sit above the
 * pillar nav and should not become a wall of links. Pins grow to 8; recents
 * stay at 5.
 */

export interface PinnedEntry {
  href: string;
  label: string;
  pinnedAt: number;
}

export interface RecentEntry {
  href: string;
  label: string;
  visitedAt: number;
}

export const PINS_STORAGE_KEY = "nav:pins:v1";
export const RECENT_STORAGE_KEY = "nav:recent:v1";

export const PINS_MAX = 8;
export const RECENT_MAX = 5;

/**
 * Add a pin, deduping by href. If the href is already pinned, the entry is
 * bumped to the top with a refreshed `pinnedAt` timestamp. Capped at
 * `PINS_MAX` — oldest entries fall off the tail.
 */
export function addPin(
  current: PinnedEntry[],
  entry: Omit<PinnedEntry, "pinnedAt">,
  now: number = Date.now(),
): PinnedEntry[] {
  const next: PinnedEntry = {
    href: entry.href,
    label: entry.label,
    pinnedAt: now,
  };
  const filtered = current.filter((p) => p.href !== entry.href);
  return [next, ...filtered].slice(0, PINS_MAX);
}

/**
 * Remove a pin by href. No-op when the href is not present — returns the
 * same reference so React consumers can skip re-renders cheaply.
 */
export function removePin(current: PinnedEntry[], href: string): PinnedEntry[] {
  const hit = current.some((p) => p.href === href);
  if (!hit) return current;
  return current.filter((p) => p.href !== href);
}

/**
 * Record a route visit in the recents list. Dedups by href and keeps the
 * newest visit first. Capped at `RECENT_MAX`.
 */
export function recordVisit(
  current: RecentEntry[],
  entry: Omit<RecentEntry, "visitedAt">,
  now: number = Date.now(),
): RecentEntry[] {
  const next: RecentEntry = {
    href: entry.href,
    label: entry.label,
    visitedAt: now,
  };
  const filtered = current.filter((r) => r.href !== entry.href);
  return [next, ...filtered].slice(0, RECENT_MAX);
}

/**
 * Parse a localStorage string payload into a typed PinnedEntry[]. Silently
 * returns [] on any parse error or shape mismatch. Per-entry invalid items
 * are stripped but valid siblings are preserved.
 */
export function parsePins(raw: string | null): PinnedEntry[] {
  if (!raw) return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];
  const out: PinnedEntry[] = [];
  for (const v of decoded) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as PinnedEntry).href === "string" &&
      typeof (v as PinnedEntry).label === "string" &&
      typeof (v as PinnedEntry).pinnedAt === "number"
    ) {
      out.push({
        href: (v as PinnedEntry).href,
        label: (v as PinnedEntry).label,
        pinnedAt: (v as PinnedEntry).pinnedAt,
      });
    }
  }
  return out.slice(0, PINS_MAX);
}

/**
 * Parse a localStorage string payload into a typed RecentEntry[]. Same
 * contract as `parsePins` — silent strip on failure.
 */
export function parseRecents(raw: string | null): RecentEntry[] {
  if (!raw) return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];
  const out: RecentEntry[] = [];
  for (const v of decoded) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as RecentEntry).href === "string" &&
      typeof (v as RecentEntry).label === "string" &&
      typeof (v as RecentEntry).visitedAt === "number"
    ) {
      out.push({
        href: (v as RecentEntry).href,
        label: (v as RecentEntry).label,
        visitedAt: (v as RecentEntry).visitedAt,
      });
    }
  }
  return out.slice(0, RECENT_MAX);
}

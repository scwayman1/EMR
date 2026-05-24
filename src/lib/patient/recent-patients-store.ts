"use client";

/**
 * Per-user, versioned localStorage store for the "recently viewed patients"
 * strip + quick-jump picker. Distinct from the older sidebar tracker in
 * `src/components/shell/recent-patients.tsx` — that one keeps a flat,
 * un-versioned list of 5 names with no pins or avatars; this one carries
 * avatar URLs, pin state, viewedAt timestamps, and is keyed by user so a
 * shared workstation never bleeds one clinician's recents into another's.
 *
 * Storage shape (JSON under `emr.recents.patients.v1.<userId>`):
 *   { version: 1, items: RecentPatient[] }
 *
 * Order: pinned-first (in pin order), then unpinned newest-first.
 * Caps: MAX_PINS = 3, MAX_TOTAL = 12 (strip shows 8 + headroom for pins).
 */

export const RECENTS_VERSION = 1;
export const MAX_PINS = 3;
export const MAX_TOTAL = 12;
export const STRIP_VISIBLE = 8;
/** Skip duplicate writes within this many ms — prevents re-render churn. */
export const DEDUPE_MS = 30_000;
/** Custom event name the strip listens on for same-tab updates. */
export const UPDATE_EVENT = "emr:recents:patients:updated";

export interface RecentPatient {
  id: string;
  name: string;
  avatarUrl: string | null;
  viewedAt: number;
  /** When pinned: position in the pin ordering (smaller = leftmost). */
  pinnedAt: number | null;
}

function storageKey(userId: string): string {
  // Anonymous / unauthed fallback so SSR rendering doesn't blow up.
  const safe = userId && userId.length > 0 ? userId : "anon";
  return `emr.recents.patients.v${RECENTS_VERSION}.${safe}`;
}

function safeRead(userId: string): RecentPatient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== RECENTS_VERSION ||
      !Array.isArray(parsed.items)
    ) {
      return [];
    }
    return parsed.items.filter(
      (it: unknown): it is RecentPatient =>
        !!it &&
        typeof it === "object" &&
        typeof (it as RecentPatient).id === "string" &&
        typeof (it as RecentPatient).name === "string" &&
        typeof (it as RecentPatient).viewedAt === "number",
    );
  } catch {
    return [];
  }
}

function safeWrite(userId: string, items: RecentPatient[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ version: RECENTS_VERSION, items }),
    );
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  } catch {
    /* quota / private mode — silently skip */
  }
}

/**
 * Sort: pinned first by `pinnedAt` ascending (older pins to the left),
 * then unpinned by `viewedAt` descending (most recent first).
 */
function sortRecents(items: RecentPatient[]): RecentPatient[] {
  return [...items].sort((a, b) => {
    if (a.pinnedAt && b.pinnedAt) return a.pinnedAt - b.pinnedAt;
    if (a.pinnedAt) return -1;
    if (b.pinnedAt) return 1;
    return b.viewedAt - a.viewedAt;
  });
}

/**
 * Push a fresh view to the front of the recents list. If the patient was
 * viewed within `DEDUPE_MS`, this is a no-op (prevents re-render duplicates).
 */
export function recordPatientView(
  userId: string,
  patientId: string,
  name: string,
  avatarUrl: string | null = null,
): void {
  if (!patientId || !name) return;
  const current = safeRead(userId);
  const existing = current.find((p) => p.id === patientId);
  const now = Date.now();
  if (existing && now - existing.viewedAt < DEDUPE_MS) return;

  const withoutThis = current.filter((p) => p.id !== patientId);
  const next: RecentPatient = {
    id: patientId,
    name,
    avatarUrl: avatarUrl ?? existing?.avatarUrl ?? null,
    viewedAt: now,
    pinnedAt: existing?.pinnedAt ?? null,
  };

  // Pinned entries are preserved verbatim except for the just-viewed one.
  const merged = sortRecents([...withoutThis, next]).slice(0, MAX_TOTAL);
  safeWrite(userId, merged);
}

export function readRecents(userId: string): RecentPatient[] {
  return sortRecents(safeRead(userId));
}

/**
 * Toggle pin state for a patient already in the list. Caps the total
 * pinned count at MAX_PINS — calling pin on a 4th patient is a no-op.
 */
export function togglePin(userId: string, patientId: string): void {
  const current = safeRead(userId);
  const idx = current.findIndex((p) => p.id === patientId);
  if (idx < 0) return;
  const target = current[idx];
  if (!target) return;

  const isPinned = target.pinnedAt !== null;
  if (!isPinned) {
    const pinnedCount = current.filter((p) => p.pinnedAt !== null).length;
    if (pinnedCount >= MAX_PINS) return; // honor cap silently
  }

  const updated: RecentPatient = {
    ...target,
    pinnedAt: isPinned ? null : Date.now(),
  };
  const next = sortRecents([
    ...current.slice(0, idx),
    updated,
    ...current.slice(idx + 1),
  ]);
  safeWrite(userId, next);
}

/**
 * Remove a patient from the recents list entirely.
 * Used by the strip's "unpin and dismiss" affordance (chip X when unpinned).
 */
export function removeRecent(userId: string, patientId: string): void {
  const next = safeRead(userId).filter((p) => p.id !== patientId);
  safeWrite(userId, next);
}

/** Friendly relative-time label suitable for chip subtitles. */
export function formatChipTimestamp(viewedAt: number, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - viewedAt);
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(viewedAt).toLocaleDateString();
}

/** Convenience helper to subscribe to storage changes for a given user. */
export function subscribeToRecents(
  userId: string,
  cb: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const sameTab = () => cb();
  const crossTab = (e: StorageEvent) => {
    if (e.key === storageKey(userId)) cb();
  };
  window.addEventListener(UPDATE_EVENT, sameTab);
  window.addEventListener("storage", crossTab);
  return () => {
    window.removeEventListener(UPDATE_EVENT, sameTab);
    window.removeEventListener("storage", crossTab);
  };
}

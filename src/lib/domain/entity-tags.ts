// ---------------------------------------------------------------------------
// entity-tags — lightweight localStorage tag store for non-Patient surfaces.
//
// Patient tags already have a typed model in `patient-tags.ts` (and will be
// promoted to a Prisma table per EMR-684). This helper covers the rest of the
// surfaces that the tag-system UX touches today — smart-inbox threads, chart
// tasks, broadcast campaigns — without paying for new schema migrations.
//
// TODO(EMR-684 follow-up): when the PatientTag / EntityTag Prisma model lands,
// replace these client-only reads/writes with server actions. Until then this
// keeps the UX honest and discoverable across reloads of the same device.
// ---------------------------------------------------------------------------

import type { Tag } from "@/components/ui/tag-input";

const STORAGE_VERSION = "v1";

export type EntityTagScope =
  | "inbox-thread"
  | "chart-task"
  | "broadcast-campaign";

function storageKey(scope: EntityTagScope, entityId: string): string {
  return `entity-tags:${STORAGE_VERSION}:${scope}:${entityId}`;
}

/** Read tags for one entity. Returns [] when SSR / storage unavailable. */
export function readTags(scope: EntityTagScope, entityId: string): Tag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(scope, entityId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Tag =>
        !!t && typeof t === "object" && "label" in t && "color" in t,
    );
  } catch {
    return [];
  }
}

/** Write tags for one entity. Silent on storage failure (private mode etc.). */
export function writeTags(scope: EntityTagScope, entityId: string, tags: Tag[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(scope, entityId), JSON.stringify(tags));
  } catch {
    /* ignore */
  }
}

/**
 * Default suggestion pool per scope. Tuned to what clinicians actually call
 * these things in the channel — short, lowercase, color-coded.
 */
export const SUGGESTED_TAGS: Record<EntityTagScope, Tag[]> = {
  "inbox-thread": [
    { label: "follow-up", color: "blue" },
    { label: "urgent", color: "red" },
    { label: "billing", color: "amber" },
    { label: "refill", color: "teal" },
    { label: "lab result", color: "purple" },
    { label: "new patient", color: "emerald" },
  ],
  "chart-task": [
    { label: "priority", color: "red" },
    { label: "this week", color: "amber" },
    { label: "delegated", color: "purple" },
    { label: "blocked", color: "gray" },
    { label: "research", color: "teal" },
  ],
  "broadcast-campaign": [
    { label: "education", color: "blue" },
    { label: "marketing", color: "rose" },
    { label: "compliance", color: "purple" },
    { label: "wellness", color: "emerald" },
    { label: "operational", color: "gray" },
  ],
};

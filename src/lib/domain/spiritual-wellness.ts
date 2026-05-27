/**
 * Spiritual Wellness — EMR-095
 *
 * The Spiritual category on the Lifestyle tab tracks five sub-domains
 * that together feed the Spiritual pillar of EMR-093 (Four Pillars of Health):
 *
 *   1. Higher-power / faith practice
 *   2. Charity work & donations
 *   3. Time with family & friends
 *   4. Meditation, prayer, or reflection
 *   5. Nature / outdoor time
 *
 * Each sub-domain is a simple weekly checkbox + count. The score (0–100)
 * is the percentage of the weekly target hit across all five sub-domains.
 *
 * Storage: weekly entries are persisted in localStorage under
 * `spiritual-wellness-${patientId}-${isoWeek}`. The schema is intentionally
 * narrow so we can move it to Prisma later without rewriting the UI.
 */

export type SpiritualSubdomain =
  | "higher_power"
  | "charity"
  | "family_friends"
  | "meditation"
  | "nature";

export interface SpiritualSubdomainDef {
  id: SpiritualSubdomain;
  label: string;
  emoji: string;
  description: string;
  /** Weekly target — what counts as "fully met" for the pillar score. */
  weeklyTarget: number;
  /** Unit shown next to the count, e.g. "sessions", "hours", "visits". */
  unit: string;
}

export const SPIRITUAL_SUBDOMAINS: SpiritualSubdomainDef[] = [
  {
    id: "higher_power",
    label: "Higher-power connection",
    emoji: "\u{1F64F}",
    description: "Faith practice, prayer, or moments of awe.",
    weeklyTarget: 5,
    unit: "days",
  },
  {
    id: "charity",
    label: "Charity & service",
    emoji: "\u{1F49D}",
    description: "Time, money, or skill given to a cause.",
    weeklyTarget: 1,
    unit: "acts",
  },
  {
    id: "family_friends",
    label: "Family & friends",
    emoji: "\u{1F46A}",
    description: "Intentional time with people who matter.",
    weeklyTarget: 3,
    unit: "visits",
  },
  {
    id: "meditation",
    label: "Meditation / prayer",
    emoji: "\u{1F9D8}",
    description: "Quiet, reflective practice.",
    weeklyTarget: 5,
    unit: "sessions",
  },
  {
    id: "nature",
    label: "Nature & outdoors",
    emoji: "\u{1F332}",
    description: "Outdoor time without a phone.",
    weeklyTarget: 4,
    unit: "outings",
  },
];

export interface SpiritualWeekEntry {
  /** ISO week key, e.g. "2026-W17". */
  weekKey: string;
  counts: Record<SpiritualSubdomain, number>;
  notes?: string;
  updatedAt: string;
}

export function emptyWeek(weekKey: string): SpiritualWeekEntry {
  return {
    weekKey,
    counts: {
      higher_power: 0,
      charity: 0,
      family_friends: 0,
      meditation: 0,
      nature: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

/** ISO 8601 week key for a given date — matches what most calendars show. */
export function isoWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday-of-current-week trick — ISO weeks belong to the year of their Thursday.
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Compute the spiritual pillar score for a given week — 0 to 100.
 * Each sub-domain contributes equally; per-sub-domain progress is capped
 * at 100% so over-achievers don't drown out a missed sub-domain.
 */
export function spiritualScore(entry: SpiritualWeekEntry): number {
  const ratios = SPIRITUAL_SUBDOMAINS.map((s) => {
    const target = Math.max(1, s.weeklyTarget);
    const count = entry.counts[s.id] ?? 0;
    return Math.min(1, count / target);
  });
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.round(avg * 100);
}

export const SPIRITUAL_STORAGE_PREFIX = "spiritual-wellness-";

export function spiritualStorageKey(patientId: string, weekKey: string) {
  return `${SPIRITUAL_STORAGE_PREFIX}${patientId}-${weekKey}`;
}

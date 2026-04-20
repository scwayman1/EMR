// Patient Streaks — gamified consistency rewards
// Earned for consistent dose logging, outcome reporting, etc.
//
// Dr. Patel directive (CLAUDE.md "Fun > friction"): data capture must feel
// like a game. Streaks are the primary loop — each qualifying activity on a
// new calendar day extends the streak; a missed day resets it. Multiple
// activities on the same day do NOT double-count.

export type StreakType = "dose_log" | "outcome_check" | "journal" | "assessment";

/**
 * The "kind" of activity a StreakRecord tracks. This is the canonical set
 * surfaced to patients on the gamified summary card and used as the unique
 * key on the Prisma StreakRecord row ({patientId, activityKind}).
 *
 * - "dose_log"        — patient logged taking a cannabis dose
 * - "emoji_checkin"   — post-dose emoji sentiment capture
 * - "weekly_outcome"  — weekly 1-10 outcome scale submission
 */
export type StreakActivityKind = "dose_log" | "emoji_checkin" | "weekly_outcome";

export const STREAK_ACTIVITY_KINDS: readonly StreakActivityKind[] = [
  "dose_log",
  "emoji_checkin",
  "weekly_outcome",
] as const;

/**
 * Human-facing metadata for each streak kind. Kept colocated with the
 * domain type so UI components don't have to rebuild these mappings.
 */
export const STREAK_LABELS: Record<StreakActivityKind, { title: string; emoji: string }> = {
  dose_log: { title: "Dose log", emoji: "🌿" },
  emoji_checkin: { title: "Feel-check", emoji: "😊" },
  weekly_outcome: { title: "Weekly outcome", emoji: "📊" },
};

export interface Streak {
  type: StreakType;
  currentCount: number;
  longestCount: number;
  lastEntryAt: string;
  startedAt: string;
}

/**
 * Per-patient, per-activity streak row. Mirrors the Prisma `StreakRecord`
 * model 1:1 so server code can round-trip without mapping.
 *
 * Dates are JS `Date` in-memory. `lastActivityDate` is the UTC calendar day
 * (midnight-normalized) of the most recent advance — we deliberately do NOT
 * store the clock time, because that's what makes "same-day multiple
 * activities don't increment" trivial.
 */
export interface StreakRecord {
  patientId: string;
  activityKind: StreakActivityKind;
  currentStreakDays: number;
  longestStreakDays: number;
  /**
   * UTC midnight of the last day this streak was advanced. `null` for a
   * freshly-created record that has never seen an activity.
   */
  lastActivityDate: Date | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  threshold: number;
  streakType: StreakType;
  tier: "bronze" | "silver" | "gold" | "platinum";
}

export const ACHIEVEMENTS: Achievement[] = [
  // Dose logging
  { id: "dose-3", title: "Three in a row", description: "Logged doses 3 days in a row", emoji: "🌱", threshold: 3, streakType: "dose_log", tier: "bronze" },
  { id: "dose-7", title: "Week warrior", description: "Logged doses 7 days in a row", emoji: "🌿", threshold: 7, streakType: "dose_log", tier: "silver" },
  { id: "dose-30", title: "Full month", description: "Logged doses every day for a month", emoji: "🌳", threshold: 30, streakType: "dose_log", tier: "gold" },
  { id: "dose-90", title: "Quarter master", description: "90 days of consistent tracking", emoji: "👑", threshold: 90, streakType: "dose_log", tier: "platinum" },

  // Outcome check-ins
  { id: "outcome-7", title: "Mindful week", description: "Checked in on how you feel 7 times", emoji: "😊", threshold: 7, streakType: "outcome_check", tier: "bronze" },
  { id: "outcome-30", title: "Self-aware", description: "30 outcome check-ins", emoji: "🧘", threshold: 30, streakType: "outcome_check", tier: "silver" },

  // Journal
  { id: "journal-7", title: "Reflector", description: "Wrote in your journal 7 times", emoji: "📖", threshold: 7, streakType: "journal", tier: "bronze" },
  { id: "journal-30", title: "Storyteller", description: "30 journal entries", emoji: "✨", threshold: 30, streakType: "journal", tier: "silver" },

  // Assessments
  { id: "assessment-complete", title: "Well-assessed", description: "Completed your first full assessment", emoji: "✅", threshold: 1, streakType: "assessment", tier: "bronze" },
];

export const TIER_COLORS: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-700 border-orange-300",
  silver: "bg-gray-100 text-gray-700 border-gray-300",
  gold: "bg-amber-100 text-amber-700 border-amber-400",
  platinum: "bg-purple-100 text-purple-700 border-purple-400",
};

// ────────────────────────────────────────────────────────────────────────
// Day math
// ────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/**
 * Truncate a `Date` to its UTC midnight. Equality on the resulting Date
 * reliably answers "is this the same calendar day?" regardless of what
 * clock time either input had.
 *
 * We use UTC — not local time — because server processes can run in any
 * timezone and we must not let a deploy region flip a patient's "today".
 * Patient-local display should convert on the way out to the browser.
 */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole-day difference between two midnight-normalized UTC dates. */
function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

// ────────────────────────────────────────────────────────────────────────
// State transitions
// ────────────────────────────────────────────────────────────────────────

/**
 * Apply a new activity to a streak record and return the next state.
 *
 * Rules:
 *   1. First ever activity  →  current = 1, longest = max(longest, 1)
 *   2. Same UTC day as last →  no change (multiple activities per day don't
 *                              double-count — matches Dr. Patel's anti-
 *                              gaming stance)
 *   3. Next UTC day         →  current += 1, longest = max(longest, current)
 *   4. Skipped ≥ 1 day      →  current = 1 (reset), longest preserved
 *
 * The function is pure: it never mutates `record`. Server callers persist
 * the returned value via Prisma upsert.
 */
export function advanceStreak(record: StreakRecord, activityAt: Date): StreakRecord {
  const activityDay = startOfUtcDay(activityAt);

  // First ever activity for this (patient, kind).
  if (!record.lastActivityDate) {
    return {
      ...record,
      currentStreakDays: 1,
      longestStreakDays: Math.max(record.longestStreakDays, 1),
      lastActivityDate: activityDay,
    };
  }

  const lastDay = startOfUtcDay(record.lastActivityDate);
  const gap = daysBetween(activityDay, lastDay);

  // Same calendar day — no advance, no reset. Idempotent.
  if (gap === 0) {
    return { ...record, lastActivityDate: lastDay };
  }

  // Activity logged with a timestamp *before* the stored lastActivityDate
  // (out-of-order write, clock skew, backfill). We refuse to rewind the
  // streak on a stale event; treat as a no-op. The stored state is still
  // authoritative because it represents the newest known activity.
  if (gap < 0) {
    return { ...record, lastActivityDate: lastDay };
  }

  // Next consecutive day — extend.
  if (gap === 1) {
    const nextCurrent = record.currentStreakDays + 1;
    return {
      ...record,
      currentStreakDays: nextCurrent,
      longestStreakDays: Math.max(record.longestStreakDays, nextCurrent),
      lastActivityDate: activityDay,
    };
  }

  // Skipped one or more days — reset.
  return {
    ...record,
    currentStreakDays: 1,
    longestStreakDays: Math.max(record.longestStreakDays, 1),
    lastActivityDate: activityDay,
  };
}

/**
 * `true` if the streak has been advanced on the same UTC day as `now`.
 * Used to decide whether the UI badge should pulse (active-today) or
 * render muted (inactive).
 */
export function isActiveToday(record: StreakRecord, now: Date): boolean {
  if (!record.lastActivityDate) return false;
  const today = startOfUtcDay(now);
  const last = startOfUtcDay(record.lastActivityDate);
  return today.getTime() === last.getTime();
}

/**
 * Create a zeroed StreakRecord for a (patient, kind) that has never had an
 * activity. Convenience for server code constructing upsert inputs.
 */
export function emptyStreakRecord(
  patientId: string,
  activityKind: StreakActivityKind,
): StreakRecord {
  return {
    patientId,
    activityKind,
    currentStreakDays: 0,
    longestStreakDays: 0,
    lastActivityDate: null,
  };
}

// ────────────────────────────────────────────────────────────────────────
// Legacy timestamp-based streak (preserved for existing callers)
// ────────────────────────────────────────────────────────────────────────

/**
 * Compute current streak from a list of entry timestamps.
 * An entry counts toward the streak if it's on a consecutive day.
 */
export function computeStreak(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;

  const dates = timestamps
    .map((t) => new Date(t).toISOString().slice(0, 10))
    .sort()
    .reverse();

  // De-duplicate same-day entries
  const uniqueDates = [...new Set(dates)];

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must start today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }

  return streak;
}

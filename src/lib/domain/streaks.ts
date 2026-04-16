// Patient Streaks — gamified consistency rewards
// Earned for consistent dose logging, outcome reporting, etc.

export type StreakType = "dose_log" | "outcome_check" | "journal" | "assessment";

export interface Streak {
  type: StreakType;
  currentCount: number;
  longestCount: number;
  lastEntryAt: string;
  startedAt: string;
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

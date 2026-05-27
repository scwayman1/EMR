/**
 * Spiritual wellness — lifestyle-tab category (EMR-095)
 *
 * The base sub-domain definitions (faith, charity, family/friends,
 * meditation, nature) live in `@/lib/domain/spiritual-wellness`. This
 * module is the lifestyle-tab adapter:
 *
 *   - shapes a `LifestyleCategory` so the lifestyle tab can render
 *     spiritual wellness alongside Sleep / Nutrition / Movement / etc.
 *   - exposes a curated list of micro-actions (the "do this today" list)
 *   - provides a one-call helper that maps a week entry into the four-
 *     pillars Spiritual score (0–100), keeping the two surfaces in sync.
 *
 * No DB. Pure data + pure functions.
 */

import {
  SPIRITUAL_SUBDOMAINS,
  spiritualScore as baseSpiritualScore,
  type SpiritualSubdomain,
  type SpiritualWeekEntry,
} from "@/lib/domain/spiritual-wellness";

export type SpiritualLifestyleAction = {
  id: string;
  subdomain: SpiritualSubdomain;
  title: string;
  body: string;
  /** Approx minutes the action takes — for the "I have N min" filter. */
  minutes: number;
  /** Whether the action is appropriate for daily repetition. */
  daily: boolean;
};

export const SPIRITUAL_LIFESTYLE_CATEGORY = {
  id: "spiritual",
  label: "Spiritual",
  emoji: "\u{1F54A}\u{FE0F}",
  description:
    "Purpose, gratitude, and connection to something bigger than yourself.",
  color: "#8e44ad",
} as const;

export const SPIRITUAL_LIFESTYLE_ACTIONS: SpiritualLifestyleAction[] = [
  {
    id: "morning-gratitude",
    subdomain: "higher_power",
    title: "Three things you're grateful for",
    body: "Before your phone — write three things, however small. Coffee, sunlight, the kid who slept through.",
    minutes: 2,
    daily: true,
  },
  {
    id: "five-min-prayer",
    subdomain: "higher_power",
    title: "Five quiet minutes",
    body: "Prayer, contemplation, or simply sitting in awe — whatever \"higher power\" means for you.",
    minutes: 5,
    daily: true,
  },
  {
    id: "kind-text",
    subdomain: "charity",
    title: "One kind text",
    body: "Send a short note to one person who'd be glad to hear from you. It costs nothing.",
    minutes: 2,
    daily: true,
  },
  {
    id: "monthly-give",
    subdomain: "charity",
    title: "Give to a cause this month",
    body: "Time, money, or skill — pick one. Service is the most evidence-backed wellbeing intervention.",
    minutes: 30,
    daily: false,
  },
  {
    id: "phoneless-walk",
    subdomain: "nature",
    title: "20-minute phoneless walk",
    body: "Outside, no podcasts, no scroll. Forest bathing measurably drops cortisol.",
    minutes: 20,
    daily: true,
  },
  {
    id: "family-call",
    subdomain: "family_friends",
    title: "Call someone you love",
    body: "Even for ten minutes. Loneliness is a clinical risk factor — connection is the antidote.",
    minutes: 15,
    daily: false,
  },
  {
    id: "meditation-10",
    subdomain: "meditation",
    title: "Ten quiet minutes",
    body: "Eyes closed, breath in, breath out. When the mind wanders, return. The practice is the returning.",
    minutes: 10,
    daily: true,
  },
  {
    id: "purpose-journal",
    subdomain: "meditation",
    title: "What gave today meaning?",
    body: "One sentence at the end of the day. Purpose is protective — it lowers inflammation and improves outcomes.",
    minutes: 3,
    daily: true,
  },
];

/** Compute the lifestyle-tab pillar score from a weekly entry (0–100). */
export function spiritualPillarScoreFromWeek(
  entry: SpiritualWeekEntry,
): number {
  return baseSpiritualScore(entry);
}

/**
 * Daily streak across spiritual actions for a patient — counts a day as
 * "lit" if at least one spiritual sub-domain had any progress that day.
 * Caller passes a flat list of (date, subdomain) tuples.
 */
export function spiritualDailyStreak(
  events: Array<{ date: string; subdomain: SpiritualSubdomain }>,
): number {
  if (events.length === 0) return 0;
  const dayKeys = Array.from(new Set(events.map((e) => e.date))).sort(
    (a, b) => (a < b ? 1 : -1),
  );
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const day of dayKeys) {
    const k = cursor.toISOString().slice(0, 10);
    if (day === k) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (day < k) {
      break;
    }
  }
  return streak;
}

/**
 * Filter the action list by available time.
 * `maxMinutes` of `Infinity` returns all actions.
 */
export function actionsUnder(
  maxMinutes: number,
): SpiritualLifestyleAction[] {
  return SPIRITUAL_LIFESTYLE_ACTIONS.filter((a) => a.minutes <= maxMinutes);
}

/** Find a single action by id — used by the "save for later" interaction. */
export function findSpiritualAction(
  id: string,
): SpiritualLifestyleAction | undefined {
  return SPIRITUAL_LIFESTYLE_ACTIONS.find((a) => a.id === id);
}

/** Re-export the canonical sub-domain list so consumers only need one import. */
export { SPIRITUAL_SUBDOMAINS };
export type { SpiritualSubdomain, SpiritualWeekEntry };

/**
 * Lifestyle checkbox → plant growth (EMR-072)
 *
 * Every time the patient ticks a lifestyle tip from any domain card on
 * the lifestyle tab, the action turns into a "growth event" that can:
 *
 *   1. Bump the patient's plant-health score (small, capped per day)
 *   2. Add a leaf or open a flower if a threshold is crossed
 *   3. Drop a tiny celebration toast in the UI
 *
 * The intent is the inverse of the "you didn't do it, your plant wilts"
 * loop — checking a box is a positive action that visibly grows your plant
 * in real time. This module is pure logic; persistence stays in
 * localStorage on the client until we promote it to Prisma.
 */

import type { LifestyleTip } from "@/lib/domain/lifestyle";

export interface CheckboxGrowthEvent {
  /** Stable id — usually `${domain}:${tipTitleSlug}`. */
  tipId: string;
  domain: string;
  difficulty: LifestyleTip["difficulty"];
  /** ISO timestamp of when the box was checked. */
  at: string;
}

export interface PlantGrowthDelta {
  /** Score delta to apply on top of the base plant-health score (0–100). */
  scoreBoost: number;
  /** Extra leaves to render — clamped to 0…+4. */
  leafBoost: number;
  /** Whether this event should trigger a flower bloom on the next render. */
  triggersFlower: boolean;
  /** Short message to surface in the tip-checked toast. */
  toast: string;
}

const DIFFICULTY_BOOST: Record<LifestyleTip["difficulty"], number> = {
  easy: 1,
  moderate: 2,
  challenging: 3,
};

/** Daily cap so the patient can't farm score by spamming checkboxes. */
export const DAILY_SCORE_CAP = 12;

/** Threshold at which checkbox completions earn a flower. */
export const FLOWER_THRESHOLD_EVENTS = 7;

const STORAGE_KEY_PREFIX = "lifestyle-checkbox-events-";

export function checkboxStorageKey(patientId: string): string {
  return `${STORAGE_KEY_PREFIX}${patientId}`;
}

/** Slugify a tip title into a stable id. */
export function tipIdFor(domain: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${domain}:${slug}`;
}

/**
 * Compute the cumulative growth delta from a list of recent checkbox events.
 * The caller hands us already-loaded events (from localStorage or Prisma).
 */
export function computeGrowthDelta(
  events: CheckboxGrowthEvent[],
): PlantGrowthDelta {
  const today = new Date().toISOString().slice(0, 10);
  const todays = events.filter((e) => e.at.startsWith(today));

  // Today's score boost — capped.
  const rawScore = todays.reduce(
    (sum, e) => sum + DIFFICULTY_BOOST[e.difficulty],
    0,
  );
  const scoreBoost = Math.min(rawScore, DAILY_SCORE_CAP);

  // Leaf boost scales with weekly activity, not daily — so a single
  // strong day doesn't max out the tree.
  const sevenDayCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekly = events.filter((e) => Date.parse(e.at) >= sevenDayCutoff);
  const leafBoost = Math.min(4, Math.floor(weekly.length / 3));

  const triggersFlower = weekly.length >= FLOWER_THRESHOLD_EVENTS;

  return {
    scoreBoost,
    leafBoost,
    triggersFlower,
    toast: buildToast(scoreBoost, leafBoost, triggersFlower),
  };
}

function buildToast(
  scoreBoost: number,
  leafBoost: number,
  triggersFlower: boolean,
): string {
  if (triggersFlower) {
    return "\u{1F33C} A flower opened on your plant.";
  }
  if (leafBoost >= 2) {
    return "\u{1F33F} New leaves are unfurling.";
  }
  if (scoreBoost >= 6) {
    return "\u{1F33F} Big day — your plant looks brighter.";
  }
  return "\u{1F33F} Nice — that fed your plant.";
}

/** Append an event without exceeding a sensible client-side cap. */
export function appendEvent(
  prior: CheckboxGrowthEvent[],
  next: CheckboxGrowthEvent,
  cap = 200,
): CheckboxGrowthEvent[] {
  const list = [...prior, next];
  return list.length > cap ? list.slice(list.length - cap) : list;
}

/** Remove the most recent event with the given tipId — undo support. */
export function uncheckEvent(
  events: CheckboxGrowthEvent[],
  tipId: string,
): CheckboxGrowthEvent[] {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].tipId === tipId) {
      return [...events.slice(0, i), ...events.slice(i + 1)];
    }
  }
  return events;
}

/** True if the tip was checked on the same calendar day. */
export function isCheckedToday(
  events: CheckboxGrowthEvent[],
  tipId: string,
): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return events.some((e) => e.tipId === tipId && e.at.startsWith(today));
}

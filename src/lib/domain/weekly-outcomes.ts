// Weekly Outcome Scales — pure helpers
//
// Dr. Patel Directive surface: "Weekly outcome scales (pain, sleep, anxiety,
// mood — 1-10 with face emojis)". One submission per patient per ISO week,
// anchored to Monday 00:00:00 UTC so that boundaries are deterministic in
// any timezone and data is trivially bucketable for cohort analysis.
//
// These helpers are intentionally I/O free: no Prisma, no Date.now(), no
// request context. The caller passes in "now" (for week math) or a list of
// persisted outcomes (for trend calc). Keeps the unit tests deterministic
// and lets the server action / UI call them from anywhere.

export type OutcomeDimension = "pain" | "sleep" | "anxiety" | "mood";

export type TrendDirection = "improving" | "steady" | "worsening";

export interface WeeklyOutcomePoint {
  weekStartDate: Date;
  painScore: number;
  sleepScore: number;
  anxietyScore: number;
  moodScore: number;
}

export interface WeeklyTrends {
  pain: TrendDirection;
  sleep: TrendDirection;
  anxiety: TrendDirection;
  mood: TrendDirection;
}

/**
 * Returns the Monday of the week that `now` falls in, in UTC, with
 * hours/minutes/seconds/milliseconds zeroed. Monday is chosen (rather
 * than Sunday) because it matches ISO 8601 week definitions used by
 * most clinical outcomes research, and the stable UTC anchor avoids
 * patients in different timezones bucketing the same submission into
 * different weeks.
 *
 * Examples (all UTC):
 *   Sun 2026-04-19  → Mon 2026-04-13
 *   Mon 2026-04-20  → Mon 2026-04-20
 *   Sat 2026-04-25  → Mon 2026-04-20
 */
export function getCurrentWeekStart(now: Date): Date {
  // getUTCDay: Sun=0, Mon=1, ..., Sat=6.
  // We want the offset *back* to the most recent Monday. For Mon (1) → 0.
  // For Sun (0) → 6 (Monday was 6 days ago).
  const day = now.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;

  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday,
      0,
      0,
      0,
      0,
    ),
  );
  return monday;
}

const DIMENSIONS: readonly OutcomeDimension[] = [
  "pain",
  "sleep",
  "anxiety",
  "mood",
] as const;

// For `pain` and `anxiety`, a HIGHER score is WORSE — so a downward trajectory
// means "improving". For `sleep` and `mood`, a HIGHER score is BETTER, so an
// upward trajectory means "improving". This table inverts the raw slope sign
// as needed so callers can render a single "improving | steady | worsening"
// label without knowing each dimension's polarity.
const HIGHER_IS_BETTER: Record<OutcomeDimension, boolean> = {
  pain: false,
  sleep: true,
  anxiety: false,
  mood: true,
};

function scoreForDimension(
  point: WeeklyOutcomePoint,
  dim: OutcomeDimension,
): number {
  switch (dim) {
    case "pain":
      return point.painScore;
    case "sleep":
      return point.sleepScore;
    case "anxiety":
      return point.anxietyScore;
    case "mood":
      return point.moodScore;
  }
}

/**
 * Computes per-dimension trend from a 4-week rolling window of weekly
 * outcomes. Behavior:
 *   - 0 points  → all dimensions "steady"
 *   - 1 point   → all "steady" (no delta to measure)
 *   - 2 points  → compare latest to prior
 *   - 3-4 points → compare average of latest half to earliest half
 *   - 5+ points → same as 4: we only look at the most recent 4 weeks
 *
 * Delta threshold: strictly > 0.5 points on the 1-10 scale counts as a
 * direction change; anything within ±0.5 is "steady". This matches the
 * noise floor we expect from self-reported single-item scales.
 */
export function computeTrend(outcomes: WeeklyOutcomePoint[]): WeeklyTrends {
  const steady: WeeklyTrends = {
    pain: "steady",
    sleep: "steady",
    anxiety: "steady",
    mood: "steady",
  };

  if (outcomes.length === 0) return steady;

  // Sort ascending by weekStartDate so we can take the last N reliably.
  const sorted = [...outcomes].sort(
    (a, b) => a.weekStartDate.getTime() - b.weekStartDate.getTime(),
  );
  const window = sorted.slice(-4);

  if (window.length < 2) return steady;

  const result: Partial<WeeklyTrends> = {};
  for (const dim of DIMENSIONS) {
    const scores = window.map((p) => scoreForDimension(p, dim));
    const half = Math.floor(scores.length / 2);

    let earlier: number;
    let later: number;
    if (scores.length === 2) {
      earlier = scores[0];
      later = scores[1];
    } else {
      const early = scores.slice(0, half);
      const late = scores.slice(-half);
      earlier = average(early);
      later = average(late);
    }

    const rawDelta = later - earlier;
    result[dim] = classifyDelta(rawDelta, HIGHER_IS_BETTER[dim]);
  }
  return result as WeeklyTrends;
}

function average(xs: number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

function classifyDelta(
  rawDelta: number,
  higherIsBetter: boolean,
): TrendDirection {
  const STEADY_BAND = 0.5;
  if (Math.abs(rawDelta) <= STEADY_BAND) return "steady";
  const improving = higherIsBetter ? rawDelta > 0 : rawDelta < 0;
  return improving ? "improving" : "worsening";
}

// ── UI metadata ────────────────────────────────────────────
//
// Exposed so the client form and any read-side visualizations stay in sync
// on anchor labels and emojis. Anchor labels at both ends is a hard
// requirement from CLAUDE.md rule 2.

export interface OutcomeScaleMeta {
  dimension: OutcomeDimension;
  label: string;
  prompt: string;
  lowEmoji: string;
  lowLabel: string;
  highEmoji: string;
  highLabel: string;
  higherIsBetter: boolean;
}

export const WEEKLY_OUTCOME_SCALES: readonly OutcomeScaleMeta[] = [
  {
    dimension: "pain",
    label: "Pain",
    prompt: "Over the past week, how much pain did you feel?",
    lowEmoji: "😊",
    lowLabel: "None",
    highEmoji: "😣",
    highLabel: "Severe",
    higherIsBetter: false,
  },
  {
    dimension: "sleep",
    label: "Sleep",
    prompt: "Over the past week, how did you sleep?",
    lowEmoji: "😴",
    lowLabel: "Terrible",
    highEmoji: "✨",
    highLabel: "Refreshing",
    higherIsBetter: true,
  },
  {
    dimension: "anxiety",
    label: "Anxiety",
    prompt: "Over the past week, how anxious did you feel?",
    lowEmoji: "😌",
    lowLabel: "Calm",
    highEmoji: "😰",
    highLabel: "Panicking",
    higherIsBetter: false,
  },
  {
    dimension: "mood",
    label: "Mood",
    prompt: "Over the past week, how was your overall mood?",
    lowEmoji: "☁️",
    lowLabel: "Down",
    highEmoji: "☀️",
    highLabel: "Great",
    higherIsBetter: true,
  },
] as const;

/**
 * Four Pillars of Health — EMR-093
 *
 * Pure scoring logic for the four-pillar wellness chart:
 *   1. Physical  — movement, sleep, dose adherence
 *   2. Mental    — focus / cognition outcomes, engagement, learning
 *   3. Emotional — mood, anxiety, social check-ins
 *   4. Spiritual — gratitude, purpose, charity (sourced from spiritual-wellness.ts)
 *
 * Each pillar returns 0–100 plus the factor breakdown that produced it.
 * No DB access here — the page hands us already-fetched logs so this stays
 * trivially testable.
 */

export type PillarId = "physical" | "mental" | "emotional" | "spiritual";

export interface PillarDef {
  id: PillarId;
  label: string;
  emoji: string;
  description: string;
  colorStart: string;
  colorEnd: string;
}

export const PILLAR_DEFS: PillarDef[] = [
  {
    id: "physical",
    label: "Physical",
    emoji: "\u{1F3C3}",
    description: "Movement, sleep, dose adherence.",
    colorStart: "#7BB069",
    colorEnd: "#3A8560",
  },
  {
    id: "mental",
    label: "Mental",
    emoji: "\u{1F9E0}",
    description: "Focus, cognition, learning.",
    colorStart: "#6BB8E0",
    colorEnd: "#3D7FB8",
  },
  {
    id: "emotional",
    label: "Emotional",
    emoji: "\u{1F496}",
    description: "Mood, anxiety, connection.",
    colorStart: "#F0A5C0",
    colorEnd: "#C46B97",
  },
  {
    id: "spiritual",
    label: "Spiritual",
    emoji: "\u{1F54A}\u{FE0F}",
    description: "Purpose, gratitude, service.",
    colorStart: "#C084D8",
    colorEnd: "#7D3F9B",
  },
];

export interface PillarFactor {
  label: string;
  weight: number; // signed contribution
}

export interface PillarScore {
  id: PillarId;
  label: string;
  emoji: string;
  description: string;
  score: number;
  factors: PillarFactor[];
  suggestion?: string;
}

export interface PillarsInput {
  outcomeLogs: Array<{ metric: string; value: number; loggedAt: Date }>;
  doseLogs: Array<{ loggedAt: Date }>;
  encounterCount: number;
  messageThreadCount: number;
  /** Optional override — when the spiritual pillar score is computed elsewhere. */
  spiritualScore?: number;
}

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function avgMetric(
  logs: PillarsInput["outcomeLogs"],
  metric: string,
): number | null {
  const recent = logs.filter(
    (l) =>
      l.metric === metric &&
      Date.now() - l.loggedAt.getTime() < FOURTEEN_DAYS,
  );
  if (recent.length === 0) return null;
  return recent.reduce((sum, l) => sum + l.value, 0) / recent.length;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function computeFourPillars(input: PillarsInput): PillarScore[] {
  return PILLAR_DEFS.map((def) => buildPillar(def, input));
}

function buildPillar(def: PillarDef, input: PillarsInput): PillarScore {
  switch (def.id) {
    case "physical":
      return buildPhysical(def, input);
    case "mental":
      return buildMental(def, input);
    case "emotional":
      return buildEmotional(def, input);
    case "spiritual":
      return buildSpiritual(def, input);
  }
}

function buildPhysical(def: PillarDef, input: PillarsInput): PillarScore {
  const factors: PillarFactor[] = [];
  let score = 50;

  const sleep = avgMetric(input.outcomeLogs, "sleep");
  if (sleep !== null) {
    const delta = (sleep - 5) * 5; // 5/10 = neutral
    score += delta;
    factors.push({ label: `Sleep avg ${sleep.toFixed(1)}/10`, weight: delta });
  } else {
    factors.push({ label: "No sleep check-ins yet", weight: 0 });
  }

  const movement = avgMetric(input.outcomeLogs, "movement");
  if (movement !== null) {
    const delta = (movement - 5) * 4;
    score += delta;
    factors.push({
      label: `Movement avg ${movement.toFixed(1)}/10`,
      weight: delta,
    });
  }

  const recentDoses = input.doseLogs.filter(
    (d) => Date.now() - d.loggedAt.getTime() < FOURTEEN_DAYS,
  ).length;
  if (recentDoses > 0) {
    const delta = Math.min(15, recentDoses);
    score += delta;
    factors.push({
      label: `${recentDoses} doses logged in 14d`,
      weight: delta,
    });
  } else {
    factors.push({ label: "No recent dose logs", weight: -5 });
    score -= 5;
  }

  return {
    ...def,
    score: clamp(Math.round(score)),
    factors,
    suggestion: score < 50
      ? "Try logging tonight's sleep — even a single number gives this bar room to grow."
      : undefined,
  };
}

function buildMental(def: PillarDef, input: PillarsInput): PillarScore {
  const factors: PillarFactor[] = [];
  let score = 50;

  const focus = avgMetric(input.outcomeLogs, "focus");
  if (focus !== null) {
    const delta = (focus - 5) * 6;
    score += delta;
    factors.push({ label: `Focus avg ${focus.toFixed(1)}/10`, weight: delta });
  }

  const cognition = avgMetric(input.outcomeLogs, "cognition");
  if (cognition !== null) {
    const delta = (cognition - 5) * 5;
    score += delta;
    factors.push({
      label: `Cognition avg ${cognition.toFixed(1)}/10`,
      weight: delta,
    });
  }

  const engagement = input.encounterCount + input.messageThreadCount;
  if (engagement > 0) {
    const delta = Math.min(15, engagement * 3);
    score += delta;
    factors.push({
      label: `${engagement} care-team interactions`,
      weight: delta,
    });
  }

  if (factors.length === 0) {
    factors.push({ label: "Add a focus check-in to start tracking", weight: 0 });
  }

  return {
    ...def,
    score: clamp(Math.round(score)),
    factors,
    suggestion: score < 50
      ? "A 5-minute morning intention or learning session moves this fast."
      : undefined,
  };
}

function buildEmotional(def: PillarDef, input: PillarsInput): PillarScore {
  const factors: PillarFactor[] = [];
  let score = 50;

  const mood = avgMetric(input.outcomeLogs, "mood");
  if (mood !== null) {
    const delta = (mood - 5) * 6;
    score += delta;
    factors.push({ label: `Mood avg ${mood.toFixed(1)}/10`, weight: delta });
  }

  const anxiety = avgMetric(input.outcomeLogs, "anxiety");
  if (anxiety !== null) {
    // Lower anxiety is better — invert.
    const delta = (5 - anxiety) * 5;
    score += delta;
    factors.push({
      label: `Anxiety avg ${anxiety.toFixed(1)}/10`,
      weight: delta,
    });
  }

  if (input.messageThreadCount > 0) {
    const delta = Math.min(8, input.messageThreadCount * 4);
    score += delta;
    factors.push({
      label: "Recent care-team conversations",
      weight: delta,
    });
  }

  if (factors.length === 0) {
    factors.push({ label: "No mood or anxiety entries yet", weight: 0 });
  }

  return {
    ...def,
    score: clamp(Math.round(score)),
    factors,
    suggestion: score < 50
      ? "Box-breathing for 2 minutes is a real, evidence-backed lift."
      : undefined,
  };
}

function buildSpiritual(def: PillarDef, input: PillarsInput): PillarScore {
  const factors: PillarFactor[] = [];
  // If a precomputed spiritual score is supplied, anchor on it; otherwise
  // we infer from gratitude / purpose outcome metrics if present.
  if (typeof input.spiritualScore === "number") {
    factors.push({
      label: `Weekly spiritual check-in: ${input.spiritualScore}`,
      weight: input.spiritualScore - 50,
    });
    return {
      ...def,
      score: clamp(Math.round(input.spiritualScore)),
      factors,
      suggestion: input.spiritualScore < 50
        ? "Five minutes of gratitude or quiet reflection counts."
        : undefined,
    };
  }

  let score = 50;
  const gratitude = avgMetric(input.outcomeLogs, "gratitude");
  if (gratitude !== null) {
    const delta = (gratitude - 5) * 6;
    score += delta;
    factors.push({
      label: `Gratitude avg ${gratitude.toFixed(1)}/10`,
      weight: delta,
    });
  }

  const purpose = avgMetric(input.outcomeLogs, "purpose");
  if (purpose !== null) {
    const delta = (purpose - 5) * 6;
    score += delta;
    factors.push({
      label: `Purpose avg ${purpose.toFixed(1)}/10`,
      weight: delta,
    });
  }

  if (factors.length === 0) {
    factors.push({
      label: "Use the spiritual check-in on the lifestyle tab",
      weight: 0,
    });
  }

  return {
    ...def,
    score: clamp(Math.round(score)),
    factors,
    suggestion: score < 50
      ? "One act of kindness or 5 quiet minutes lifts this bar today."
      : undefined,
  };
}

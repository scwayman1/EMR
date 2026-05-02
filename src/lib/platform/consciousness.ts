/**
 * EMR-152 — Heart-centric EMR consciousness (Article IV).
 *
 * Article IV of the Leafjourney constitution: "The EMR breathes with
 * the clinician." This module is the data + scoring layer that powers
 * the ambient heart-pulse, daily intention prompt, and compassion
 * metrics dashboard. The visual surfaces import from here so a single
 * source of truth produces the daily prompt + scoreboard.
 *
 * Pure helpers — no data fetching here. Callers pass in counters
 * (gratitude entries, intention check-ins, post-dose emoji ratings)
 * and we return derived metrics + the today-prompt.
 */

export type CompassionWindow = "today" | "rolling_7d" | "rolling_30d";

/** Source-data shape callers assemble from their tables. */
export interface CompassionInputs {
  /** Patient-authored gratitude journal entries in the window. */
  gratitudeEntries: number;
  /** Clinician daily-intention check-ins logged in the window. */
  intentionCheckIns: number;
  /** Post-dose emoji check-ins (any sentiment) in the window. */
  postDoseCheckIns: number;
  /** Subset of the above that were happy/very-happy. */
  postDoseHappy: number;
  /** Patient portal sessions in the window. */
  portalSessions: number;
  /** Encounters closed without a sign-off bottleneck. */
  encountersFlowedClosed: number;
  /** Total encounters closed. */
  encountersClosed: number;
}

export interface CompassionMetrics {
  window: CompassionWindow;
  /** 0–100 — rolls up sentiment, intention adherence, and flow. */
  compassionIndex: number;
  /** % of post-dose check-ins that were happy/very-happy. */
  outcomeJoyRate: number;
  /** % of clinical days that opened with an intention check-in. */
  intentionAdherenceRate: number;
  /** Gratitude entries normalized per portal session. */
  gratitudePerSession: number;
  /** % of encounters that closed without sign-off bottleneck. */
  flowRate: number;
  inputs: CompassionInputs;
}

const WEIGHTS = {
  joy: 0.4,
  intention: 0.25,
  gratitude: 0.15,
  flow: 0.2,
};

const safeRate = (numer: number, denom: number): number =>
  denom <= 0 ? 0 : Math.max(0, Math.min(1, numer / denom));

/**
 * Compute the compassion index + components. The index is a weighted
 * blend on a 0–100 scale; the dashboard surfaces both the headline
 * and the components so a clinic lead can see what's pulling the
 * number down.
 */
export function computeCompassionMetrics(
  window: CompassionWindow,
  inputs: CompassionInputs,
): CompassionMetrics {
  const outcomeJoyRate = safeRate(inputs.postDoseHappy, inputs.postDoseCheckIns);
  const intentionAdherenceRate = safeRate(
    inputs.intentionCheckIns,
    daysInWindow(window),
  );
  const gratitudePerSession = safeRate(
    inputs.gratitudeEntries,
    Math.max(inputs.portalSessions, 1),
  );
  const flowRate = safeRate(
    inputs.encountersFlowedClosed,
    inputs.encountersClosed,
  );

  const compassionIndex = Math.round(
    100 *
      (WEIGHTS.joy * outcomeJoyRate +
        WEIGHTS.intention * intentionAdherenceRate +
        WEIGHTS.gratitude * Math.min(gratitudePerSession, 1) +
        WEIGHTS.flow * flowRate),
  );

  return {
    window,
    compassionIndex,
    outcomeJoyRate,
    intentionAdherenceRate,
    gratitudePerSession,
    flowRate,
    inputs,
  };
}

function daysInWindow(window: CompassionWindow): number {
  switch (window) {
    case "today":
      return 1;
    case "rolling_7d":
      return 7;
    case "rolling_30d":
      return 30;
  }
}

// ── Heart pulse cadence ─────────────────────────────────────────────

/**
 * Heart-pulse beats-per-minute scales with compassion index — calmer
 * when things are going well, more alert as the index drops. Also
 * accepts a "stress" modifier (e.g. open critical task count) so the
 * pulse quickens under load.
 */
export function pulseBpm(
  compassionIndex: number,
  stress = 0,
): number {
  // Calm 56 bpm at index 100, climbing to 92 bpm at index 0.
  const base = 92 - 0.36 * Math.max(0, Math.min(100, compassionIndex));
  const stressed = base + Math.min(20, Math.max(0, stress) * 4);
  return Math.round(Math.max(48, Math.min(112, stressed)));
}

/** CSS animation duration in seconds for a given BPM. */
export function pulseDurationSeconds(bpm: number): number {
  if (bpm <= 0) return 1;
  return Math.round((60_000 / bpm)) / 1000;
}

// ── Daily intention prompts ─────────────────────────────────────────

const INTENTIONS = [
  "Today I will listen first, type second.",
  "Every patient gets the version of me I would want at my own bedside.",
  "Curiosity over judgment. The chart doesn't tell the whole story.",
  "I will protect my attention so I can give it where it matters.",
  "Compassion is a clinical intervention. I will dose it generously.",
  "I will name one thing I'm grateful for before I open my first chart.",
  "I will close at least one encounter today before opening the next.",
  "If a workflow stole five seconds I cannot get back, I will report it.",
  "I will say the patient's name out loud at least once each visit.",
  "I will ask once: 'What would make today better?'",
  "I will assume the documentation can wait one more breath.",
  "Today I show up for the person, not the diagnosis.",
];

export interface DailyIntentionPrompt {
  intention: string;
  /** Stable hash so multiple loads on the same day return the same prompt. */
  seed: string;
}

/**
 * Pick the daily intention. Deterministic per (clinician, date) so a
 * page refresh doesn't shuffle the prompt mid-shift, and each clinician
 * gets a different seed on the same day.
 */
export function dailyIntention(
  clinicianId: string,
  on: Date = new Date(),
): DailyIntentionPrompt {
  const seed = `${clinicianId}:${on.toISOString().slice(0, 10)}`;
  const idx = stringHash(seed) % INTENTIONS.length;
  return { intention: INTENTIONS[idx], seed };
}

function stringHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Gratitude integration ───────────────────────────────────────────

export interface GratitudeEntry {
  id: string;
  authorRole: "patient" | "clinician" | "operator";
  createdAt: Date;
  text: string;
}

/** Pull recent gratitude entries down to a feed-friendly shape. */
export function summarizeGratitudeFeed(entries: GratitudeEntry[]): {
  count: number;
  byRole: Record<GratitudeEntry["authorRole"], number>;
  recent: Array<Pick<GratitudeEntry, "id" | "authorRole" | "text"> & {
    relative: string;
  }>;
} {
  const byRole: Record<GratitudeEntry["authorRole"], number> = {
    patient: 0,
    clinician: 0,
    operator: 0,
  };
  for (const e of entries) byRole[e.authorRole] += 1;
  const sorted = [...entries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const recent = sorted.slice(0, 5).map((e) => ({
    id: e.id,
    authorRole: e.authorRole,
    text: e.text,
    relative: relativeFromNow(e.createdAt),
  }));
  return { count: entries.length, byRole, recent };
}

function relativeFromNow(d: Date, now: Date = new Date()): string {
  const ms = now.getTime() - d.getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

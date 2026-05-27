// EMR-150 — patient profile -> combo-wheel personalization.
//
// Pulls a normalised "symptom profile" from a patient's intake notes,
// treatment goals, and recent outcome metrics, then ranks compounds by
// overlap with that profile. Pure functions; no DB or React deps so the
// helpers can be unit-tested.

import type { ComboWheelCompound } from "@/lib/domain/combo-wheel";

export interface PatientComboProfile {
  // Canonicalised lowercase symptom keywords pulled from chart fields.
  symptoms: string[];
  // The raw source counts — useful when surfacing "we noticed X" copy.
  source: {
    presentingConcerns: number;
    treatmentGoals: number;
    intakeAnswers: number;
    outcomes: number;
  };
}

export interface PatientComboInput {
  presentingConcerns?: string | null;
  treatmentGoals?: string | null;
  intakeAnswers?: unknown;
  outcomeLogs?: Array<{ metric: string; value: number }>;
}

// Outcome metric -> matching symptom keyword. The wheel data uses
// human-readable symptom strings ("Pain", "Anxiety", "Insomnia"), so we
// normalise to lowercase before comparing. A high recent score
// (anxiety > 6, pain > 5) flags the symptom as active.
const OUTCOME_TRIGGERS: Record<string, { keyword: string; threshold: number }> = {
  pain: { keyword: "pain", threshold: 5 },
  anxiety: { keyword: "anxiety", threshold: 6 },
  sleep: { keyword: "insomnia", threshold: 0 }, // sleep < threshold
  mood: { keyword: "depression", threshold: 0 },
  stress: { keyword: "stress", threshold: 6 },
  nausea: { keyword: "nausea", threshold: 4 },
};

const SYMPTOM_VOCAB = [
  "pain",
  "anxiety",
  "insomnia",
  "depression",
  "stress",
  "nausea",
  "appetite",
  "ptsd",
  "muscle spasms",
  "muscle tension",
  "inflammation",
  "fatigue",
  "seizures",
  "migraine",
  "headache",
  "ibd",
  "glaucoma",
  "asthma",
  "neurodegeneration",
  "neurodegeneration",
];

function extractKeywords(text: string | null | undefined): string[] {
  if (!text) return [];
  const lowered = text.toLowerCase();
  const found: string[] = [];
  for (const word of SYMPTOM_VOCAB) {
    if (lowered.includes(word) && !found.includes(word)) {
      found.push(word);
    }
  }
  // Also pick up "trouble sleeping", "can't sleep" -> insomnia.
  if (
    !found.includes("insomnia") &&
    /(trouble|can(?:'?| no)t|poor|bad).{0,15}sleep|sleeplessness/i.test(lowered)
  ) {
    found.push("insomnia");
  }
  return found;
}

function extractIntakeKeywords(intake: unknown): string[] {
  if (!intake || typeof intake !== "object") return [];
  // Intake answers are progressive JSON; try a few common shapes without
  // assuming any particular schema.
  const text = JSON.stringify(intake).toLowerCase();
  return extractKeywords(text);
}

function summariseOutcomes(
  logs: Array<{ metric: string; value: number }> | undefined,
): string[] {
  if (!logs || logs.length === 0) return [];
  // Keep only the most recent reading per metric.
  const latestByMetric = new Map<string, number>();
  for (const log of logs) {
    if (!latestByMetric.has(log.metric)) {
      latestByMetric.set(log.metric, log.value);
    }
  }
  const found: string[] = [];
  for (const [metric, value] of latestByMetric.entries()) {
    const trigger = OUTCOME_TRIGGERS[metric];
    if (!trigger) continue;
    // Sleep/mood are "lower is worse" -> flag below threshold of 5.
    const flagged =
      metric === "sleep" || metric === "mood"
        ? value < 5
        : value > trigger.threshold;
    if (flagged && !found.includes(trigger.keyword)) {
      found.push(trigger.keyword);
    }
  }
  return found;
}

export function buildPatientComboProfile(
  input: PatientComboInput,
): PatientComboProfile {
  const fromConcerns = extractKeywords(input.presentingConcerns);
  const fromGoals = extractKeywords(input.treatmentGoals);
  const fromIntake = extractIntakeKeywords(input.intakeAnswers);
  const fromOutcomes = summariseOutcomes(input.outcomeLogs);

  const merged: string[] = [];
  for (const list of [fromConcerns, fromGoals, fromIntake, fromOutcomes]) {
    for (const k of list) if (!merged.includes(k)) merged.push(k);
  }

  return {
    symptoms: merged,
    source: {
      presentingConcerns: fromConcerns.length,
      treatmentGoals: fromGoals.length,
      intakeAnswers: fromIntake.length,
      outcomes: fromOutcomes.length,
    },
  };
}

export interface RankedCompound {
  compound: ComboWheelCompound;
  score: number;
  matched: string[];
}

/**
 * Rank compounds by overlap with the patient's symptom profile.
 * Compounds with no match are filtered out so callers can simply take
 * the top N entries.
 */
export function rankCompoundsForProfile(
  compounds: ComboWheelCompound[],
  profile: PatientComboProfile,
): RankedCompound[] {
  if (profile.symptoms.length === 0) return [];

  const ranked: RankedCompound[] = [];
  for (const compound of compounds) {
    const symptomsLower = compound.symptoms.map((s) => s.toLowerCase());
    const matched: string[] = [];
    for (const target of profile.symptoms) {
      if (symptomsLower.some((s) => s.includes(target))) {
        matched.push(target);
      }
    }
    if (matched.length === 0) continue;
    // Strong evidence outweighs emerging when scores tie.
    const evidenceWeight =
      compound.evidence === "strong"
        ? 3
        : compound.evidence === "moderate"
          ? 2
          : 1;
    const score = matched.length * 10 + evidenceWeight;
    ranked.push({ compound, score, matched });
  }
  ranked.sort((a, b) => b.score - a.score || a.compound.name.localeCompare(b.compound.name));
  return ranked;
}

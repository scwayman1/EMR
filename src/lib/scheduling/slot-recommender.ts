/**
 * EMR-209 — Smart slot recommender.
 *
 * Given a list of candidate slots and a patient context, returns the slots
 * ranked by how well they match the patient. The score is a weighted sum
 * of:
 *
 *   1. Continuity   — same provider as last visit (huge for cannabis programs).
 *   2. No-show fit  — high-risk patients should only get "cheap" slots
 *                     (off-peak, virtual) so the clinic isn't out a prime
 *                     slot if they no-show.
 *   3. Preference   — time-of-day, day-of-week, modality match.
 *   4. Lead time    — slots inside the cadence window beat slots outside it.
 *
 * The recommender is read-only and does not call the database. Callers
 * pass in pre-fetched candidate slots; this keeps the function pure and
 * easy to test.
 */
import type { RiskTier } from "./no-show-model";
import type { Modality } from "./cadence-engine";

export interface CandidateSlot {
  slotId: string;
  providerId: string;
  startAt: Date;
  endAt: Date;
  modality: Modality;
  /**
   * "Slot value" — how much we'd lose if this slot no-shows. Prime
   * Tuesday 11am in-person new-patient slots are higher value than a
   * Friday 8am video follow-up.
   */
  slotValue: number; // 0..1
}

export interface PatientContext {
  patientId: string;
  preferredProviderId: string | null;
  /** Last seen provider — drives the continuity score. */
  lastVisitProviderId: string | null;
  /** Risk tier from no-show model (EMR-207). */
  riskTier: RiskTier;
  preferredDaysOfWeek: number[]; // [] = no preference
  preferredHours: { earliestHour: number; latestHour: number } | null;
  preferredModality: Modality | null;
  /** Cadence window — recommended next-due date from EMR-208. */
  dueAt: Date | null;
  overdueGraceDays: number;
  /** Tracks whether the patient must see a specific provider (state-required follow-up). */
  providerLockedTo: string | null;
}

export interface ScoredSlot extends CandidateSlot {
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  continuity: 0.32,
  preferredProvider: 0.18,
  riskFit: 0.18,
  modality: 0.08,
  hour: 0.06,
  day: 0.06,
  cadence: 0.12,
} as const;

/**
 * Rank candidate slots. Slots that violate a hard constraint (provider
 * lock, modality required by cadence) are filtered out, not just
 * down-ranked, so the UI never offers them.
 */
export function rankSlots(
  candidates: CandidateSlot[],
  patient: PatientContext,
  options: {
    /** Only return slots whose modality matches this (set by cadence). */
    requiredModality?: Modality;
    /** Hard cap on slots returned. */
    limit?: number;
  } = {},
): ScoredSlot[] {
  const limit = options.limit ?? 5;
  const filtered = candidates.filter((s) => {
    if (patient.providerLockedTo && s.providerId !== patient.providerLockedTo) {
      return false;
    }
    if (options.requiredModality && s.modality !== options.requiredModality) {
      return false;
    }
    return true;
  });

  const scored = filtered.map((slot) => scoreSlot(slot, patient));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

function scoreSlot(slot: CandidateSlot, patient: PatientContext): ScoredSlot {
  const reasons: string[] = [];
  let score = 0;

  // 1. Continuity with last-seen provider (cannabis patients trust their clinician).
  if (patient.lastVisitProviderId && slot.providerId === patient.lastVisitProviderId) {
    score += WEIGHTS.continuity;
    reasons.push("Same provider as last visit");
  }

  // 2. Patient-stated preferred provider (separate from last-visit; e.g. new program).
  if (patient.preferredProviderId && slot.providerId === patient.preferredProviderId) {
    score += WEIGHTS.preferredProvider;
    reasons.push("Preferred provider");
  }

  // 3. Risk fit — high-risk patients get low-value slots (we can absorb a no-show).
  const riskFit = riskValueFit(patient.riskTier, slot.slotValue);
  score += WEIGHTS.riskFit * riskFit;
  if (riskFit > 0.7) reasons.push("Slot value matches risk tier");

  // 4. Preferred modality.
  if (patient.preferredModality && slot.modality === patient.preferredModality) {
    score += WEIGHTS.modality;
    reasons.push(`Matches modality preference (${slot.modality})`);
  }

  // 5. Preferred hour-of-day window.
  if (patient.preferredHours) {
    const h = slot.startAt.getHours();
    if (h >= patient.preferredHours.earliestHour && h < patient.preferredHours.latestHour) {
      score += WEIGHTS.hour;
      reasons.push("Within preferred hours");
    }
  }

  // 6. Preferred day-of-week.
  if (
    patient.preferredDaysOfWeek.length > 0 &&
    patient.preferredDaysOfWeek.includes(slot.startAt.getDay())
  ) {
    score += WEIGHTS.day;
    reasons.push("Preferred day of week");
  }

  // 7. Cadence fit — slots that hit the next-due date best score highest.
  if (patient.dueAt) {
    const dist = Math.abs(slot.startAt.getTime() - patient.dueAt.getTime()) / 86_400_000;
    if (dist <= patient.overdueGraceDays) {
      const cadenceScore =
        WEIGHTS.cadence * (1 - dist / Math.max(1, patient.overdueGraceDays));
      score += cadenceScore;
      if (dist <= 1) reasons.push("Lands on cadence due date");
      else if (cadenceScore > 0) reasons.push("Within cadence grace window");
    }
  }

  return { ...slot, score: round3(score), reasons };
}

/**
 * High risk + low-value slot = good fit (1.0). Low risk + high-value slot =
 * good fit (1.0). Mismatches (low risk patient eating a prime slot, high
 * risk patient getting a prime slot) score lower.
 */
function riskValueFit(tier: RiskTier, slotValue: number): number {
  const inverted = 1 - slotValue;
  switch (tier) {
    case "low":
      return slotValue; // low-risk patients get prime slots
    case "medium":
      return 1 - Math.abs(slotValue - 0.5) * 2;
    case "high":
      return inverted; // high-risk patients get cheap slots
  }
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

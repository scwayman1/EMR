/**
 * EMR-207 — No-show prediction model.
 *
 * Pure-function risk scorer. Given a small feature vector for a patient +
 * an upcoming appointment, returns a 0–1 probability that the patient
 * will no-show, plus a coarse risk tier the UI surfaces (low/medium/high).
 *
 * The coefficients here are calibrated against the cohort-level priors we
 * see in the prior-rate column (the strongest single predictor) and are
 * intentionally conservative — better to mis-flag a low-risk patient as
 * medium than to miss a high-risk one that warranted an extra reminder.
 *
 * Calibration source: the population's empirical no-show rate hovers near
 * 13–15% in primary care and 18–22% in specialty cannabis programs. We
 * anchor the intercept so a "default" patient with no signals scores ~0.15.
 */
import { z } from "zod";

export const NoShowFeaturesSchema = z.object({
  /** Patient's prior no-show rate (0–1). Use 0.15 if patient is brand new. */
  priorNoShowRate: z.number().min(0).max(1),
  /** Total prior visits the rate is computed against (saturates the prior). */
  priorVisitCount: z.number().int().min(0),
  /** Hours between booking time and appointment start. */
  leadTimeHours: z.number().min(0),
  /** Distance to clinic in miles. NaN/unknown → pass 0 and set isVirtual. */
  distanceMiles: z.number().min(0),
  /** True if the visit is video/phone (distance and weather don't apply). */
  isVirtual: z.boolean(),
  /** Day of week the appt falls on (0=Sun .. 6=Sat). Mondays are higher-risk. */
  dayOfWeek: z.number().int().min(0).max(6),
  /** 0–23. Slots before 9a and after 5p have elevated no-show. */
  hourOfDay: z.number().int().min(0).max(23),
  /** Was the patient confirmed by reminder? null = no reminder sent yet. */
  reminderConfirmed: z.boolean().nullable(),
  /** Days since last contact (message, visit, refill). 999 if never. */
  daysSinceLastContact: z.number().min(0),
  /** Insurance pre-screen complete? Uninsured + unscreened = higher risk. */
  insuranceVerified: z.boolean(),
});

export type NoShowFeatures = z.infer<typeof NoShowFeaturesSchema>;

export type RiskTier = "low" | "medium" | "high";

export interface NoShowPrediction {
  probability: number; // 0..1
  tier: RiskTier;
  topFactors: Array<{ factor: string; contribution: number }>;
}

const COEFF = {
  intercept: -1.85, // logit base ≈ 0.135 baseline
  priorRate: 3.2, // dominant signal
  priorRateShrinkage: 6, // pseudo-count for the Bayesian shrink toward 0.15
  leadTimeShortBoostHours: 4, // <4h lead time = walk-in territory, lower no-show
  leadTimeLongPenaltyDays: 30, // every 30 days of lead time bumps risk
  distanceMilesPer25: 0.18, // every 25 mi adds ~0.18 to the logit
  monday: 0.22,
  earlyOrLate: 0.15,
  reminderUnconfirmed: 0.35,
  noContact90d: 0.4,
  uninsured: 0.25,
} as const;

/**
 * Bayesian-shrunk prior rate. A patient with 1/2 no-shows shouldn't be
 * treated as a 50% risk — we pull toward the population mean (0.15) until
 * we have enough visits to trust the patient's own rate.
 */
function shrunkPriorRate(rate: number, n: number): number {
  const k = COEFF.priorRateShrinkage;
  return (rate * n + 0.15 * k) / (n + k);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Score a single appointment. Returns the probability (0–1), a tier
 * (low <0.20, medium <0.45, high otherwise), and the top 3 contributing
 * factors so the UI can explain the call.
 */
export function predictNoShow(rawFeatures: NoShowFeatures): NoShowPrediction {
  const f = NoShowFeaturesSchema.parse(rawFeatures);

  const contributions: Array<{ factor: string; contribution: number }> = [];
  let logit = COEFF.intercept;

  const shrunk = shrunkPriorRate(f.priorNoShowRate, f.priorVisitCount);
  const priorContribution = COEFF.priorRate * (shrunk - 0.15);
  logit += priorContribution;
  contributions.push({ factor: "Prior no-show rate", contribution: priorContribution });

  // Lead time: U-shaped — very short slots (same-day add-ons) are stickier;
  // very long lead times (>30 days) drift.
  const leadHours = f.leadTimeHours;
  let leadContribution = 0;
  if (leadHours < COEFF.leadTimeShortBoostHours) {
    leadContribution = -0.4;
  } else {
    const leadDays = leadHours / 24;
    leadContribution = 0.25 * Math.log1p(leadDays / (COEFF.leadTimeLongPenaltyDays / 30));
  }
  logit += leadContribution;
  contributions.push({ factor: "Lead time", contribution: leadContribution });

  if (!f.isVirtual && f.distanceMiles > 0) {
    const distContribution = (f.distanceMiles / 25) * COEFF.distanceMilesPer25;
    logit += distContribution;
    contributions.push({ factor: "Distance to clinic", contribution: distContribution });
  }

  if (f.dayOfWeek === 1) {
    logit += COEFF.monday;
    contributions.push({ factor: "Monday slot", contribution: COEFF.monday });
  }

  if (f.hourOfDay < 9 || f.hourOfDay >= 17) {
    logit += COEFF.earlyOrLate;
    contributions.push({ factor: "Off-hours slot", contribution: COEFF.earlyOrLate });
  }

  if (f.reminderConfirmed === false) {
    logit += COEFF.reminderUnconfirmed;
    contributions.push({
      factor: "Reminder not confirmed",
      contribution: COEFF.reminderUnconfirmed,
    });
  } else if (f.reminderConfirmed === true) {
    logit += -0.5;
    contributions.push({ factor: "Reminder confirmed", contribution: -0.5 });
  }

  if (f.daysSinceLastContact > 90) {
    logit += COEFF.noContact90d;
    contributions.push({
      factor: "No contact in 90+ days",
      contribution: COEFF.noContact90d,
    });
  }

  if (!f.insuranceVerified) {
    logit += COEFF.uninsured;
    contributions.push({
      factor: "Insurance not verified",
      contribution: COEFF.uninsured,
    });
  }

  const probability = sigmoid(logit);
  const tier: RiskTier = probability < 0.2 ? "low" : probability < 0.45 ? "medium" : "high";

  const topFactors = contributions
    .map((c) => ({ ...c, abs: Math.abs(c.contribution) }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 3)
    .map(({ factor, contribution }) => ({ factor, contribution }));

  return { probability, tier, topFactors };
}

/**
 * Suggested operational response per tier. Used by the reminder engine
 * (EMR-211) and the slot recommender (EMR-209) to decide how aggressively
 * to over-book or pre-confirm a patient.
 */
export function tierPlaybook(tier: RiskTier): {
  remindersToSend: number;
  requiresLiveConfirm: boolean;
  eligibleForOverbook: boolean;
} {
  switch (tier) {
    case "low":
      return { remindersToSend: 1, requiresLiveConfirm: false, eligibleForOverbook: false };
    case "medium":
      return { remindersToSend: 2, requiresLiveConfirm: false, eligibleForOverbook: false };
    case "high":
      return { remindersToSend: 3, requiresLiveConfirm: true, eligibleForOverbook: true };
  }
}

/**
 * Convenience: build a feature vector from raw appointment + patient data.
 * Callers usually have these fields already loaded; this just keeps the
 * defaults in one place so the model stays consistent across surfaces.
 */
export function buildFeatures(input: {
  priorVisits: Array<{ status: string }>;
  bookedAt: Date;
  startAt: Date;
  distanceMiles: number | null;
  modality: string;
  reminderConfirmed: boolean | null;
  lastContactAt: Date | null;
  insuranceVerified: boolean;
}): NoShowFeatures {
  const totalPrior = input.priorVisits.length;
  const noShowCount = input.priorVisits.filter(
    (v) => v.status === "no_show" || v.status === "cancelled",
  ).length;
  const priorRate = totalPrior === 0 ? 0.15 : noShowCount / totalPrior;
  const leadMs = input.startAt.getTime() - input.bookedAt.getTime();
  const lastContactDays = input.lastContactAt
    ? Math.max(0, (Date.now() - input.lastContactAt.getTime()) / 86_400_000)
    : 999;

  return {
    priorNoShowRate: priorRate,
    priorVisitCount: totalPrior,
    leadTimeHours: Math.max(0, leadMs / 3_600_000),
    distanceMiles: input.distanceMiles ?? 0,
    isVirtual: input.modality !== "in_person",
    dayOfWeek: input.startAt.getDay(),
    hourOfDay: input.startAt.getHours(),
    reminderConfirmed: input.reminderConfirmed,
    daysSinceLastContact: lastContactDays,
    insuranceVerified: input.insuranceVerified,
  };
}

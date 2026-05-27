/**
 * EMR-208 — Algorithmic follow-up cadence engine.
 *
 * Given a patient's primary condition and treatment phase, returns the
 * recommended follow-up interval and visit modality. The cadence table
 * encodes the practice's standard of care: how often we want eyes on a
 * patient who is titrating a new regimen vs. a patient who is stable on
 * maintenance dosing.
 *
 * Two phases matter for cannabis programs specifically:
 *   - **Titration**: doses are being adjusted; outcomes can shift week to
 *     week; we want short, frequent check-ins (often async).
 *   - **Maintenance**: a stable regimen; we want quarterly to semi-annual
 *     in-person to satisfy state cert renewal cadences and re-assess.
 *
 * The output is intentionally a *recommendation*, not a hard book — the
 * slot recommender (EMR-209) and waitlist engine (EMR-210) layer the
 * supply-side constraints on top.
 */
import { z } from "zod";

export const TreatmentPhaseSchema = z.enum([
  "intake",
  "titration",
  "stabilization",
  "maintenance",
  "tapering",
  "relapse_watch",
]);
export type TreatmentPhase = z.infer<typeof TreatmentPhaseSchema>;

export const ConditionCategorySchema = z.enum([
  "chronic_pain",
  "anxiety",
  "ptsd",
  "insomnia",
  "epilepsy",
  "oncology",
  "neurodegenerative",
  "ibd",
  "migraine",
  "ms",
  "cachexia",
  "general_wellness",
]);
export type ConditionCategory = z.infer<typeof ConditionCategorySchema>;

export type Modality = "video" | "phone" | "in_person" | "async_message";

export interface CadenceRecommendation {
  /** Days between this visit and the next recommended visit. */
  intervalDays: number;
  /** Visit modality the recommender starts with (slot recommender may upgrade/downgrade). */
  modality: Modality;
  /** True if state law requires this to be in-person regardless of patient preference. */
  inPersonRequired: boolean;
  /** Human-readable rationale, surfaced to the clinician. */
  rationale: string;
  /**
   * "Watch window" in days — if the patient hasn't been seen by this date
   * the cadence engine flags them as overdue and feeds them into the
   * waitlist (EMR-210) for proactive outreach.
   */
  overdueGraceDays: number;
}

interface CadenceCell {
  intervalDays: number;
  modality: Modality;
  overdueGraceDays: number;
}

/**
 * Per-condition × phase matrix. Numbers come from internal protocol notes
 * and the medical advisory board's published cadence guidance; we intend
 * to revisit quarterly as outcome data accumulates.
 */
const CADENCE_TABLE: Record<ConditionCategory, Record<TreatmentPhase, CadenceCell>> = {
  chronic_pain: {
    intake:          { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    stabilization:   { intervalDays: 30, modality: "video", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 90, modality: "video", overdueGraceDays: 30 },
    tapering:        { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 14, modality: "phone", overdueGraceDays: 5 },
  },
  anxiety: {
    intake:          { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 10, modality: "video", overdueGraceDays: 5 },
    stabilization:   { intervalDays: 30, modality: "video", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 90, modality: "video", overdueGraceDays: 30 },
    tapering:        { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 7,  modality: "video", overdueGraceDays: 3 },
  },
  ptsd: {
    intake:          { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 10, modality: "video", overdueGraceDays: 5 },
    stabilization:   { intervalDays: 30, modality: "video", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 60, modality: "video", overdueGraceDays: 21 },
    tapering:        { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 7,  modality: "video", overdueGraceDays: 3 },
  },
  insomnia: {
    intake:          { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 14, modality: "async_message", overdueGraceDays: 7 },
    stabilization:   { intervalDays: 45, modality: "async_message", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 120, modality: "video", overdueGraceDays: 30 },
    tapering:        { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
  },
  epilepsy: {
    intake:          { intervalDays: 14, modality: "in_person", overdueGraceDays: 5 },
    titration:       { intervalDays: 10, modality: "video", overdueGraceDays: 3 },
    stabilization:   { intervalDays: 30, modality: "video", overdueGraceDays: 7 },
    maintenance:     { intervalDays: 90, modality: "in_person", overdueGraceDays: 14 },
    tapering:        { intervalDays: 14, modality: "video", overdueGraceDays: 5 },
    relapse_watch:   { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
  },
  oncology: {
    intake:          { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
    titration:       { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
    stabilization:   { intervalDays: 21, modality: "video", overdueGraceDays: 5 },
    maintenance:     { intervalDays: 30, modality: "video", overdueGraceDays: 7 },
    tapering:        { intervalDays: 14, modality: "video", overdueGraceDays: 5 },
    relapse_watch:   { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
  },
  neurodegenerative: {
    intake:          { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 14, modality: "video", overdueGraceDays: 5 },
    stabilization:   { intervalDays: 45, modality: "video", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 90, modality: "in_person", overdueGraceDays: 21 },
    tapering:        { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 10, modality: "video", overdueGraceDays: 5 },
  },
  ibd: {
    intake:          { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    stabilization:   { intervalDays: 45, modality: "video", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 120, modality: "video", overdueGraceDays: 30 },
    tapering:        { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 10, modality: "phone", overdueGraceDays: 3 },
  },
  migraine: {
    intake:          { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 14, modality: "async_message", overdueGraceDays: 7 },
    stabilization:   { intervalDays: 60, modality: "async_message", overdueGraceDays: 21 },
    maintenance:     { intervalDays: 120, modality: "video", overdueGraceDays: 30 },
    tapering:        { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 14, modality: "video", overdueGraceDays: 5 },
  },
  ms: {
    intake:          { intervalDays: 14, modality: "video", overdueGraceDays: 7 },
    titration:       { intervalDays: 14, modality: "video", overdueGraceDays: 5 },
    stabilization:   { intervalDays: 45, modality: "video", overdueGraceDays: 14 },
    maintenance:     { intervalDays: 90, modality: "in_person", overdueGraceDays: 21 },
    tapering:        { intervalDays: 21, modality: "video", overdueGraceDays: 7 },
    relapse_watch:   { intervalDays: 10, modality: "video", overdueGraceDays: 5 },
  },
  cachexia: {
    intake:          { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
    titration:       { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
    stabilization:   { intervalDays: 21, modality: "video", overdueGraceDays: 5 },
    maintenance:     { intervalDays: 45, modality: "video", overdueGraceDays: 10 },
    tapering:        { intervalDays: 14, modality: "video", overdueGraceDays: 5 },
    relapse_watch:   { intervalDays: 7,  modality: "video", overdueGraceDays: 2 },
  },
  general_wellness: {
    intake:          { intervalDays: 30, modality: "video", overdueGraceDays: 14 },
    titration:       { intervalDays: 30, modality: "async_message", overdueGraceDays: 14 },
    stabilization:   { intervalDays: 90, modality: "async_message", overdueGraceDays: 30 },
    maintenance:     { intervalDays: 180, modality: "video", overdueGraceDays: 60 },
    tapering:        { intervalDays: 30, modality: "video", overdueGraceDays: 14 },
    relapse_watch:   { intervalDays: 21, modality: "video", overdueGraceDays: 10 },
  },
};

/**
 * States that require a synchronous (audio-video or in-person) visit at
 * cert-renewal cadence regardless of phase. The card on file says "annual"
 * but most states bake in either a 12- or 24-month renewal — we use 365.
 */
const STATES_REQUIRING_IN_PERSON_RENEWAL = new Set([
  "FL",
  "PA",
  "OH",
  "OK",
  "MN",
  "TX",
]);

/** State cannabis cert renewal cadence — practical default is 365 days. */
const RENEWAL_DAYS = 365;

export interface CadenceInput {
  condition: ConditionCategory;
  phase: TreatmentPhase;
  /** Patient's state of residence — drives in-person renewal rules. */
  patientState: string | null;
  /** Days since the last cert/recommendation issuance. null = unknown. */
  daysSinceCertIssued: number | null;
  /**
   * Optional clinician override — if a clinician has manually pinned a
   * cadence in the chart, we respect it and skip the table.
   */
  clinicianOverrideDays?: number;
}

export function recommendCadence(input: CadenceInput): CadenceRecommendation {
  const cell = CADENCE_TABLE[input.condition][input.phase];

  let intervalDays = cell.intervalDays;
  let modality: Modality = cell.modality;
  let inPersonRequired = false;
  let rationale = `${labelCondition(input.condition)} — ${labelPhase(input.phase)} phase. Standard cadence is ${cell.intervalDays} days via ${labelModality(cell.modality)}.`;

  if (typeof input.clinicianOverrideDays === "number" && input.clinicianOverrideDays > 0) {
    intervalDays = input.clinicianOverrideDays;
    rationale = `Clinician override: ${input.clinicianOverrideDays} days. (Standard cadence would be ${cell.intervalDays} days.)`;
  }

  // State renewal squeeze: pull the visit forward if the cert is about to lapse.
  if (
    input.patientState &&
    STATES_REQUIRING_IN_PERSON_RENEWAL.has(input.patientState) &&
    input.daysSinceCertIssued !== null
  ) {
    const daysToRenewal = RENEWAL_DAYS - input.daysSinceCertIssued;
    if (daysToRenewal < intervalDays) {
      intervalDays = Math.max(7, daysToRenewal);
      modality = "in_person";
      inPersonRequired = true;
      rationale += ` Pulled in for cert renewal in ${input.patientState} (${daysToRenewal}d to expiry).`;
    }
  }

  return {
    intervalDays,
    modality,
    inPersonRequired,
    rationale,
    overdueGraceDays: cell.overdueGraceDays,
  };
}

/**
 * Given the cadence + the date of the last visit, compute the next-due
 * date and whether the patient is past the grace window.
 */
export function nextDueDate(
  lastVisitAt: Date,
  rec: CadenceRecommendation,
  now: Date = new Date(),
): { dueAt: Date; overdue: boolean; daysOverdue: number } {
  const due = new Date(lastVisitAt);
  due.setDate(due.getDate() + rec.intervalDays);
  const overdueByMs = now.getTime() - due.getTime();
  const daysOverdue = Math.max(0, overdueByMs / 86_400_000);
  return {
    dueAt: due,
    overdue: daysOverdue > rec.overdueGraceDays,
    daysOverdue: Math.floor(daysOverdue),
  };
}

function labelCondition(c: ConditionCategory): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function labelPhase(p: TreatmentPhase): string {
  return p.replace(/_/g, " ");
}
function labelModality(m: Modality): string {
  return m === "async_message" ? "secure message" : m.replace("_", " ");
}

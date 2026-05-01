/**
 * EMR-070 — USPSTF Preventive Screening Reminder Engine
 *
 * Wraps the USPSTF Grade A/B catalogue with the chart-side logic the
 * patient + clinician views need:
 *
 *   • due / overdue / current / not-applicable status per screening,
 *   • emoji-first checklist for the patient app (Dr. Patel directive: data
 *     collection should feel like a game),
 *   • clinician punch-list ordered by urgency, with one-click "order"
 *     suggestions tied to the right CPT code,
 *   • health-maintenance roll-up the AI fairytale summary can quote.
 *
 * The catalogue itself lives in `domain/uspstf-screenings.ts`. This file
 * stays focused on *applying* it to a particular patient with their
 * existing screening history.
 */

import {
  SCREENINGS,
  dueScreenings,
  type Screening,
} from "@/lib/domain/uspstf-screenings";

export type ScreeningStatus =
  | "due"
  | "overdue"
  | "current"
  | "not_applicable"
  | "patient_declined";

export interface PatientScreeningHistory {
  /** Screening id (matches `SCREENINGS[].id`). */
  screeningId: string;
  /** When the screening was last completed. ISO date string. */
  lastCompletedAt: string | null;
  /** Patient declined / no-longer-recommended toggle. */
  declined?: boolean;
  /** Optional note from the clinician (e.g., "after surgical menopause"). */
  note?: string;
}

export interface ScreeningEvaluation {
  screening: Screening;
  status: ScreeningStatus;
  /** Human-readable next-due date (or null if N/A). */
  nextDueAt: string | null;
  /** Days overdue (positive) or days until due (negative). null = N/A. */
  daysOffset: number | null;
  /** Patient-facing emoji combination — used in the checklist UI. */
  emojiBadge: string;
  /** Three-grade-reading-level patient-facing message. */
  patientMessage: string;
  /** Cliical-language one-liner for the punch list. */
  clinicianMessage: string;
}

export interface ScreeningProfile {
  age: number | null;
  sex: string | null;
}

const DEFAULT_INTERVAL_MONTHS_BY_FREQUENCY: Record<string, number> = {
  "Every 10 years": 120,
  "Every 5 years": 60,
  "Every 3 years": 36,
  "Every 3–5 years": 36, // be conservative
  "Every 2 years": 24,
  Annually: 12,
};

function intervalMonths(s: Screening): number {
  return DEFAULT_INTERVAL_MONTHS_BY_FREQUENCY[s.frequency] ?? 12;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function statusEmoji(status: ScreeningStatus): string {
  switch (status) {
    case "current":
      return "✅";
    case "due":
      return "⏰";
    case "overdue":
      return "🚨";
    case "patient_declined":
      return "🙅";
    case "not_applicable":
      return "➖";
  }
}

export function evaluateScreening(
  s: Screening,
  profile: ScreeningProfile,
  history?: PatientScreeningHistory,
): ScreeningEvaluation {
  const applicable = s.isDue(profile.age, profile.sex);
  if (!applicable) {
    return {
      screening: s,
      status: "not_applicable",
      nextDueAt: null,
      daysOffset: null,
      emojiBadge: `${s.emoji} ${statusEmoji("not_applicable")}`,
      patientMessage: `Not on your list right now — ${s.label.toLowerCase()} is for a different age/sex group.`,
      clinicianMessage: `${s.label}: not applicable for this patient profile.`,
    };
  }

  if (history?.declined) {
    return {
      screening: s,
      status: "patient_declined",
      nextDueAt: null,
      daysOffset: null,
      emojiBadge: `${s.emoji} ${statusEmoji("patient_declined")}`,
      patientMessage: `${s.label}: you've chosen to skip this. We'll respect that and re-ask next year.`,
      clinicianMessage: `${s.label}: patient declined${
        history.note ? ` — "${history.note}"` : ""
      }. Re-offer at next annual.`,
    };
  }

  const months = intervalMonths(s);
  const today = new Date();
  let dueDate: Date;
  let daysOffset: number | null;
  let status: ScreeningStatus;

  if (history?.lastCompletedAt) {
    const last = new Date(history.lastCompletedAt);
    dueDate = new Date(last);
    dueDate.setMonth(dueDate.getMonth() + months);
    daysOffset = daysBetween(today, dueDate);
    if (daysOffset > 90) status = "overdue";
    else if (daysOffset >= -30) status = "due";
    else status = "current";
  } else {
    // Never done — treat as due now.
    dueDate = today;
    daysOffset = 0;
    status = "due";
  }

  let patientMessage: string;
  let clinicianMessage: string;
  if (status === "current") {
    patientMessage = `${s.label} done — see you in ${Math.round(
      Math.abs(daysOffset! / 30),
    )} month${Math.abs(daysOffset!) > 30 ? "s" : ""}!`;
    clinicianMessage = `${s.label}: current. Next due ${dueDate
      .toISOString()
      .slice(0, 10)}.`;
  } else if (status === "due") {
    patientMessage = `${s.label} is up next — let's get this done at your visit.`;
    clinicianMessage = `${s.label}: due now (${s.frequency.toLowerCase()}). USPSTF Grade ${s.grade}.`;
  } else {
    const overdueDays = daysOffset!;
    patientMessage = `${s.label} is ${overdueDays} days overdue. Let's schedule it ASAP.`;
    clinicianMessage = `${s.label}: OVERDUE by ${overdueDays} days. USPSTF Grade ${s.grade}.`;
  }

  return {
    screening: s,
    status,
    nextDueAt: dueDate.toISOString(),
    daysOffset,
    emojiBadge: `${s.emoji} ${statusEmoji(status)}`,
    patientMessage,
    clinicianMessage,
  };
}

// ---------------------------------------------------------------------------
// Profile-level rollups
// ---------------------------------------------------------------------------

export interface ScreeningRollup {
  evaluations: ScreeningEvaluation[];
  /** Just the items needing attention (due / overdue), sorted overdue-first. */
  punchList: ScreeningEvaluation[];
  /** Patient-facing checklist with emojis. */
  checklist: Array<{ id: string; label: string; emoji: string; status: ScreeningStatus }>;
  /** Health-maintenance score 0–100. 100 = everything current. */
  healthMaintenanceScore: number;
}

export function evaluateAllScreenings(
  profile: ScreeningProfile,
  history: PatientScreeningHistory[],
): ScreeningRollup {
  const byId = new Map(history.map((h) => [h.screeningId, h]));
  const evaluations = SCREENINGS.map((s) =>
    evaluateScreening(s, profile, byId.get(s.id)),
  );

  const applicable = evaluations.filter((e) => e.status !== "not_applicable");
  const overdue = applicable.filter((e) => e.status === "overdue").length;
  const due = applicable.filter((e) => e.status === "due").length;
  const denominator = applicable.length || 1;
  const score = Math.max(
    0,
    Math.round(((denominator - overdue * 1.0 - due * 0.5) / denominator) * 100),
  );

  const SEVERITY: Record<ScreeningStatus, number> = {
    overdue: 3,
    due: 2,
    patient_declined: 1,
    current: 0,
    not_applicable: -1,
  };

  const punchList = applicable
    .filter((e) => e.status === "due" || e.status === "overdue")
    .sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]);

  const checklist = applicable.map((e) => ({
    id: e.screening.id,
    label: e.screening.label,
    emoji: e.emojiBadge,
    status: e.status,
  }));

  return { evaluations, punchList, checklist, healthMaintenanceScore: score };
}

// ---------------------------------------------------------------------------
// Convenience: AI fairytale-summary friendly text
// ---------------------------------------------------------------------------

export function fairytaleScreeningParagraph(rollup: ScreeningRollup): string {
  const overdue = rollup.evaluations.filter((e) => e.status === "overdue");
  const due = rollup.evaluations.filter((e) => e.status === "due");
  if (overdue.length === 0 && due.length === 0) {
    return "All recommended preventive checks are up to date — fantastic work staying ahead of things. 🌟";
  }
  const parts: string[] = [];
  if (overdue.length > 0) {
    parts.push(
      `These check-ups are overdue and need attention soon: ${overdue
        .map((e) => `${e.screening.emoji} ${e.screening.label}`)
        .join(", ")}.`,
    );
  }
  if (due.length > 0) {
    parts.push(
      `These are due at the next visit: ${due
        .map((e) => `${e.screening.emoji} ${e.screening.label}`)
        .join(", ")}.`,
    );
  }
  return parts.join(" ");
}

// Pass-through so callers that want the raw catalogue don't need a 2nd import.
export { SCREENINGS, dueScreenings };
export type { Screening };

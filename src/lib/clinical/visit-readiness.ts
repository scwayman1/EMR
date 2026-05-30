import type { Encounter } from "@prisma/client";

/**
 * visit-readiness — physician-facing rooming/pre-visit handoff summary.
 *
 * Derives a compact, non-PHI-leaking readiness snapshot from the encounter's
 * `briefingContext` (written by front-desk/pre-visit/rooming surfaces) plus the
 * encounter's own timing fields. Used to surface "is this patient ready?" on the
 * chart / note-start path so the physician sees the rooming handoff before
 * documenting. Pure function — easy to unit test and safe to call from a Server
 * Component or action.
 */
export interface VisitReadiness {
  hasEncounter: boolean;
  scheduledFor: string | null;
  started: boolean;
  intakeCompleted: boolean;
  patientConfirmed: boolean;
  briefingReady: boolean;
  patientDemeanor: string | null;
  reminderSent: boolean;
  /** Compact one-line handoff for a chart/note-start header chip. */
  handoffLine: string;
}

type ReadyEncounter = Pick<
  Encounter,
  "status" | "scheduledFor" | "startedAt" | "briefingContext"
>;

export function summarizeVisitReadiness(
  encounter: ReadyEncounter | null,
): VisitReadiness {
  if (!encounter) {
    return {
      hasEncounter: false,
      scheduledFor: null,
      started: false,
      intakeCompleted: false,
      patientConfirmed: false,
      briefingReady: false,
      patientDemeanor: null,
      reminderSent: false,
      handoffLine: "No encounter scheduled today",
    };
  }

  const ctx =
    encounter.briefingContext && typeof encounter.briefingContext === "object"
      ? (encounter.briefingContext as Record<string, unknown>)
      : {};

  const intakeCompleted = ctx.intakeCompleted === true;
  const patientConfirmed = typeof ctx.patientConfirmedAt === "string" && ctx.patientConfirmedAt.length > 0;
  const briefingReady = typeof ctx.patientSummary === "string" && ctx.patientSummary.length > 0;
  const patientDemeanor =
    typeof ctx.patientDemeanor === "string" && ctx.patientDemeanor.length > 0
      ? ctx.patientDemeanor
      : null;
  const reminderSent = typeof ctx.reminderSentAt === "string" && ctx.reminderSentAt.length > 0;
  const started = encounter.status === "in_progress" || encounter.startedAt != null;

  // Compact, non-PHI handoff chip text. Order from "front desk" → "pre-visit".
  const parts: string[] = [];
  parts.push(intakeCompleted ? "Intake complete" : "Intake pending");
  if (patientConfirmed) parts.push("Confirmed");
  if (briefingReady) parts.push("Briefing ready");
  if (patientDemeanor) parts.push(`Demeanor: ${patientDemeanor}`);
  const handoffLine = parts.join(" · ");

  return {
    hasEncounter: true,
    scheduledFor: encounter.scheduledFor ? encounter.scheduledFor.toISOString() : null,
    started,
    intakeCompleted,
    patientConfirmed,
    briefingReady,
    patientDemeanor,
    reminderSent,
    handoffLine,
  };
}

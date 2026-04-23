/**
 * Clinical Observation helpers.
 *
 * When an agent notices something worth a physician's eyes — a trend, a
 * red flag, a positive signal, an adherence concern — it records a
 * ClinicalObservation. The observation is evidence-backed (references
 * to specific messages, outcome logs, notes) and has a severity level
 * that drives how prominently it surfaces in the UI.
 *
 * Observations are the "what your team is noticing" feed. They are
 * distinct from PatientMemory in one important way: memories are
 * interpretations of the patient's life, observations are specific
 * moments in time. An observation may become a memory when it stabilizes
 * into a pattern.
 */

import { prisma } from "@/lib/db/prisma";
import type {
  ClinicalObservation,
  ObservationCategory,
  ObservationSeverity,
} from "@prisma/client";

/** What a caller passes when recording a new observation. */
export interface RecordObservationInput {
  patientId: string;
  observedBy: string; // agent name or user id
  observedByKind: "agent" | "user";
  category: ObservationCategory;
  severity?: ObservationSeverity;
  /** 1-2 sentences, human-readable. */
  summary: string;
  /** Optional evidence references. Shape is free but should be stable. */
  evidence?: {
    messageIds?: string[];
    noteIds?: string[];
    outcomeLogIds?: string[];
    encounterIds?: string[];
    memoryIds?: string[];
  };
  /** Optional physician-facing nudge. e.g. "Consider scheduling a check-in." */
  actionSuggested?: string;
  metadata?: Record<string, unknown>;
}

export async function recordObservation(
  input: RecordObservationInput,
): Promise<ClinicalObservation> {
  return prisma.clinicalObservation.create({
    data: {
      patientId: input.patientId,
      observedBy: input.observedBy,
      observedByKind: input.observedByKind,
      category: input.category,
      severity: input.severity ?? "info",
      summary: input.summary.trim(),
      evidence: (input.evidence ?? {}) as any,
      actionSuggested: input.actionSuggested ?? null,
      metadata: (input.metadata ?? null) as any,
    },
  });
}

/** Query options for recent-observations lookups. */
export interface RecallObservationsOptions {
  categories?: ObservationCategory[];
  minSeverity?: ObservationSeverity;
  /** Only unacknowledged by the physician. */
  onlyUnacknowledged?: boolean;
  /** Only unresolved. */
  onlyOpen?: boolean;
  limit?: number;
}

const SEVERITY_ORDER: Record<ObservationSeverity, number> = {
  info: 0,
  notable: 1,
  concern: 2,
  urgent: 3,
};

export async function recallObservations(
  patientId: string,
  options: RecallObservationsOptions = {},
): Promise<ClinicalObservation[]> {
  const where: any = { patientId };
  if (options.categories && options.categories.length > 0) {
    where.category = { in: options.categories };
  }
  if (options.onlyUnacknowledged) {
    where.acknowledgedAt = null;
  }
  if (options.onlyOpen) {
    where.resolvedAt = null;
  }
  const rows = await prisma.clinicalObservation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 30,
  });
  if (options.minSeverity) {
    const minRank = SEVERITY_ORDER[options.minSeverity];
    return rows.filter((r) => SEVERITY_ORDER[r.severity] >= minRank);
  }
  return rows;
}

/**
 * Mark an observation as acknowledged by a physician. This is the
 * "I've seen it, I'm on it" signal — after acknowledgement the
 * observation drops off the "needs attention" queues but stays in the
 * historical record.
 */
export async function acknowledgeObservation(
  observationId: string,
  reviewerId: string,
): Promise<void> {
  await prisma.clinicalObservation.update({
    where: { id: observationId },
    data: {
      acknowledgedBy: reviewerId,
      acknowledgedAt: new Date(),
    },
  });
}

/**
 * Mark an observation as resolved — the underlying concern is no longer
 * relevant (symptom passed, side effect cleared, trend reversed).
 */
export async function resolveObservation(observationId: string): Promise<void> {
  await prisma.clinicalObservation.update({
    where: { id: observationId },
    data: { resolvedAt: new Date() },
  });
}

/** Render observations as a compact prompt block for agent context. */
export function formatObservationsForPrompt(
  observations: ClinicalObservation[],
): string {
  if (observations.length === 0) {
    return "(no recent clinical observations recorded)";
  }
  return observations
    .slice(0, 10)
    .map((o) => {
      const prefix =
        o.severity === "urgent"
          ? "🚨"
          : o.severity === "concern"
            ? "⚠"
            : o.severity === "notable"
              ? "●"
              : "·";
      return `${prefix} [${o.category}] ${o.summary}`;
    })
    .join("\n");
}

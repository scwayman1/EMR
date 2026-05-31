import { prisma } from "@/lib/db/prisma";
import type { Encounter, EncounterStatus } from "@prisma/client";

/**
 * visit-state — physician-workflow visit spine (coordination shim).
 *
 * COORDINATION CONTRACT (hardening sprint): Codex owns the canonical
 * visit-state spine. The two exported functions below — `selectActiveVisitEncounter`
 * and `advanceVisitState` — are the agreed integration surface. If Codex lands a
 * richer implementation in this same file, the *signatures* here are the contract
 * to preserve; the physician-workflow callers (startVisit, startVisitWithBriefing,
 * finalizeNote) only depend on these signatures, not the internals.
 *
 * Reality check: EncounterStatus is a 4-value Prisma enum
 * (scheduled | in_progress | complete | cancelled). "roomed / ready / checked_in"
 * are queue-board *view* states (src/lib/domain/queue-board.ts) that map onto a
 * persisted `scheduled` (or `in_progress`) encounter — they are NOT distinct DB
 * statuses today. Selection therefore reuses today's non-terminal encounter.
 */

/** Non-terminal encounter statuses representing an active/pending visit today. */
export const ACTIVE_VISIT_STATUSES = ["scheduled", "in_progress"] as const;

/** Logical visit phases callers can advance an encounter into. */
export type VisitPhase = "in_visit" | "wrap_up" | "complete";

/**
 * Queue-board view statuses — these are NOT persisted DB statuses.
 * They map onto scheduled/in_progress encounter rows and are used
 * by front-office to track where a patient is in the physical flow.
 */
export const VISIT_SPINE_STATUSES = [
  "scheduled",
  "checked_in",
  "info_incomplete",
  "ready",
  "rooming",
  "roomed",
  "in_visit",
  "wrap_up",
  "complete",
  "cancelled",
  "no_show",
] as const;

export type VisitSpineStatus = (typeof VISIT_SPINE_STATUSES)[number];

/** Result type for synchronous queue-board transitions. */
export type QueueTransitionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

const ALLOWED_QUEUE_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  scheduled: new Set(["checked_in", "info_incomplete", "ready", "in_visit", "cancelled", "no_show"]),
  checked_in: new Set(["info_incomplete", "ready", "rooming", "in_visit", "cancelled", "no_show"]),
  info_incomplete: new Set(["ready", "in_visit", "cancelled", "no_show"]),
  ready: new Set(["rooming", "roomed", "in_visit", "cancelled", "no_show"]),
  rooming: new Set(["roomed", "ready", "in_visit", "cancelled"]),
  roomed: new Set(["in_visit", "wrap_up", "cancelled"]),
  in_visit: new Set(["wrap_up", "complete", "cancelled"]),
  in_progress: new Set(["in_visit", "wrap_up", "complete", "cancelled"]),
  wrap_up: new Set(["complete", "in_visit"]),
  complete: new Set([]),
  cancelled: new Set([]),
  no_show: new Set([]),
};

const QUEUE_TIMESTAMP_MAP: Record<string, string> = {
  checked_in: "checkedInAt",
  info_incomplete: "checkedInAt",
  ready: "checkedInAt",
  rooming: "roomingStartedAt",
  roomed: "roomedAt",
  in_visit: "startedAt",
  wrap_up: "wrapUpAt",
  complete: "completedAt",
  cancelled: "cancelledAt",
  no_show: "noShowAt",
};

/**
 * Synchronous queue-board transition validator. Returns `{ ok: true, data }`
 * with the fields to write to the encounter row, or `{ ok: false, error }` when
 * the transition is disallowed. Used by the queue actions server action and
 * the kiosk check-in route — neither of which needs the full physician-workflow
 * async `advanceVisitState`.
 */
export function computeQueueTransition(
  encounter: { status: string },
  target: VisitSpineStatus,
  now: Date = new Date(),
): QueueTransitionResult {
  if (encounter.status === target) {
    return { ok: true, data: { status: target } };
  }

  const allowed = ALLOWED_QUEUE_TRANSITIONS[encounter.status];
  if (!allowed?.has(target)) {
    return {
      ok: false,
      error: `Cannot transition visit from ${encounter.status} to ${target}.`,
    };
  }

  const tsField = QUEUE_TIMESTAMP_MAP[target];
  const data: Record<string, unknown> = { status: target };
  if (tsField) data[tsField] = now;
  return { ok: true, data };
}

export interface AdvanceResult {
  encounter: Encounter;
  /**
   * True only when this call actually changed the encounter's DB status.
   * Callers gate one-shot side effects (event dispatch) on this so the
   * transition into a state fires downstream automation exactly once.
   */
  transitioned: boolean;
}

function dayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Find the encounter a physician should open for today's visit, preferring an
 * already in-progress encounter and otherwise reusing today's earliest
 * scheduled (incl. checked-in/roomed via the queue) encounter — BEFORE any
 * caller mints a brand-new one. Returns null when the patient has no active
 * encounter today, in which case the caller creates one.
 *
 * Matches the existing-but-correct selection in generateBriefing
 * (prepare/actions.ts) so start-visit and briefing agree on the same row.
 */
export async function selectActiveVisitEncounter(
  patientId: string,
  organizationId: string,
  opts: { now?: Date } = {},
): Promise<Encounter | null> {
  const now = opts.now ?? new Date();
  const { start, end } = dayBounds(now);

  const candidates = await prisma.encounter.findMany({
    where: {
      patientId,
      organizationId,
      status: { in: ["scheduled", "in_progress"] },
      // "today" by either the scheduled time or the row's creation — a
      // walk-in has no scheduledFor; a pre-booked visit has no same-day
      // createdAt.
      OR: [
        { scheduledFor: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } },
      ],
    },
    orderBy: { scheduledFor: "asc" },
  });

  if (candidates.length === 0) return null;

  // An already-started visit is THE active encounter; otherwise the earliest
  // scheduled one for today.
  return candidates.find((e) => e.status === "in_progress") ?? candidates[0];
}

const PHASE_TO_STATUS: Record<VisitPhase, EncounterStatus> = {
  in_visit: "in_progress",
  // No distinct DB status for wrap-up yet; the queue treats it as still
  // in_progress. Codex's canonical spine may introduce one.
  wrap_up: "in_progress",
  complete: "complete",
};

/**
 * Move an encounter to the given visit phase idempotently. Returns
 * `transitioned: false` (leaving the row untouched) when it is already in the
 * target DB status, so callers can gate one-shot side effects — note/encounter
 * event dispatch — on an actual state change. Never reads or writes
 * briefingContext / rooming data.
 */
export async function advanceVisitState(
  encounter: Pick<Encounter, "id" | "status" | "startedAt">,
  phase: VisitPhase,
  // Accepted for the coordination contract + future audit trail; the canonical
  // spine should stamp who advanced the visit.
  _actorUserId: string,
  opts: { at?: Date } = {},
): Promise<AdvanceResult> {
  const at = opts.at ?? new Date();
  const target = PHASE_TO_STATUS[phase];

  if (encounter.status === target) {
    return { encounter: encounter as Encounter, transitioned: false };
  }

  const data: { status: EncounterStatus; startedAt?: Date; completedAt?: Date } = {
    status: target,
  };
  if (target === "in_progress" && !encounter.startedAt) data.startedAt = at;
  if (target === "complete") data.completedAt = at;

  const updated = await prisma.encounter.update({
    where: { id: encounter.id },
    data,
  });
  return { encounter: updated, transitioned: true };
}

/** Resolve the Provider row for a user within an org (null if they aren't a provider). */
export async function resolveProviderForUser(
  userId: string,
  organizationId: string,
): Promise<{ id: string } | null> {
  return prisma.provider.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
}

/**
 * Record who is actually rendering the visit WITHOUT stealing a scheduled
 * encounter's ownership:
 *  - encounter.providerId is null  → claim it (providerId = currentProviderId)
 *  - belongs to a DIFFERENT provider → preserve it, stamp renderingProviderId
 *  - already this provider, or no Provider row for the user → no-op
 * Returns the (possibly updated) encounter.
 */
export async function assignVisitProvider(
  encounter: Encounter,
  currentProviderId: string | null,
): Promise<Encounter> {
  if (!currentProviderId) return encounter;

  if (!encounter.providerId) {
    return prisma.encounter.update({
      where: { id: encounter.id },
      data: { providerId: currentProviderId },
    });
  }

  if (
    encounter.providerId !== currentProviderId &&
    encounter.renderingProviderId !== currentProviderId
  ) {
    return prisma.encounter.update({
      where: { id: encounter.id },
      data: { renderingProviderId: currentProviderId },
    });
  }

  return encounter;
}

import { prisma } from "@/lib/db/prisma";
import type { Encounter } from "@prisma/client";

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
export type LegacyVisitStatus = "in_progress";
export type VisitStatus = VisitSpineStatus | LegacyVisitStatus;
export type VisitPhase = "in_visit" | "wrap_up" | "complete";

export const ACTIVE_VISIT_STATUSES = [
  "scheduled",
  "checked_in",
  "info_incomplete",
  "ready",
  "rooming",
  "roomed",
  "in_visit",
  "wrap_up",
  "in_progress",
] as const satisfies readonly VisitStatus[];

export interface VisitStateFields {
  id?: string;
  status: string;
  checkedInAt?: Date | null;
  roomingStartedAt?: Date | null;
  roomedAt?: Date | null;
  startedAt?: Date | null;
  wrapUpAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  noShowAt?: Date | null;
}

export type VisitTransitionResult =
  | { ok: true; data: Partial<VisitStateFields> }
  | { ok: false; error: string };

export interface AdvanceResult {
  encounter: Encounter;
  transitioned: boolean;
}

const STATUS_SET = new Set<string>(VISIT_SPINE_STATUSES);

const ALLOWED_TRANSITIONS: Record<string, ReadonlySet<VisitSpineStatus>> = {
  scheduled: new Set([
    "checked_in",
    "info_incomplete",
    "ready",
    "in_visit",
    "cancelled",
    "no_show",
  ]),
  checked_in: new Set(["info_incomplete", "ready", "rooming", "in_visit", "cancelled", "no_show"]),
  info_incomplete: new Set(["ready", "in_visit", "cancelled", "no_show"]),
  ready: new Set(["rooming", "roomed", "in_visit", "cancelled", "no_show"]),
  rooming: new Set(["roomed", "ready", "in_visit", "cancelled"]),
  roomed: new Set(["in_visit", "wrap_up", "cancelled"]),
  in_visit: new Set(["wrap_up", "complete", "cancelled"]),
  wrap_up: new Set(["complete", "in_visit"]),
  complete: new Set([]),
  cancelled: new Set([]),
  no_show: new Set([]),
  in_progress: new Set(["in_visit", "wrap_up", "complete", "cancelled"]),
};

const ACTIVE_VISIT_PRIORITY: Record<string, number> = {
  in_visit: 0,
  in_progress: 1,
  wrap_up: 2,
  roomed: 3,
  rooming: 4,
  ready: 5,
  checked_in: 6,
  info_incomplete: 7,
  scheduled: 8,
};

export function isVisitSpineStatus(value: string): value is VisitSpineStatus {
  return STATUS_SET.has(value);
}

export function advanceVisitState(
  current: VisitStateFields,
  target: VisitSpineStatus,
  now?: Date,
): VisitTransitionResult;
export function advanceVisitState(
  encounter: Pick<Encounter, "id" | "status" | "startedAt">,
  phase: VisitPhase,
  actorUserId: string,
  opts?: { at?: Date },
): Promise<AdvanceResult>;
export function advanceVisitState(
  current: VisitStateFields,
  target: VisitSpineStatus | VisitPhase,
  nowOrActor: Date | string = new Date(),
  opts: { at?: Date } = {},
): VisitTransitionResult | Promise<AdvanceResult> {
  if (typeof nowOrActor === "string") {
    return advanceEncounterVisitState(current, target as VisitPhase, opts);
  }

  return computeVisitTransition(current, target as VisitSpineStatus, nowOrActor);
}

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
      status: { in: [...ACTIVE_VISIT_STATUSES] },
      OR: [
        { scheduledFor: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } },
      ],
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
  });

  if (candidates.length === 0) return null;

  return [...candidates].sort(compareActiveEncounters)[0] ?? null;
}

export async function resolveProviderForUser(
  userId: string,
  organizationId: string,
): Promise<{ id: string } | null> {
  return prisma.provider.findFirst({
    where: { userId, organizationId },
    select: { id: true },
  });
}

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

async function advanceEncounterVisitState(
  encounter: VisitStateFields,
  phase: VisitPhase,
  opts: { at?: Date } = {},
): Promise<AdvanceResult> {
  if (!encounter.id) {
    throw new Error("Encounter id is required to advance visit state.");
  }

  if (encounter.status === phase) {
    return { encounter: encounter as Encounter, transitioned: false };
  }

  const at = opts.at ?? new Date();
  const transition = computeVisitTransition(encounter, phase, at);
  if (!transition.ok) {
    throw new Error(transition.error);
  }

  const data = omitUnchangedTimestamps(encounter, transition.data);
  const updated = await prisma.encounter.update({
    where: { id: encounter.id },
    data: data as any,
  });

  return { encounter: updated, transitioned: true };
}

function omitUnchangedTimestamps(
  current: VisitStateFields,
  data: Partial<VisitStateFields>,
): Partial<VisitStateFields> {
  const next = { ...data };
  const timestampFields: Array<keyof VisitStateFields> = [
    "checkedInAt",
    "roomingStartedAt",
    "roomedAt",
    "startedAt",
    "wrapUpAt",
    "completedAt",
    "cancelledAt",
    "noShowAt",
  ];

  for (const field of timestampFields) {
    const currentValue = current[field];
    const nextValue = next[field];
    if (
      currentValue instanceof Date &&
      nextValue instanceof Date &&
      currentValue.getTime() === nextValue.getTime()
    ) {
      delete next[field];
    }
  }

  return next;
}

function computeVisitTransition(
  current: VisitStateFields,
  target: VisitSpineStatus,
  now: Date = new Date(),
): VisitTransitionResult {
  if (current.status === target) {
    return {
      ok: true,
      data: {
        status: target,
        ...applyTimestamp(current, target, now),
      },
    };
  }

  const allowed = ALLOWED_TRANSITIONS[current.status];
  if (!allowed?.has(target)) {
    return {
      ok: false,
      error: `Cannot transition visit from ${current.status} to ${target}.`,
    };
  }

  return {
    ok: true,
    data: {
      status: target,
      ...applyTimestamp(current, target, now),
    },
  };
}

function applyTimestamp(
  current: VisitStateFields,
  target: VisitSpineStatus,
  now: Date,
): Partial<VisitStateFields> {
  switch (target) {
    case "checked_in":
    case "info_incomplete":
    case "ready":
      return { checkedInAt: current.checkedInAt ?? now };
    case "rooming":
      return { roomingStartedAt: current.roomingStartedAt ?? now };
    case "roomed":
      return { roomedAt: current.roomedAt ?? now };
    case "in_visit":
      return { startedAt: current.startedAt ?? now };
    case "wrap_up":
      return { wrapUpAt: current.wrapUpAt ?? now };
    case "complete":
      return { completedAt: current.completedAt ?? now };
    case "cancelled":
      return { cancelledAt: current.cancelledAt ?? now };
    case "no_show":
      return { noShowAt: current.noShowAt ?? now };
    case "scheduled":
      return {};
  }
}

function dayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function compareActiveEncounters(a: Encounter, b: Encounter): number {
  const statusOrder =
    (ACTIVE_VISIT_PRIORITY[a.status] ?? Number.MAX_SAFE_INTEGER) -
    (ACTIVE_VISIT_PRIORITY[b.status] ?? Number.MAX_SAFE_INTEGER);
  if (statusOrder !== 0) return statusOrder;

  return encounterSortTime(a) - encounterSortTime(b);
}

function encounterSortTime(encounter: Encounter): number {
  return (encounter.scheduledFor ?? encounter.createdAt).getTime();
}

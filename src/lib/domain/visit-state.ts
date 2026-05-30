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

export interface VisitStateFields {
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

const STATUS_SET = new Set<string>(VISIT_SPINE_STATUSES);

const ALLOWED_TRANSITIONS: Record<string, ReadonlySet<VisitSpineStatus>> = {
  scheduled: new Set(["checked_in", "info_incomplete", "ready", "cancelled", "no_show"]),
  checked_in: new Set(["info_incomplete", "ready", "rooming", "cancelled", "no_show"]),
  info_incomplete: new Set(["ready", "cancelled", "no_show"]),
  ready: new Set(["rooming", "roomed", "in_visit", "cancelled", "no_show"]),
  rooming: new Set(["roomed", "ready", "cancelled"]),
  roomed: new Set(["in_visit", "wrap_up", "cancelled"]),
  in_visit: new Set(["wrap_up", "complete", "cancelled"]),
  wrap_up: new Set(["complete", "in_visit"]),
  complete: new Set([]),
  cancelled: new Set([]),
  no_show: new Set([]),
  in_progress: new Set(["in_visit", "wrap_up", "complete", "cancelled"]),
};

export function isVisitSpineStatus(value: string): value is VisitSpineStatus {
  return STATUS_SET.has(value);
}

export function advanceVisitState(
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

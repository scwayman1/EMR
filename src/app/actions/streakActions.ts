"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  advanceStreak,
  emptyStreakRecord,
  STREAK_ACTIVITY_KINDS,
  type StreakActivityKind,
  type StreakRecord,
} from "@/lib/domain/streaks";

/**
 * recordStreakActivity — idempotent, per-day streak advance.
 *
 * Call this from the dose-log, emoji check-in, and weekly outcome server
 * actions after the underlying row is persisted. It is intentionally
 * NOT wired into those callers in this branch (tracked as a follow-up
 * ticket) so streaks can ship independently and be backfilled.
 *
 * Authorization: patient must live in the caller's organization. The
 * existence + org check is expressed in a single query via
 * `findFirst({ where: { id, organizationId } })`.
 *
 * Idempotency: advanceStreak is pure and same-day re-entry is a no-op,
 * so duplicate calls inside one UTC day are safe.
 */

export type RecordStreakResult =
  | { ok: true; record: SerializableStreakRecord }
  | { ok: false; error: string };

/**
 * Wire-safe shape — Dates serialized to ISO strings so this can be
 * returned across the server/client boundary.
 */
export interface SerializableStreakRecord {
  patientId: string;
  activityKind: StreakActivityKind;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityDate: string | null;
}

const recordSchema = z.object({
  patientId: z.string().min(1),
  kind: z.enum(STREAK_ACTIVITY_KINDS as unknown as [StreakActivityKind, ...StreakActivityKind[]]),
});

export async function recordStreakActivity(
  patientId: string,
  kind: StreakActivityKind,
  /** Override the activity timestamp. Defaults to now. Exposed for tests and backfill. */
  activityAt: Date = new Date(),
): Promise<RecordStreakResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Unauthorized." };
  }

  if (!user.organizationId) {
    return { ok: false, error: "No organization on session." };
  }

  const parsed = recordSchema.safeParse({ patientId, kind });
  if (!parsed.success) {
    return { ok: false, error: "Invalid streak activity payload." };
  }

  // Verify the patient belongs to the caller's org before touching the
  // streak table — the FK alone wouldn't enforce org scoping.
  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!patient) {
    return { ok: false, error: "Patient not found in your organization." };
  }

  try {
    const existing = await prisma.streakRecord.findUnique({
      where: {
        patientId_activityKind: {
          patientId: parsed.data.patientId,
          activityKind: parsed.data.kind,
        },
      },
    });

    const current: StreakRecord = existing
      ? {
          patientId: existing.patientId,
          activityKind: existing.activityKind as StreakActivityKind,
          currentStreakDays: existing.currentStreakDays,
          longestStreakDays: existing.longestStreakDays,
          lastActivityDate: existing.lastActivityDate,
        }
      : emptyStreakRecord(parsed.data.patientId, parsed.data.kind);

    const next = advanceStreak(current, activityAt);

    const saved = await prisma.streakRecord.upsert({
      where: {
        patientId_activityKind: {
          patientId: parsed.data.patientId,
          activityKind: parsed.data.kind,
        },
      },
      create: {
        patientId: parsed.data.patientId,
        activityKind: parsed.data.kind,
        currentStreakDays: next.currentStreakDays,
        longestStreakDays: next.longestStreakDays,
        lastActivityDate: next.lastActivityDate,
      },
      update: {
        currentStreakDays: next.currentStreakDays,
        longestStreakDays: next.longestStreakDays,
        lastActivityDate: next.lastActivityDate,
      },
    });

    return {
      ok: true,
      record: {
        patientId: saved.patientId,
        activityKind: saved.activityKind as StreakActivityKind,
        currentStreakDays: saved.currentStreakDays,
        longestStreakDays: saved.longestStreakDays,
        lastActivityDate: saved.lastActivityDate?.toISOString() ?? null,
      },
    };
  } catch (err) {
    console.error("[streaks] record failed", err);
    return { ok: false, error: "Could not record streak activity." };
  }
}

/**
 * Server-side fetch for rendering the streak summary card. Returns every
 * streak kind — filling in empty zero-records for kinds the patient has
 * never logged — so the UI can render a complete grid of pills.
 */
export async function getStreakSummary(
  patientId: string,
): Promise<SerializableStreakRecord[]> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return [];
  }
  if (!user.organizationId) return [];

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!patient) return [];

  const rows = await prisma.streakRecord.findMany({
    where: { patientId },
  });

  const byKind = new Map<StreakActivityKind, SerializableStreakRecord>();
  for (const row of rows) {
    byKind.set(row.activityKind as StreakActivityKind, {
      patientId: row.patientId,
      activityKind: row.activityKind as StreakActivityKind,
      currentStreakDays: row.currentStreakDays,
      longestStreakDays: row.longestStreakDays,
      lastActivityDate: row.lastActivityDate?.toISOString() ?? null,
    });
  }

  return STREAK_ACTIVITY_KINDS.map(
    (kind) =>
      byKind.get(kind) ?? {
        patientId,
        activityKind: kind,
        currentStreakDays: 0,
        longestStreakDays: 0,
        lastActivityDate: null,
      },
  );
}

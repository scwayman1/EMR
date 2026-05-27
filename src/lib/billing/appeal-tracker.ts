/**
 * Appeal lifecycle tracker — EMR-228
 * --------------------------------------------------------------
 * The outcome-learning math lives in `appeal-outcomes.ts`; the
 * outcome-persistence path lives in `appeal-outcome-tracker.ts`.
 * This file owns the *lifecycle* — queueing, deadline math,
 * escalation, and SLA accounting:
 *
 *   - `queueAppealForDenial` — turn a fresh denial into a draft
 *     `AppealPacket` with the deadline pre-computed.
 *   - `appealDeadline` — payer-aware filing window math (typically
 *     180d from EOB date, but Medicare/Medicaid differ).
 *   - `appealsQueue` — operator-dashboard read: every appeal that
 *     isn't resolved, sorted by urgency (deadline + dollars).
 *   - `markSubmitted` — flip draft → submitted with the `submittedAt`
 *     stamp and the SLA clock for "no_response".
 *   - `noResponseSweep` — cron: any appeal still in `submitted`
 *     past its SLA gets a `no_response` outcome auto-recorded.
 *
 *  Reads/writes Prisma; the pure ranking lives next door so this
 *  file can stay focused on the calendar / queue side.
 */

import { prisma } from "@/lib/db/prisma";
import type { AppealPacket, AppealStatus, DenialEvent, Prisma } from "@prisma/client";
import { suggestArgumentForDenial } from "./appeal-outcome-tracker";
import { persistAppealOutcome } from "./appeal-outcome-tracker";
import { resolvePayerRule } from "./payer-rules";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default first-level appeal window when payer-rules don't override. */
export const DEFAULT_APPEAL_DEADLINE_DAYS = 180;

/** Soft SLA we use to mark `no_response` if the payer never replies. */
export const NO_RESPONSE_SLA_DAYS = 60;

/** Urgency thresholds — drives the queue sort + UI tone. */
export const URGENCY_THRESHOLDS = {
  due_in_7d: 7,
  due_in_30d: 30,
} as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AppealUrgency = "overdue" | "due_in_7d" | "due_in_30d" | "ok";

export interface QueueAppealInput {
  organizationId: string;
  denialEventId: string;
  /** When the EOB landed; appeal window typically counts from this. */
  eobReceivedAt: Date;
  /** Optional override for the deadline — Medicare/state plans differ. */
  deadlineOverride?: Date;
  appealLevel?: number;
}

export interface QueuedAppeal {
  packet: AppealPacket;
  deadline: Date;
  suggestedTopArgument: string | null;
}

export interface AppealQueueRow {
  packetId: string;
  claimId: string;
  patientId: string;
  payerName: string;
  appealLevel: number;
  status: AppealStatus;
  deniedCents: number;
  carcCode: string | null;
  deadline: Date;
  daysToDeadline: number;
  urgency: AppealUrgency;
  createdAt: Date;
  submittedAt: Date | null;
}

// ---------------------------------------------------------------------------
// Deadline math
// ---------------------------------------------------------------------------

/** First-level appeal deadline. Reads payer-rules — Medicare is 120d,
 *  most commercial 180d, BCBS 60–180 by state. */
export function appealDeadline(args: {
  payerId: string | null;
  payerName: string | null;
  eobReceivedAt: Date;
  appealLevel: number;
}): Date {
  const rule = resolvePayerRule({
    payerId: args.payerId ?? undefined,
    payerName: args.payerName ?? undefined,
  });
  const days =
    args.appealLevel <= 1
      ? rule.appealDeadlines.level1Days
      : args.appealLevel === 2
      ? rule.appealDeadlines.level2Days
      : rule.appealDeadlines.externalReviewDays ?? DEFAULT_APPEAL_DEADLINE_DAYS;
  const out = new Date(args.eobReceivedAt);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

export function urgencyOf(deadline: Date, today: Date = new Date()): AppealUrgency {
  const days = Math.floor((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "overdue";
  if (days <= URGENCY_THRESHOLDS.due_in_7d) return "due_in_7d";
  if (days <= URGENCY_THRESHOLDS.due_in_30d) return "due_in_30d";
  return "ok";
}

// ---------------------------------------------------------------------------
// Queue an appeal
// ---------------------------------------------------------------------------

/** Stand up a draft AppealPacket from a denial. Computes the deadline,
 *  suggests the top-ranked argument from history, and writes the packet
 *  in `draft`. The drafting agent is what fills the letter body. */
export async function queueAppealForDenial(input: QueueAppealInput): Promise<QueuedAppeal> {
  const denial = await prisma.denialEvent.findUniqueOrThrow({
    where: { id: input.denialEventId },
    include: {
      claim: {
        select: { id: true, organizationId: true, payerId: true, payerName: true, patientId: true },
      },
    },
  });
  if (denial.resolution === "appealed" || denial.resolution === "overturned") {
    const existing = await prisma.appealPacket.findFirst({
      where: { denialEventId: denial.id },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      const ded = input.deadlineOverride ?? appealDeadline({
        payerId: denial.claim.payerId,
        payerName: denial.claim.payerName,
        eobReceivedAt: input.eobReceivedAt,
        appealLevel: existing.appealLevel,
      });
      return { packet: existing, deadline: ded, suggestedTopArgument: null };
    }
  }
  const level = input.appealLevel ?? 1;
  const deadline = input.deadlineOverride ?? appealDeadline({
    payerId: denial.claim.payerId,
    payerName: denial.claim.payerName,
    eobReceivedAt: input.eobReceivedAt,
    appealLevel: level,
  });

  const suggestion = await suggestArgumentForDenial({
    organizationId: input.organizationId,
    payerId: denial.claim.payerId,
    carcCode: denial.carcCode,
  }).catch(() => null);

  const packet = await prisma.$transaction(async (tx) => {
    const created = await tx.appealPacket.create({
      data: {
        claimId: denial.claimId,
        denialEventId: denial.id,
        appealLevel: level,
        status: "draft",
        generatedBy: "appeal-tracker@1.0",
        supportingDocIds: [],
      },
    });
    await tx.denialEvent.update({
      where: { id: denial.id },
      data: { resolution: "appealed" },
    });
    await tx.financialEvent.create({
      data: {
        organizationId: input.organizationId,
        patientId: denial.claim.patientId,
        claimId: denial.claimId,
        type: "claim_denied",
        amountCents: 0,
        description: `Appeal queued (level ${level}); deadline ${deadline.toISOString().slice(0, 10)}${
          suggestion?.top ? `; top arg ${suggestion.top.tag}` : ""
        }`,
        metadata: {
          appealPacketId: created.id,
          deadline: deadline.toISOString(),
          suggestedArgument: suggestion?.top?.tag ?? null,
        },
        createdByAgent: "appeal-tracker@1.0",
      },
    });
    return created;
  });
  return {
    packet,
    deadline,
    suggestedTopArgument: suggestion?.top?.tag ?? null,
  };
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

export async function markSubmitted(args: {
  appealPacketId: string;
  submittedAt: Date;
  submittedTo: string;
  reviewedBy?: string;
}): Promise<AppealPacket> {
  return prisma.appealPacket.update({
    where: { id: args.appealPacketId },
    data: {
      status: "submitted",
      submittedAt: args.submittedAt,
      submittedTo: args.submittedTo,
      reviewedBy: args.reviewedBy ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Queue read
// ---------------------------------------------------------------------------

export async function appealsQueue(organizationId: string, today: Date = new Date()): Promise<AppealQueueRow[]> {
  const packets = await prisma.appealPacket.findMany({
    where: {
      claim: { organizationId },
      status: { in: ["draft", "approved_for_submission", "submitted", "pending_review"] },
    },
    include: {
      claim: { select: { patientId: true, payerName: true, payerId: true } },
      denialEvent: { select: { carcCode: true, amountDeniedCents: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const rows: AppealQueueRow[] = packets.map((p) => {
    const eobAnchor = p.submittedAt ?? p.createdAt;
    const deadline = appealDeadline({
      payerId: p.claim.payerId,
      payerName: p.claim.payerName,
      eobReceivedAt: eobAnchor,
      appealLevel: p.appealLevel,
    });
    const daysToDeadline = Math.floor((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    return {
      packetId: p.id,
      claimId: p.claimId,
      patientId: p.claim.patientId,
      payerName: p.claim.payerName ?? "unknown",
      appealLevel: p.appealLevel,
      status: p.status,
      deniedCents: p.denialEvent.amountDeniedCents,
      carcCode: p.denialEvent.carcCode,
      deadline,
      daysToDeadline,
      urgency: urgencyOf(deadline, today),
      createdAt: p.createdAt,
      submittedAt: p.submittedAt,
    };
  });
  // Most-urgent first; within same urgency, biggest dollars first.
  const URGENCY_RANK: Record<AppealUrgency, number> = {
    overdue: 0,
    due_in_7d: 1,
    due_in_30d: 2,
    ok: 3,
  };
  rows.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || b.deniedCents - a.deniedCents);
  return rows;
}

// ---------------------------------------------------------------------------
// SLA sweep — auto-record `no_response`
// ---------------------------------------------------------------------------

export async function noResponseSweep(args: {
  organizationId: string;
  today?: Date;
  slaDays?: number;
}): Promise<{ swept: number }> {
  const today = args.today ?? new Date();
  const slaDays = args.slaDays ?? NO_RESPONSE_SLA_DAYS;
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - slaDays);

  const stale = await prisma.appealPacket.findMany({
    where: {
      status: "submitted",
      submittedAt: { lt: cutoff, not: null },
      claim: { organizationId: args.organizationId },
    },
    select: { id: true },
  });
  let swept = 0;
  for (const p of stale) {
    await persistAppealOutcome({
      organizationId: args.organizationId,
      appealPacketId: p.id,
      result: "no_response",
      decisionDate: today,
      notes: `Auto-marked no_response after ${slaDays}d without payer reply.`,
    }).catch(() => {
      /* a packet without a denial-event row will throw; skip */
    });
    swept++;
  }
  return { swept };
}

// ---------------------------------------------------------------------------
// Helpers (typing)
// ---------------------------------------------------------------------------

export type AppealTrackerDeps = {
  tx?: Prisma.TransactionClient;
};

/** Re-export for callers that want the full denial shape. */
export type DenialWithClaim = DenialEvent & {
  claim: { id: string; organizationId: string; payerId: string | null; payerName: string | null; patientId: string };
};

/**
 * Appeal outcome tracker — persistence layer  (EMR-228)
 * --------------------------------------------------------------
 * Wraps the pure learning math in `appeal-outcomes.ts` with the
 * Prisma reads/writes that close the learning loop:
 *
 *   - persistAppealOutcome() — write `AppealOutcome`, update the
 *     `AppealPacket`, recover dollars onto the FinancialEvent ledger,
 *     and feed the (payer, CARC, argument) signal into BillingMemory.
 *   - winRatePivot() — operator-dashboard pivot reads.
 *   - suggestArgumentForDenial() — given a fresh denial, returns the
 *     argument set with the best historical win rate; falls back to
 *     broader scopes when the (payer, CARC) cell is too thin.
 */
import { prisma } from "@/lib/db/prisma";
import type { AppealOutcome, AppealResult, Prisma } from "@prisma/client";
import {
  recordOutcome as computeOutcomeSignal,
  rankArguments,
  winRateByPayer,
  winRateByCarc,
  ARGUMENT_TAGS,
  isArgumentTag,
  type ArgumentTag,
  type ArgumentScore,
  type OutcomeHistoryRow,
  type PayerWinRate,
  type CarcWinRate,
} from "./appeal-outcomes";

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export interface PersistOutcomeInput {
  organizationId: string;
  appealPacketId: string;
  result: AppealResult;
  recoveredCents?: number;
  decisionDate?: Date;
  notes?: string;
  /** Optional override; usually the appeals agent has already tagged
   *  the letter with `<arg name="…">` markers. */
  argumentTagsOverride?: ArgumentTag[];
}

/** Persist an outcome and update everything downstream of it in one
 *  transaction. */
export async function persistAppealOutcome(input: PersistOutcomeInput): Promise<AppealOutcome> {
  const packet = await prisma.appealPacket.findUniqueOrThrow({
    where: { id: input.appealPacketId },
    include: {
      claim: { select: { id: true, organizationId: true, payerId: true, payerName: true, patientId: true } },
      denialEvent: { select: { carcCode: true, rarcCode: true } },
    },
  });
  const decisionDate = input.decisionDate ?? new Date();
  const recoveredCents = input.recoveredCents ?? 0;
  const argumentTags = input.argumentTagsOverride ?? extractArgumentTags(packet.appealLetter);

  const signal = computeOutcomeSignal({
    organizationId: input.organizationId,
    appealPacketId: input.appealPacketId,
    claimId: packet.claim.id,
    payerId: packet.claim.payerId ?? null,
    payerName: packet.claim.payerName ?? "unknown",
    carcCode: packet.denialEvent.carcCode,
    rarcCode: packet.denialEvent.rarcCode,
    argumentTags,
    result: input.result,
    recoveredCents,
    decisionDate,
  });

  return prisma.$transaction(async (tx) => {
    const outcome = await tx.appealOutcome.upsert({
      where: { appealPacketId: input.appealPacketId },
      update: {
        result: input.result,
        decisionDate,
        recoveredCents,
        notes: input.notes ?? null,
        argumentTags,
        carcCode: packet.denialEvent.carcCode,
        rarcCode: packet.denialEvent.rarcCode,
        payerId: packet.claim.payerId ?? null,
        payerName: packet.claim.payerName ?? "unknown",
      },
      create: {
        organizationId: input.organizationId,
        appealPacketId: input.appealPacketId,
        claimId: packet.claim.id,
        result: input.result,
        decisionDate,
        recoveredCents,
        notes: input.notes ?? null,
        argumentTags,
        carcCode: packet.denialEvent.carcCode,
        rarcCode: packet.denialEvent.rarcCode,
        payerId: packet.claim.payerId ?? null,
        payerName: packet.claim.payerName ?? "unknown",
      },
    });
    await tx.appealPacket.update({
      where: { id: input.appealPacketId },
      data: {
        status:
          input.result === "overturned"
            ? "overturned"
            : input.result === "upheld"
            ? "upheld"
            : "submitted",
        outcomeReceivedAt: decisionDate,
      },
    });
    if (recoveredCents > 0) {
      await tx.financialEvent.create({
        data: {
          organizationId: input.organizationId,
          patientId: packet.claim.patientId,
          claimId: packet.claim.id,
          type: "insurance_paid",
          amountCents: recoveredCents,
          description: `Appeal overturned — recovered $${(recoveredCents / 100).toFixed(2)}`,
          metadata: { appealPacketId: input.appealPacketId, source: "appeal_outcome" },
          createdByAgent: "appeal-outcome-tracker@1.0",
        },
      });
    }
    for (const write of signal.memoryWrites) {
      await persistMemoryWrite(tx, input.organizationId, write);
    }
    return outcome;
  });
}

async function persistMemoryWrite(
  tx: Prisma.TransactionClient,
  organizationId: string,
  write: ReturnType<typeof computeOutcomeSignal>["memoryWrites"][number],
): Promise<void> {
  const existing = await tx.billingMemory.findFirst({
    where: {
      organizationId,
      scope: write.scope,
      scopeId: write.scopeId,
      category: write.category,
      tags: { hasEvery: write.tags },
    },
  });
  if (existing) {
    await tx.billingMemory.update({
      where: { id: existing.id },
      data: {
        content: write.content,
        evidenceCount: existing.evidenceCount + 1,
        confidence: Math.min(0.99, existing.confidence + 0.02),
        lastEvidenceAt: new Date(),
      },
    });
    return;
  }
  await tx.billingMemory.create({
    data: {
      organizationId,
      scope: write.scope,
      scopeId: write.scopeId,
      category: write.category,
      content: write.content,
      confidence: write.confidence,
      evidenceCount: 1,
      tags: write.tags,
    },
  });
}

function extractArgumentTags(letter: string | null): ArgumentTag[] {
  if (!letter) return [];
  const out = new Set<ArgumentTag>();
  for (const m of letter.matchAll(/<arg\s+name=["']([a-z_]+)["']/gi)) {
    const tag = m[1].toLowerCase();
    if (isArgumentTag(tag)) out.add(tag);
  }
  if (out.size === 0) {
    if (/medical(ly)?\s+necessar/i.test(letter)) out.add("medical_necessity");
    if (/modifier|mod\s*\d{2}/i.test(letter)) out.add("modifier_correction");
    if (/policy|bulletin|cpt\s+guideline/i.test(letter)) out.add("policy_citation");
    if (/timely\s+filing/i.test(letter)) out.add("timely_filing_proof");
    if (/prior\s+auth/i.test(letter)) out.add("prior_auth_obtained");
    if (/secondary\s+eob|primary\s+eob|coordination/i.test(letter)) out.add("secondary_eob_attached");
    if (/coding\s+correction|recoded|recode/i.test(letter)) out.add("coding_correction");
  }
  return [...out];
}

// ---------------------------------------------------------------------------
// Dashboard pivots
// ---------------------------------------------------------------------------

export interface WinRatePivot {
  byPayer: PayerWinRate[];
  byCarc: CarcWinRate[];
  totalRecoveredCents: number;
  totalAppeals: number;
}

export async function winRatePivot(organizationId: string): Promise<WinRatePivot> {
  const rows = await prisma.appealOutcome.findMany({
    where: { organizationId },
    select: {
      result: true,
      payerName: true,
      carcCode: true,
      recoveredCents: true,
      argumentTags: true,
    },
  });
  return {
    byPayer: winRateByPayer(rows),
    byCarc: winRateByCarc(rows),
    totalRecoveredCents: rows.reduce((a, r) => a + r.recoveredCents, 0),
    totalAppeals: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Argument suggestion for a fresh denial
// ---------------------------------------------------------------------------

export interface ArgumentSuggestion {
  ranking: ArgumentScore[];
  top: ArgumentScore;
}

/** Returns the per-argument win-rate ranking for the given (payer,
 *  CARC). Falls back to the global pool internally when the payer-
 *  specific cell is thin (handled by `rankArguments`). */
export async function suggestArgumentForDenial(args: {
  organizationId: string;
  payerId: string | null;
  carcCode: string | null;
  candidates?: ArgumentTag[];
}): Promise<ArgumentSuggestion | null> {
  const rows = await prisma.appealOutcome.findMany({
    where: { organizationId: args.organizationId },
    select: {
      payerId: true,
      carcCode: true,
      argumentTags: true,
      result: true,
      recoveredCents: true,
    },
  });
  if (rows.length === 0) return null;
  const history: OutcomeHistoryRow[] = rows.map((r) => ({
    payerId: r.payerId,
    carcCode: r.carcCode,
    argumentTags: r.argumentTags,
    result: r.result,
    recoveredCents: r.recoveredCents,
  }));
  const ranking = rankArguments({
    payerId: args.payerId,
    carcCode: args.carcCode,
    candidates: args.candidates ?? ARGUMENT_TAGS,
    history,
  });
  if (ranking.length === 0) return null;
  return { ranking, top: ranking[0] };
}

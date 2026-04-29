/**
 * Lockbox / bank-deposit ingestion + reconciliation  (EMR-224)
 * --------------------------------------------------------------
 * Persistence layer over the pure parsers + matcher in `lockbox.ts`.
 *
 * Pipeline:
 *   1. ingestBankFile() — parse a bank statement (CSV / OFX / BAI2)
 *      and upsert `BankDeposit` rows. Idempotent on (org, bankReference).
 *   2. reconcileDeposits() — for each unmatched deposit, pick ERA
 *      payments + patient-payment batches as candidates, run the pure
 *      `matchDeposit()` matcher, and persist `BankDepositMatch` rows.
 *   3. varianceReport() — query for the daily-close exception list
 *      (unmatched deposits + unmatched payments).
 */
import { prisma } from "@/lib/db/prisma";
import {
  parseBankCsv,
  parseBai2,
  parseOfx,
  matchDeposit,
  type BankDepositRow,
  type MatchCandidate,
  type MatchOutcome,
} from "./lockbox";

// ---------------------------------------------------------------------------
// Bank-file ingestion
// ---------------------------------------------------------------------------

export type BankFileFormat = "csv" | "ofx" | "bai2";

export interface IngestBankFileInput {
  organizationId: string;
  bankAccountId: string | null;
  format: BankFileFormat;
  payload: string;
}

export interface IngestBankFileResult {
  inserted: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
}

/** Parse a bank-statement file and write new BankDeposit rows. The
 *  (organizationId, bankReference) unique index makes re-imports
 *  idempotent — a second import of the same statement is a no-op. */
export async function ingestBankFile(input: IngestBankFileInput): Promise<IngestBankFileResult> {
  const parsed = pickParser(input.format)(input.payload);
  let inserted = 0;
  let duplicates = 0;
  for (const row of parsed.rows) {
    const result = await insertDepositIfNew(input.organizationId, input.bankAccountId, row);
    if (result === "inserted") inserted++;
    else duplicates++;
  }
  return { inserted, duplicates, errors: parsed.errors };
}

function pickParser(format: BankFileFormat) {
  switch (format) {
    case "csv":
      return parseBankCsv;
    case "ofx":
      return parseOfx;
    case "bai2":
      return parseBai2;
  }
}

async function insertDepositIfNew(
  organizationId: string,
  bankAccountId: string | null,
  row: BankDepositRow,
): Promise<"inserted" | "duplicate"> {
  const existing = await prisma.bankDeposit.findUnique({
    where: {
      organizationId_bankReference: {
        organizationId,
        bankReference: row.bankReference,
      },
    },
    select: { id: true },
  });
  if (existing) return "duplicate";
  await prisma.bankDeposit.create({
    data: {
      organizationId,
      bankAccountId,
      depositDate: row.depositDate,
      amountCents: row.amountCents,
      bankReference: row.bankReference,
      source: row.source,
      rawLine: row.rawLine,
      status: "pending",
    },
  });
  return "inserted";
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export interface ReconcileOptions {
  /** Re-match deposits that are already partially_matched / variance, in
   *  case new candidates have arrived since the last pass. Default false. */
  rematchPartials?: boolean;
}

export interface ReconcileResult {
  examined: number;
  matched: number;
  partially_matched: number;
  unmatched: number;
  variance: number;
}

/** Reconcile every pending deposit for an org. Pulls fresh ERA + patient
 *  payment candidates each call so newly-posted ERAs match against the
 *  earlier deposit they belong to. */
export async function reconcileDeposits(
  organizationId: string,
  options: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const statuses = options.rematchPartials
    ? (["pending", "partially_matched", "variance"] as const)
    : (["pending"] as const);
  const deposits = await prisma.bankDeposit.findMany({
    where: { organizationId, status: { in: [...statuses] } },
    orderBy: { depositDate: "asc" },
  });

  // Pull all unmatched ERAs + patient payments in one read; the matcher
  // is pure so we filter in-memory. This avoids one query per deposit
  // (an org with 200 deposits/month → 200 queries → wasted round-trips).
  const candidates = await loadCandidates(organizationId);

  const result: ReconcileResult = {
    examined: deposits.length,
    matched: 0,
    partially_matched: 0,
    unmatched: 0,
    variance: 0,
  };

  for (const deposit of deposits) {
    const outcome = matchDeposit(
      { amountCents: deposit.amountCents, depositDate: deposit.depositDate },
      candidates,
    );
    await persistMatch(deposit.id, outcome);
    // Mark candidates that were used so they aren't reused on the next
    // deposit in the same pass.
    if (outcome.assignments.length > 0) {
      consumeUsedCandidates(candidates, outcome);
    }
    result[outcome.status]++;
  }
  return result;
}

async function loadCandidates(organizationId: string): Promise<MatchCandidate[]> {
  // Unmatched ERA files
  const eraFiles = await prisma.eraFile.findMany({
    where: {
      organizationId,
      status: { in: ["parsed", "posted"] },
      bankDepositMatches: { none: {} },
    },
    select: { id: true, totalAmountCents: true, checkDate: true, payerName: true },
  });
  // Unmatched patient payments
  const payments = await prisma.payment.findMany({
    where: {
      claim: { organizationId },
      bankDepositMatches: { none: {} },
    },
    select: { id: true, amountCents: true, paymentDate: true, source: true },
  });
  return [
    ...eraFiles.map<MatchCandidate>((e) => ({
      kind: "era",
      id: e.id,
      amountCents: e.totalAmountCents,
      expectedDate: e.checkDate,
      label: `ERA ${e.payerName}`,
    })),
    ...payments.map<MatchCandidate>((p) => ({
      kind: "payment",
      id: p.id,
      amountCents: p.amountCents,
      expectedDate: p.paymentDate,
      label: `Payment ${p.source}`,
    })),
  ];
}

function consumeUsedCandidates(candidates: MatchCandidate[], outcome: MatchOutcome): void {
  const usedIds = new Set(outcome.assignments.map((a) => a.candidate.id));
  // Mutating in-place is fine — this list is local to a single
  // reconcileDeposits() invocation.
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (usedIds.has(candidates[i].id)) candidates.splice(i, 1);
  }
}

async function persistMatch(depositId: string, outcome: MatchOutcome): Promise<void> {
  await prisma.$transaction(async (tx) => {
    if (outcome.assignments.length > 0) {
      await tx.bankDepositMatch.createMany({
        data: outcome.assignments.map((a) => ({
          depositId,
          eraFileId: a.candidate.kind === "era" ? a.candidate.id : null,
          paymentId: a.candidate.kind === "payment" ? a.candidate.id : null,
          amountCents: a.appliedCents,
          matchedBy: "auto",
        })),
      });
    }
    await tx.bankDeposit.update({
      where: { id: depositId },
      data: {
        status: outcome.status,
        matchedAmountCents: outcome.matchedCents,
        varianceCents: outcome.varianceCents || 0,
        reconciledAt: outcome.status === "matched" ? new Date() : null,
        notes: outcome.reason,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Variance report
// ---------------------------------------------------------------------------

export interface VarianceReport {
  unmatchedDeposits: Array<{
    id: string;
    depositDate: Date;
    amountCents: number;
    bankReference: string;
    source: string;
    daysSinceDeposit: number;
  }>;
  unmatchedEras: Array<{ id: string; payerName: string; checkDate: Date; totalAmountCents: number }>;
  unmatchedPayments: Array<{ id: string; paymentDate: Date; amountCents: number; source: string }>;
  totals: {
    unmatchedDepositCents: number;
    unmatchedEraCents: number;
    unmatchedPaymentCents: number;
  };
}

export async function varianceReport(organizationId: string): Promise<VarianceReport> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const [deposits, eras, payments] = await Promise.all([
    prisma.bankDeposit.findMany({
      where: { organizationId, status: { in: ["pending", "partially_matched", "variance", "unmatched"] } },
      orderBy: { depositDate: "asc" },
    }),
    prisma.eraFile.findMany({
      where: { organizationId, status: { in: ["parsed", "posted"] }, bankDepositMatches: { none: {} } },
      select: { id: true, payerName: true, checkDate: true, totalAmountCents: true },
      orderBy: { checkDate: "asc" },
    }),
    prisma.payment.findMany({
      where: { claim: { organizationId }, bankDepositMatches: { none: {} } },
      select: { id: true, paymentDate: true, amountCents: true, source: true },
      orderBy: { paymentDate: "asc" },
    }),
  ]);
  return {
    unmatchedDeposits: deposits.map((d) => ({
      id: d.id,
      depositDate: d.depositDate,
      amountCents: d.amountCents - d.matchedAmountCents,
      bankReference: d.bankReference,
      source: d.source,
      daysSinceDeposit: Math.floor((now - d.depositDate.getTime()) / day),
    })),
    unmatchedEras: eras,
    unmatchedPayments: payments.map((p) => ({
      id: p.id,
      paymentDate: p.paymentDate,
      amountCents: p.amountCents,
      source: p.source,
    })),
    totals: {
      unmatchedDepositCents: deposits.reduce((a, d) => a + (d.amountCents - d.matchedAmountCents), 0),
      unmatchedEraCents: eras.reduce((a, e) => a + e.totalAmountCents, 0),
      unmatchedPaymentCents: payments.reduce((a, p) => a + p.amountCents, 0),
    },
  };
}

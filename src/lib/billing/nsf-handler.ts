/**
 * NSF / chargeback handler — EMR-227
 * ----------------------------------
 * A patient's card payment can bounce (NSF) or be charged back. The
 * ledger must handle the negative payment without breaking
 * reconciliation, and the dunning path needs an NSF-specific tone.
 *
 *   - `buildNsfReversalEvents` — given a bounced payment, returns the
 *     pair of FinancialEvent rows + Adjustment row that reverses it.
 *   - `nsfTone` — the dunning tone that EMR-211 reminder pipeline uses
 *     when it hits this patient again (firmer than first-cycle, but
 *     supportive — "let's figure out a different way to pay").
 *   - `summarizeNsfImpact` — quick rollup for the ops dashboard
 *     (count + dollars affected + bank fees lost YTD).
 */

import type { NsfEventType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BouncedPayment {
  paymentId: string;
  claimId: string | null;
  patientId: string;
  organizationId: string;
  /** Original positive amount. */
  amountCents: number;
  /** When the bank notified us. */
  occurredAt: Date;
  /** "R01 NSF", "fraud", "cancelled by consumer", etc. */
  reason: string | null;
  /** Optional bank fee charged to the practice. */
  bankFeeCents: number;
  /** Type of negative event. */
  type: NsfEventType;
}

export interface NsfReversalLedgerEntry {
  /** Maps to FinancialEventType — we use the "chargeback" variant for
   *  every NSF/chargeback/reversal so reconciliation stays simple. */
  eventType: "chargeback";
  amountCents: number; // signed: negative = reversal of the original posting
  description: string;
  metadata: Record<string, unknown>;
}

export interface NsfReversalAdjustment {
  /** AdjustmentType.takeback */
  type: "takeback";
  amountCents: number; // negative — money out of the practice
  reason: string;
}

export interface NsfReversalPayload {
  /** Pair of ledger entries: (1) reversal of the original payment, (2) bank fee expense if any. */
  ledgerEntries: NsfReversalLedgerEntry[];
  /** Claim-level adjustment that re-opens the patient balance. */
  adjustment: NsfReversalAdjustment | null;
  /** Updated patient balance delta in cents (positive = patient now owes more). */
  patientBalanceDeltaCents: number;
  /** Bank-fee impact (for the practice's expense ledger, tracked separately). */
  bankFeeImpactCents: number;
}

// ---------------------------------------------------------------------------
// Reversal builder
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<NsfEventType, string> = {
  nsf: "Card / ACH NSF",
  chargeback: "Issuer chargeback",
  reversal: "Clearinghouse reversal",
};

/** Compute the ledger entries + claim adjustment that reverse a bounced
 *  payment. The caller persists them in a single transaction so the
 *  ledger stays balanced.
 *
 *  Re-opens the claim balance by writing a negative `patient_payment`
 *  reversal (encoded as `chargeback` event type) and, when a claim is
 *  attached, a `takeback` adjustment that bumps `patientRespCents` back
 *  to its pre-payment value.
 */
export function buildNsfReversalEvents(input: BouncedPayment): NsfReversalPayload {
  const baseMetadata = {
    paymentId: input.paymentId,
    claimId: input.claimId,
    nsfType: input.type,
    bankReason: input.reason,
  };

  const ledgerEntries: NsfReversalLedgerEntry[] = [
    {
      eventType: "chargeback",
      amountCents: -Math.abs(input.amountCents),
      description: `${TYPE_LABELS[input.type]} — payment reversed (${input.reason ?? "no reason given"})`,
      metadata: baseMetadata,
    },
  ];

  if (input.bankFeeCents > 0) {
    ledgerEntries.push({
      eventType: "chargeback",
      amountCents: -Math.abs(input.bankFeeCents),
      description: `Bank fee for ${TYPE_LABELS[input.type]}`,
      metadata: { ...baseMetadata, bankFee: true },
    });
  }

  const adjustment: NsfReversalAdjustment | null = input.claimId
    ? {
        type: "takeback",
        amountCents: -Math.abs(input.amountCents),
        reason: `${TYPE_LABELS[input.type]} reversal — payment ${input.paymentId} bounced`,
      }
    : null;

  return {
    ledgerEntries,
    adjustment,
    patientBalanceDeltaCents: Math.abs(input.amountCents),
    bankFeeImpactCents: Math.abs(input.bankFeeCents),
  };
}

// ---------------------------------------------------------------------------
// Dunning tone
// ---------------------------------------------------------------------------

export type DunningTone = "neutral" | "firm" | "final_notice" | "supportive_nsf";

/** Pick the tone EMR-211 uses for the next outreach. NSF events
 *  bypass the standard escalation ladder for one outreach so we never
 *  go from "friendly first reminder" → "we'll send you to collections"
 *  with no acknowledgement of the bounced payment. */
export function nsfTone(args: {
  hadPriorNsf: boolean;
  cyclesSinceNsf: number;
  totalAttempts: number;
}): DunningTone {
  if (!args.hadPriorNsf) return "neutral";
  if (args.cyclesSinceNsf <= 1) return "supportive_nsf"; // "we noticed your payment didn't go through — let's find another way"
  if (args.totalAttempts >= 4) return "final_notice";
  return "firm";
}

// ---------------------------------------------------------------------------
// Dashboard rollup
// ---------------------------------------------------------------------------

export interface NsfRollup {
  count: number;
  totalReversedCents: number;
  totalBankFeesCents: number;
  unresolved: number;
  byType: Record<NsfEventType, { count: number; reversedCents: number }>;
}

export function summarizeNsfImpact(events: Array<{
  type: NsfEventType;
  amountCents: number;
  bankFeeCents: number;
  resolved: boolean;
}>): NsfRollup {
  const byType: NsfRollup["byType"] = {
    nsf: { count: 0, reversedCents: 0 },
    chargeback: { count: 0, reversedCents: 0 },
    reversal: { count: 0, reversedCents: 0 },
  };
  let totalReversed = 0;
  let totalFees = 0;
  let unresolved = 0;
  for (const e of events) {
    byType[e.type].count++;
    byType[e.type].reversedCents += e.amountCents;
    totalReversed += e.amountCents;
    totalFees += e.bankFeeCents;
    if (!e.resolved) unresolved++;
  }
  return {
    count: events.length,
    totalReversedCents: totalReversed,
    totalBankFeesCents: totalFees,
    unresolved,
    byType,
  };
}

/**
 * ERA / 835 parser — EMR-221 module entrypoint
 * --------------------------------------------
 * The canonical implementation lives in `src/lib/billing/era-parser.ts`
 * (kept under that path to match historical test fixtures). This file
 * is the public module home — re-exports the parser API and adds
 * 835-specific helpers built on top of it.
 *
 * Anything new in the ERA pipeline (SVC-line dedupe, claim-status
 * classification, CARC severity scoring) lands here so the canonical
 * file stays a pure parser.
 */

export {
  hashEraPayload,
  parseEra835,
  parseJsonEra,
  reconcileEraTotals,
  tokenizeSegments,
  Era835ParseError,
  type Era835Adjustment,
  type Era835ClaimPayment,
  type Era835PlbAdjustment,
  type Era835ServiceLine,
  type ParsedEra835,
} from "../era-parser";

import {
  parseEra835,
  reconcileEraTotals,
  type Era835ClaimPayment,
  type ParsedEra835,
} from "../era-parser";

// ---------------------------------------------------------------------------
// Claim status classification
// ---------------------------------------------------------------------------
// CLP02 codes per X12 5010 IG. We collapse them into the 4 buckets the
// adjudication agent actually distinguishes, plus a `reversal` bucket
// that becomes a separate ledger entry rather than overwriting state.

export type ClaimStatusBucket = "paid" | "denied" | "partial" | "pending" | "reversal";

const STATUS_MAP: Record<string, ClaimStatusBucket> = {
  "1": "paid",
  "2": "paid", // primary processed-as-secondary; still a paid line
  "3": "paid", // tertiary
  "4": "denied",
  "5": "pending", // accepted, pending review
  "13": "denied", // suspended → treat as denied for triage; adjudicator can reclass
  "19": "reversal",
  "20": "reversal",
  "21": "reversal",
  "22": "reversal",
  "23": "denied", // not our patient
};

export function classifyClaimStatus(claim: Era835ClaimPayment): ClaimStatusBucket {
  const direct = STATUS_MAP[claim.claimStatusCode];
  if (direct) return direct;
  if (claim.totalPaidCents > 0 && claim.totalPaidCents < claim.totalChargeCents) return "partial";
  if (claim.totalPaidCents <= 0) return "denied";
  return "paid";
}

// ---------------------------------------------------------------------------
// Convenience: parse + classify + reconcile in one call
// ---------------------------------------------------------------------------

export interface ParsedEraWithSummary {
  era: ParsedEra835;
  summary: {
    totalClaims: number;
    paid: number;
    denied: number;
    partial: number;
    pending: number;
    reversals: number;
    /** Sum of CLP04 across paid/partial claims. */
    totalPaidCents: number;
    /** Reconciliation against BPR02. */
    balanced: boolean;
    varianceCents: number;
  };
}

export function parseAndSummarize(payload: string): ParsedEraWithSummary {
  const era = parseEra835(payload);
  let paid = 0;
  let denied = 0;
  let partial = 0;
  let pending = 0;
  let reversals = 0;
  let totalPaid = 0;
  for (const c of era.claimPayments) {
    const bucket = classifyClaimStatus(c);
    if (bucket === "paid") paid++;
    else if (bucket === "denied") denied++;
    else if (bucket === "partial") partial++;
    else if (bucket === "pending") pending++;
    else if (bucket === "reversal") reversals++;
    if (bucket === "paid" || bucket === "partial") totalPaid += c.totalPaidCents;
  }
  const balance = reconcileEraTotals(era);
  return {
    era,
    summary: {
      totalClaims: era.claimPayments.length,
      paid,
      denied,
      partial,
      pending,
      reversals,
      totalPaidCents: totalPaid,
      balanced: balance.balanced,
      varianceCents: balance.balanced ? 0 : balance.varianceCents,
    },
  };
}

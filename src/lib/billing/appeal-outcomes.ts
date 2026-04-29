/**
 * Appeal tracker + outcome learning loop — EMR-228
 * ------------------------------------------------
 * The appeals agent drafts letters but never measures which arguments
 * win. Missed learning opportunity. This module:
 *
 *   - `recordOutcome`: persist `AppealOutcome` and emit a learning
 *     signal — a `BillingMemoryWrite` describing the (payer, CARC,
 *     argument) combination that won (or lost).
 *   - `rankArguments`: given a payer + CARC + a candidate set of
 *     arguments, score each by historical win rate. Used by the
 *     appeals agent to lead with the most-likely-to-win argument.
 *   - `winRateBy*`: dashboard rollups for the operator UI.
 *
 *  Pure module — Prisma reads/writes happen in callers. Tests can
 *  exercise the learning math directly without a database.
 */

import type { AppealResult } from "@prisma/client";

// ---------------------------------------------------------------------------
// Argument taxonomy
// ---------------------------------------------------------------------------

/** The argument types our letters use. Tags chosen to be coarse enough
 *  to learn from with modest sample sizes (we don't expect 1000s of
 *  appeals per payer; we have to learn from dozens). */
export const ARGUMENT_TAGS = [
  "medical_necessity",
  "modifier_correction",
  "policy_citation",
  "timely_filing_proof",
  "prior_auth_obtained",
  "duplicate_clarification",
  "secondary_eob_attached",
  "coding_correction",
  "appeals_evidence_packet",
] as const;

export type ArgumentTag = (typeof ARGUMENT_TAGS)[number];

export function isArgumentTag(s: string): s is ArgumentTag {
  return (ARGUMENT_TAGS as readonly string[]).includes(s);
}

// ---------------------------------------------------------------------------
// Outcome recording — return shape
// ---------------------------------------------------------------------------

export interface RecordOutcomeInput {
  organizationId: string;
  appealPacketId: string;
  claimId: string;
  payerId: string | null;
  payerName: string;
  carcCode: string | null;
  rarcCode: string | null;
  argumentTags: ArgumentTag[];
  result: AppealResult;
  recoveredCents: number;
  decisionDate: Date | null;
}

export interface BillingMemoryWrite {
  scope: "payer";
  scopeId: string;
  category: "appeal_argument";
  content: string;
  /** Coarse confidence: bumps up with each consistent outcome of the same kind. */
  confidence: number;
  tags: string[];
}

export interface RecordOutcomeResult {
  /** What to write to AppealOutcome. */
  outcome: RecordOutcomeInput;
  /** What to write to BillingMemory. Empty array if the result is
   *  pending / no_response (no signal yet). */
  memoryWrites: BillingMemoryWrite[];
}

/** Compute the AppealOutcome row plus the BillingMemory rows that
 *  capture the learning signal. The caller persists both within the
 *  same transaction. */
export function recordOutcome(input: RecordOutcomeInput): RecordOutcomeResult {
  const memoryWrites: BillingMemoryWrite[] = [];
  const isResolved = input.result === "overturned" || input.result === "upheld" || input.result === "partial";
  if (!isResolved || !input.payerId || !input.carcCode || input.argumentTags.length === 0) {
    return { outcome: input, memoryWrites: [] };
  }
  const verdict =
    input.result === "overturned"
      ? "WON"
      : input.result === "partial"
        ? "PARTIAL"
        : "LOST";
  const recovered = input.recoveredCents > 0 ? ` ($${(input.recoveredCents / 100).toFixed(2)} recovered)` : "";
  for (const tag of input.argumentTags) {
    memoryWrites.push({
      scope: "payer",
      scopeId: input.payerId,
      category: "appeal_argument",
      content: `Argument '${tag}' against CARC ${input.carcCode} for ${input.payerName}: ${verdict}${recovered}`,
      // Single observation = 0.6; partial wins count partial (0.5).
      confidence: input.result === "overturned" ? 0.6 : input.result === "partial" ? 0.5 : 0.4,
      tags: ["appeal_outcome", input.result, tag, `carc:${input.carcCode}`],
    });
  }
  return { outcome: input, memoryWrites };
}

// ---------------------------------------------------------------------------
// Argument ranking
// ---------------------------------------------------------------------------

export interface OutcomeHistoryRow {
  payerId: string | null;
  carcCode: string | null;
  argumentTags: string[];
  result: AppealResult;
  recoveredCents: number;
}

export interface ArgumentScore {
  tag: ArgumentTag;
  /** Bayesian smoothed win rate, 0-1. */
  winRate: number;
  sampleSize: number;
  averageRecoveryCents: number;
  reason: string;
}

const SMOOTHING_PRIOR = 1; // pseudo-counts for 1 win + 1 loss out of the gate

/** Rank arguments by historical win rate against this (payer, CARC).
 *  Falls back to global history when payer-specific samples are too
 *  small (< 3). Bayesian-smoothed so a 1-of-1 win doesn't beat a 7-of-10
 *  track record. */
export function rankArguments(args: {
  payerId: string | null;
  carcCode: string | null;
  candidates: readonly ArgumentTag[];
  history: OutcomeHistoryRow[];
}): ArgumentScore[] {
  const scores: ArgumentScore[] = [];
  for (const tag of args.candidates) {
    const payerLocal = args.payerId
      ? args.history.filter((h) => h.payerId === args.payerId && h.carcCode === args.carcCode && h.argumentTags.includes(tag))
      : [];
    const useSet = payerLocal.length >= 3
      ? payerLocal
      : args.history.filter((h) => h.argumentTags.includes(tag));
    const wins = useSet.filter((h) => h.result === "overturned").length;
    const partials = useSet.filter((h) => h.result === "partial").length;
    const losses = useSet.filter((h) => h.result === "upheld").length;
    const total = wins + partials + losses;
    // Smooth: partial counts as half a win.
    const numerator = wins + 0.5 * partials + SMOOTHING_PRIOR;
    const denominator = total + SMOOTHING_PRIOR * 2;
    const winRate = numerator / denominator;
    const totalRecovered = useSet.reduce((a, h) => a + h.recoveredCents, 0);
    const avgRecovered = useSet.length > 0 ? Math.round(totalRecovered / useSet.length) : 0;
    scores.push({
      tag,
      winRate,
      sampleSize: total,
      averageRecoveryCents: avgRecovered,
      reason:
        payerLocal.length >= 3
          ? `${wins}W/${partials}P/${losses}L for this payer+CARC`
          : `${wins}W/${partials}P/${losses}L global (insufficient payer-specific data)`,
    });
  }
  scores.sort((a, b) => b.winRate - a.winRate);
  return scores;
}

// ---------------------------------------------------------------------------
// Dashboard rollups
// ---------------------------------------------------------------------------

export interface PayerWinRate {
  payerName: string;
  total: number;
  wins: number;
  partials: number;
  losses: number;
  winRate: number;
  recoveredCents: number;
}

export function winRateByPayer(history: Array<{
  payerName: string;
  result: AppealResult;
  recoveredCents: number;
}>): PayerWinRate[] {
  const by = new Map<string, PayerWinRate>();
  for (const h of history) {
    const cur = by.get(h.payerName) ?? {
      payerName: h.payerName,
      total: 0,
      wins: 0,
      partials: 0,
      losses: 0,
      winRate: 0,
      recoveredCents: 0,
    };
    cur.total++;
    if (h.result === "overturned") cur.wins++;
    else if (h.result === "partial") cur.partials++;
    else if (h.result === "upheld") cur.losses++;
    cur.recoveredCents += h.recoveredCents;
    by.set(h.payerName, cur);
  }
  for (const v of by.values()) {
    const denom = v.wins + v.partials + v.losses;
    v.winRate = denom === 0 ? 0 : (v.wins + 0.5 * v.partials) / denom;
  }
  return Array.from(by.values()).sort((a, b) => b.total - a.total);
}

export interface CarcWinRate {
  carcCode: string;
  total: number;
  wins: number;
  winRate: number;
  recoveredCents: number;
}

export function winRateByCarc(history: Array<{
  carcCode: string | null;
  result: AppealResult;
  recoveredCents: number;
}>): CarcWinRate[] {
  const by = new Map<string, CarcWinRate>();
  for (const h of history) {
    if (!h.carcCode) continue;
    const cur = by.get(h.carcCode) ?? {
      carcCode: h.carcCode,
      total: 0,
      wins: 0,
      winRate: 0,
      recoveredCents: 0,
    };
    cur.total++;
    if (h.result === "overturned") cur.wins++;
    cur.recoveredCents += h.recoveredCents;
    by.set(h.carcCode, cur);
  }
  for (const v of by.values()) {
    v.winRate = v.total === 0 ? 0 : v.wins / v.total;
  }
  return Array.from(by.values()).sort((a, b) => b.total - a.total);
}

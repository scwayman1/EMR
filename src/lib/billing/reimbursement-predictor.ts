/**
 * Reimbursement-rate prediction — EMR-107
 * --------------------------------------------------------------
 * Before submitting a claim — and ideally before scheduling a visit
 * — the front office wants to know: "what will the payer probably
 * pay us for this CPT × modifier × payer × DOS?"
 *
 * The prediction blends three sources, in priority order:
 *
 *   1. Contracted allowable. If a `PayerContract` has a rate row
 *      for this (CPT, modifier) on this DOS, that's the strongest
 *      signal. It's still a *prediction* — payers underpay even
 *      their own contracts — but the contract sets the ceiling.
 *
 *   2. Historical adjudications. We average the payer's last N
 *      `AdjudicationResult.allowedCents` for the CPT, weighted
 *      newer-heavier. This catches under-the-table payment policy
 *      changes the contract upload missed.
 *
 *   3. Practice fee-schedule baseline × payer-class scaler. Last
 *      resort when neither of the above has data — the same default
 *      curve the underpayment detector uses for unrated payers.
 *
 *  We return a single PredictedReimbursement row with the chosen
 *  source, point estimate, and a confidence interval — the queue
 *  uses the lower bound to flag visits that won't cover their cost.
 */

import type { PayerClass } from "@prisma/client";
import {
  findEffectiveContract,
  lookupContractRate,
  type ContractLite,
} from "./payer-contracts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type PredictionSource = "contract" | "history" | "fee_schedule_baseline" | "no_data";

export interface PredictedReimbursement {
  cptCode: string;
  modifier: string | null;
  payerId: string;
  /** Best estimate. */
  predictedCents: number;
  /** ~80% interval. Equal to predictedCents when the source is `contract` (deterministic). */
  loCents: number;
  hiCents: number;
  source: PredictionSource;
  sampleSize: number;
  /** 0–1; >= 0.9 for contracts, scales by sample size for history. */
  confidence: number;
  /** Human-readable rationale for the audit trail / UI. */
  reason: string;
}

export interface HistoricalAllowed {
  /** Adjudication date — used to age-weight. */
  adjudicatedAt: Date;
  cptCode: string;
  modifier: string | null;
  payerId: string;
  /** Allowed amount in cents (NOT paid — the payer's allowable is the
   *  signal we're modeling; patient-resp / contractual adjustments are
   *  applied separately). */
  allowedCents: number;
}

export interface PredictInput {
  cptCode: string;
  modifier: string | null;
  payerId: string;
  payerClass: PayerClass | null;
  serviceDate: Date;
  /** Practice's fee-schedule charge for this CPT (cents). Used as the
   *  baseline % anchor when contract + history are absent. */
  feeScheduleChargeCents: number;
  contracts: ContractLite[];
  history: HistoricalAllowed[];
  /** Cap on history rows we look at — defaults to 24. Newer wins. */
  historyWindow?: number;
}

// ---------------------------------------------------------------------------
// Constants — payer-class defaults when no other data is available
// ---------------------------------------------------------------------------

/** Empirical "% of billed charge" defaults for each payer class. The
 *  underpayment detector uses similar curves; keep these in lockstep. */
const PAYER_CLASS_BASELINE: Record<PayerClass, number> = {
  commercial: 0.65,
  government: 0.45,
  medicare_advantage: 0.50,
  medicaid_managed: 0.40,
  workers_comp: 0.70,
  self_pay: 1.00,
  other: 0.55,
};

const HISTORY_WINDOW_DEFAULT = 24;
/** Minimum samples before history beats fee-schedule baseline. */
const HISTORY_MIN_SAMPLES = 4;
/** Half-life in days for age weighting on history rows (older claims
 *  count less). 180d is "last two quarters dominate". */
const AGE_HALF_LIFE_DAYS = 180;
/** Bandwidth for the synthetic CI when history is the source — wider
 *  with smaller samples. */
const HISTORY_CI_K = 1.28; // ~80% interval if rates are roughly normal

// ---------------------------------------------------------------------------
// Main prediction
// ---------------------------------------------------------------------------

export function predictReimbursement(input: PredictInput): PredictedReimbursement {
  const fromContract = predictFromContract(input);
  if (fromContract) return fromContract;

  const fromHistory = predictFromHistory(input);
  if (fromHistory) return fromHistory;

  return predictFromBaseline(input);
}

// ---------------------------------------------------------------------------
// Source 1 — Contract
// ---------------------------------------------------------------------------

function predictFromContract(input: PredictInput): PredictedReimbursement | null {
  const contract = findEffectiveContract(input.contracts, input.payerId, input.serviceDate);
  if (!contract) return null;
  const rate = lookupContractRate(
    contract,
    input.cptCode,
    input.modifier ? [input.modifier] : [],
  );
  if (!rate) return null;
  return {
    cptCode: input.cptCode,
    modifier: input.modifier,
    payerId: input.payerId,
    predictedCents: rate.allowedCents,
    loCents: rate.allowedCents,
    hiCents: rate.allowedCents,
    source: "contract",
    sampleSize: 1,
    confidence: 0.95,
    reason: `Contract ${contract.id} effective ${contract.effectiveStart.toISOString().slice(0, 10)} — ${input.cptCode}${input.modifier ? `-${input.modifier}` : ""} = $${(rate.allowedCents / 100).toFixed(2)}`,
  };
}

// ---------------------------------------------------------------------------
// Source 2 — Historical adjudications (age-weighted average)
// ---------------------------------------------------------------------------

function predictFromHistory(input: PredictInput): PredictedReimbursement | null {
  const window = input.historyWindow ?? HISTORY_WINDOW_DEFAULT;
  const matching = input.history
    .filter(
      (h) =>
        h.payerId === input.payerId &&
        h.cptCode === input.cptCode &&
        h.allowedCents > 0 &&
        // Loose modifier match: prefer exact, otherwise allow base rows.
        (h.modifier === input.modifier || (!input.modifier && !h.modifier)),
    )
    .sort((a, b) => b.adjudicatedAt.getTime() - a.adjudicatedAt.getTime())
    .slice(0, window);

  // Soften the modifier filter when too thin — base CPT history beats
  // nothing.
  const useSet =
    matching.length >= HISTORY_MIN_SAMPLES
      ? matching
      : input.history
          .filter((h) => h.payerId === input.payerId && h.cptCode === input.cptCode && h.allowedCents > 0)
          .sort((a, b) => b.adjudicatedAt.getTime() - a.adjudicatedAt.getTime())
          .slice(0, window);
  if (useSet.length < HISTORY_MIN_SAMPLES) return null;

  const today = input.serviceDate.getTime();
  let weightedSum = 0;
  let weightTotal = 0;
  for (const h of useSet) {
    const ageDays = Math.max(0, (today - h.adjudicatedAt.getTime()) / (24 * 60 * 60 * 1000));
    const w = Math.pow(0.5, ageDays / AGE_HALF_LIFE_DAYS);
    weightedSum += w * h.allowedCents;
    weightTotal += w;
  }
  const mean = Math.round(weightedSum / weightTotal);
  // Effective sample size for the CI band — Kish formula style:
  const ess = (weightTotal * weightTotal) /
    useSet.reduce((acc, h) => {
      const ageDays = Math.max(0, (today - h.adjudicatedAt.getTime()) / (24 * 60 * 60 * 1000));
      const w = Math.pow(0.5, ageDays / AGE_HALF_LIFE_DAYS);
      return acc + w * w;
    }, 0);
  const variance =
    useSet.reduce((acc, h) => acc + (h.allowedCents - mean) ** 2, 0) / useSet.length;
  const se = Math.sqrt(variance / Math.max(1, ess));
  const halfBand = Math.round(HISTORY_CI_K * se);
  const lo = Math.max(0, mean - halfBand);
  const hi = mean + halfBand;
  // Confidence: scales with sample size, capped at 0.85 (history can't
  // beat a contract).
  const confidence = Math.min(0.85, 0.45 + 0.04 * useSet.length);
  return {
    cptCode: input.cptCode,
    modifier: input.modifier,
    payerId: input.payerId,
    predictedCents: mean,
    loCents: lo,
    hiCents: hi,
    source: "history",
    sampleSize: useSet.length,
    confidence,
    reason: `Avg of last ${useSet.length} adjudications for this payer + CPT (age-weighted, half-life ${AGE_HALF_LIFE_DAYS}d)`,
  };
}

// ---------------------------------------------------------------------------
// Source 3 — Fee-schedule baseline
// ---------------------------------------------------------------------------

function predictFromBaseline(input: PredictInput): PredictedReimbursement {
  if (input.feeScheduleChargeCents <= 0) {
    return {
      cptCode: input.cptCode,
      modifier: input.modifier,
      payerId: input.payerId,
      predictedCents: 0,
      loCents: 0,
      hiCents: 0,
      source: "no_data",
      sampleSize: 0,
      confidence: 0,
      reason: "No contract, no history, no fee-schedule charge — cannot predict.",
    };
  }
  const klass = input.payerClass ?? "other";
  const ratio = PAYER_CLASS_BASELINE[klass] ?? PAYER_CLASS_BASELINE.other;
  const point = Math.round(input.feeScheduleChargeCents * ratio);
  // Wide CI — baseline is a guess, not a measurement.
  const halfBand = Math.round(point * 0.25);
  return {
    cptCode: input.cptCode,
    modifier: input.modifier,
    payerId: input.payerId,
    predictedCents: point,
    loCents: Math.max(0, point - halfBand),
    hiCents: point + halfBand,
    source: "fee_schedule_baseline",
    sampleSize: 0,
    confidence: 0.35,
    reason: `Payer class ${klass} default ratio ${(ratio * 100).toFixed(0)}% × fee-schedule charge`,
  };
}

// ---------------------------------------------------------------------------
// Encounter-level rollup
// ---------------------------------------------------------------------------

export interface EncounterPredictionInput
  extends Omit<PredictInput, "cptCode" | "modifier" | "feeScheduleChargeCents"> {
  lines: Array<{
    cptCode: string;
    modifier: string | null;
    units: number;
    feeScheduleChargeCents: number;
  }>;
}

export interface EncounterPrediction {
  totalPredictedCents: number;
  totalLoCents: number;
  totalHiCents: number;
  /** Confidence weighted by line dollar contribution. */
  confidence: number;
  lines: PredictedReimbursement[];
  /** True when at least one line falls back to baseline / no_data — UI
   *  shows a "rough estimate" tag in that case. */
  hasLowConfidenceLines: boolean;
}

/** Per-encounter rollup. Used by intake & scheduling to surface
 *  expected reimbursement before the visit happens. */
export function predictEncounter(input: EncounterPredictionInput): EncounterPrediction {
  const linePreds = input.lines.map((line) =>
    predictReimbursement({
      ...input,
      cptCode: line.cptCode,
      modifier: line.modifier,
      feeScheduleChargeCents: line.feeScheduleChargeCents,
    }),
  );
  let total = 0;
  let lo = 0;
  let hi = 0;
  let weightedConfNumer = 0;
  let weightedConfDenom = 0;
  for (let i = 0; i < linePreds.length; i++) {
    const units = input.lines[i].units;
    total += linePreds[i].predictedCents * units;
    lo += linePreds[i].loCents * units;
    hi += linePreds[i].hiCents * units;
    const w = linePreds[i].predictedCents * units;
    weightedConfNumer += w * linePreds[i].confidence;
    weightedConfDenom += w;
  }
  const confidence = weightedConfDenom > 0 ? weightedConfNumer / weightedConfDenom : 0;
  const hasLowConfidenceLines = linePreds.some(
    (p) => p.source === "fee_schedule_baseline" || p.source === "no_data",
  );
  return {
    totalPredictedCents: total,
    totalLoCents: lo,
    totalHiCents: hi,
    confidence,
    lines: linePreds,
    hasLowConfidenceLines,
  };
}

// ---------------------------------------------------------------------------
// Helpers exported for tests / downstream agents
// ---------------------------------------------------------------------------

export const _internals = {
  PAYER_CLASS_BASELINE,
  HISTORY_WINDOW_DEFAULT,
  HISTORY_MIN_SAMPLES,
  AGE_HALF_LIFE_DAYS,
  HISTORY_CI_K,
};

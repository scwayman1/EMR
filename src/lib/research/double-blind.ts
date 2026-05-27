/**
 * Double-blind study module (EMR-096)
 * -----------------------------------
 * Pure helpers for randomizing patients into arms, generating opaque
 * blinding codes, and unblinding at the end of the study. The plan is
 * deterministic given the seed + cohort: re-running with the same
 * inputs yields the same allocation. This is what an IRB asks for.
 *
 * Persistence is not the responsibility of this module — the caller
 * (UI / API) writes the resulting `StudyAllocation` rows wherever they
 * choose. We keep the math here testable in isolation.
 */

import { createHmac } from "node:crypto";

export type StudyArm = string;

export interface StudySpec {
  studyId: string;
  /** Arm names in the order they should appear; weight defaults to 1. */
  arms: Array<{ name: StudyArm; weight?: number }>;
  /** Stratification dimensions kept balanced across arms. */
  stratifyBy?: Array<keyof RandomizableSubject>;
  /** Master seed — keep secret until unblinding. */
  seed: string;
  /** Block size for permuted-block randomization. Defaults to 4 × armCount. */
  blockSize?: number;
}

export interface RandomizableSubject {
  patientId: string;
  ageBand: string;
  sex: string;
  primaryCondition: string | null;
}

export interface StudyAllocation {
  studyId: string;
  patientId: string;
  arm: StudyArm;
  blindingCode: string;
  blockId: string;
  enrolledAt: string;
}

/**
 * HMAC-based PRNG. Same seed → same stream. Used so that two separate
 * runs with the same study spec yield the same allocation order.
 */
function hashedFloat(seed: string, key: string): number {
  const h = createHmac("sha256", seed);
  h.update(key);
  const hex = h.digest("hex").slice(0, 13); // 52 bits is plenty for a fraction
  return parseInt(hex, 16) / 2 ** 52;
}

/** Compose the stratum key from configured stratifyBy dimensions. */
function stratumKey(s: RandomizableSubject, dims: Array<keyof RandomizableSubject>): string {
  if (dims.length === 0) return "all";
  return dims.map((d) => `${String(d)}=${s[d] ?? "unknown"}`).join("|");
}

/**
 * Build a permuted-block schedule for one stratum. A block of size
 * `blockSize` contains the arms in the proportion given by `weights`,
 * shuffled deterministically using `seed + blockIndex`.
 */
function permutedBlock(
  arms: Array<{ name: string; weight: number }>,
  blockSize: number,
  seed: string,
  blockIndex: number,
): string[] {
  const totalWeight = arms.reduce((acc, a) => acc + a.weight, 0);
  const slots: string[] = [];
  for (const a of arms) {
    const count = Math.round((a.weight / totalWeight) * blockSize);
    for (let i = 0; i < count; i++) slots.push(a.name);
  }
  // pad / trim to exact size
  while (slots.length < blockSize) slots.push(arms[0].name);
  while (slots.length > blockSize) slots.pop();

  // Fisher-Yates with deterministic randomness keyed on the block.
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(hashedFloat(seed, `block:${blockIndex}:swap:${i}`) * (i + 1));
    const tmp = slots[i];
    slots[i] = slots[j];
    slots[j] = tmp;
  }
  return slots;
}

export interface AllocationPlan {
  spec: StudySpec;
  allocations: StudyAllocation[];
  /** Per-arm + per-stratum counts after the plan executes. */
  balance: Record<StudyArm, number>;
  /** Stratum → arm → count. */
  stratumBalance: Record<string, Record<StudyArm, number>>;
}

/**
 * Allocate every subject to an arm. Subjects are assigned in input
 * order. Within each stratum, blocks are emitted on demand and
 * consumed sequentially.
 */
export function allocate(
  subjects: RandomizableSubject[],
  spec: StudySpec,
): AllocationPlan {
  const armsWeighted = spec.arms.map((a) => ({ name: a.name, weight: a.weight ?? 1 }));
  const blockSize = spec.blockSize ?? Math.max(2, armsWeighted.length * 4);
  const dims = spec.stratifyBy ?? [];

  // Per-stratum block-cursor state.
  const cursors = new Map<
    string,
    { blockIndex: number; remaining: string[] }
  >();
  const allocations: StudyAllocation[] = [];
  const balance: Record<string, number> = Object.fromEntries(
    armsWeighted.map((a) => [a.name, 0]),
  );
  const stratumBalance: Record<string, Record<string, number>> = {};

  const enrolledAt = new Date().toISOString();

  for (const s of subjects) {
    const key = stratumKey(s, dims);
    let cursor = cursors.get(key);
    if (!cursor || cursor.remaining.length === 0) {
      const nextIndex = (cursor?.blockIndex ?? -1) + 1;
      const block = permutedBlock(
        armsWeighted,
        blockSize,
        `${spec.seed}|${key}`,
        nextIndex,
      );
      cursor = { blockIndex: nextIndex, remaining: block };
      cursors.set(key, cursor);
    }
    const arm = cursor.remaining.shift()!;
    const blindingCode = createHmac("sha256", spec.seed)
      .update(`${spec.studyId}|${s.patientId}`)
      .digest("hex")
      .slice(0, 8)
      .toUpperCase();

    allocations.push({
      studyId: spec.studyId,
      patientId: s.patientId,
      arm,
      blindingCode,
      blockId: `${key}#${cursor.blockIndex}`,
      enrolledAt,
    });
    balance[arm] = (balance[arm] ?? 0) + 1;
    const sb = stratumBalance[key] ?? {};
    sb[arm] = (sb[arm] ?? 0) + 1;
    stratumBalance[key] = sb;
  }

  return { spec, allocations, balance, stratumBalance };
}

/**
 * Reveal the arm associated with a blinding code. Requires the master
 * seed — the IRB-approved unblinding step.
 */
export function unblind(
  blindingCode: string,
  allocations: StudyAllocation[],
): StudyAllocation | null {
  return (
    allocations.find((a) => a.blindingCode === blindingCode.toUpperCase()) ?? null
  );
}

/** Chi-square goodness-of-fit against the expected per-arm split. */
export function balanceChiSquare(plan: AllocationPlan): number {
  const total = plan.allocations.length;
  const armsWeighted = plan.spec.arms.map((a) => ({
    name: a.name,
    weight: a.weight ?? 1,
  }));
  const totalWeight = armsWeighted.reduce((acc, a) => acc + a.weight, 0);
  let chi2 = 0;
  for (const a of armsWeighted) {
    const expected = (a.weight / totalWeight) * total;
    const observed = plan.balance[a.name] ?? 0;
    if (expected > 0) chi2 += ((observed - expected) ** 2) / expected;
  }
  return Number(chi2.toFixed(4));
}

/* -------------------------------------------------------------------------- */
/* Withdrawals & interim analysis                                             */
/* -------------------------------------------------------------------------- */

export type WithdrawalReason =
  | "consent_withdrawn"
  | "lost_to_followup"
  | "adverse_event"
  | "protocol_violation"
  | "death"
  | "other";

export interface Withdrawal {
  patientId: string;
  withdrawnAt: string;
  reason: WithdrawalReason;
  /** Optional free-text from the coordinator. Not used for stats. */
  note?: string;
}

export interface RetentionSummary {
  /** Patients still active in the study (allocated minus withdrawn). */
  active: Record<StudyArm, number>;
  /** Withdrawn count by arm. */
  withdrawn: Record<StudyArm, number>;
  /** Withdrawal reason counts (across all arms). */
  reasons: Record<WithdrawalReason, number>;
  /** Retention rate per arm in [0,1]. */
  retentionRate: Record<StudyArm, number>;
  /**
   * Differential dropout flag — true when any pair of arms has a
   * retention-rate gap above the threshold. Triggers an IRB review.
   */
  differentialDropout: boolean;
  differentialThreshold: number;
}

/**
 * Roll withdrawals into a retention snapshot. The threshold controls
 * when we flag differential dropout — default 15 percentage points,
 * tighten via `threshold` when the protocol requires it.
 */
export function summarizeRetention(
  plan: AllocationPlan,
  withdrawals: Withdrawal[],
  options: { differentialThreshold?: number } = {},
): RetentionSummary {
  const armNames = plan.spec.arms.map((a) => a.name);
  const allocated: Record<string, number> = { ...plan.balance };
  const withdrawn: Record<string, number> = Object.fromEntries(
    armNames.map((a) => [a, 0]),
  );
  const reasons: Record<WithdrawalReason, number> = {
    consent_withdrawn: 0,
    lost_to_followup: 0,
    adverse_event: 0,
    protocol_violation: 0,
    death: 0,
    other: 0,
  };

  const armByPatient = new Map(plan.allocations.map((a) => [a.patientId, a.arm]));
  for (const w of withdrawals) {
    const arm = armByPatient.get(w.patientId);
    if (!arm) continue; // unknown patient — ignore
    withdrawn[arm] = (withdrawn[arm] ?? 0) + 1;
    reasons[w.reason] = (reasons[w.reason] ?? 0) + 1;
  }

  const active: Record<string, number> = {};
  const retentionRate: Record<string, number> = {};
  for (const arm of armNames) {
    const a = (allocated[arm] ?? 0) - (withdrawn[arm] ?? 0);
    active[arm] = a;
    retentionRate[arm] =
      (allocated[arm] ?? 0) === 0 ? 0 : a / (allocated[arm] ?? 1);
  }

  const threshold = options.differentialThreshold ?? 0.15;
  const rates = armNames.map((a) => retentionRate[a]);
  const maxGap =
    rates.length < 2 ? 0 : Math.max(...rates) - Math.min(...rates);
  const differentialDropout = maxGap > threshold;

  return {
    active,
    withdrawn,
    reasons,
    retentionRate,
    differentialDropout,
    differentialThreshold: threshold,
  };
}

export interface InterimDecision {
  /** "continue" | "stop_for_efficacy" | "stop_for_futility" | "stop_for_safety". */
  recommendation:
    | "continue"
    | "stop_for_efficacy"
    | "stop_for_futility"
    | "stop_for_safety";
  reasons: string[];
  /** True when DSMB review is mandatory before the next enrollment block. */
  dsmbReviewRequired: boolean;
}

export interface InterimInput {
  /** Patients with primary endpoint observed at this look. */
  observedPerArm: Record<StudyArm, number>;
  /** Successes (binary endpoint) observed per arm. */
  successesPerArm: Record<StudyArm, number>;
  /** Serious adverse events per arm. */
  saesPerArm: Record<StudyArm, number>;
  /** Pre-specified efficacy boundary on success-rate difference (e.g., 0.2). */
  efficacyBoundary: number;
  /** Pre-specified futility boundary (e.g., 0.05). */
  futilityBoundary: number;
  /** Maximum SAE rate per arm before safety stop (e.g., 0.10). */
  safetyBoundary: number;
}

/**
 * Pre-specified interim analysis — purely numeric, no clinical
 * judgement. Use this to *trigger* a DSMB review, not to replace one.
 * Two-arm studies only (treatment + control).
 */
export function interimAnalysis(
  treatmentArm: StudyArm,
  controlArm: StudyArm,
  input: InterimInput,
): InterimDecision {
  const reasons: string[] = [];
  const t = input.observedPerArm[treatmentArm] ?? 0;
  const c = input.observedPerArm[controlArm] ?? 0;
  if (t === 0 || c === 0) {
    return {
      recommendation: "continue",
      reasons: ["Insufficient observations to evaluate boundaries"],
      dsmbReviewRequired: false,
    };
  }

  const successRateT = (input.successesPerArm[treatmentArm] ?? 0) / t;
  const successRateC = (input.successesPerArm[controlArm] ?? 0) / c;
  const diff = successRateT - successRateC;

  const saeRateT = (input.saesPerArm[treatmentArm] ?? 0) / t;
  const saeRateC = (input.saesPerArm[controlArm] ?? 0) / c;

  let recommendation: InterimDecision["recommendation"] = "continue";

  if (saeRateT > input.safetyBoundary) {
    recommendation = "stop_for_safety";
    reasons.push(
      `Treatment SAE rate ${(saeRateT * 100).toFixed(1)}% exceeds safety boundary ${(input.safetyBoundary * 100).toFixed(1)}%`,
    );
  } else if (saeRateC > input.safetyBoundary) {
    recommendation = "stop_for_safety";
    reasons.push(
      `Control SAE rate ${(saeRateC * 100).toFixed(1)}% exceeds safety boundary ${(input.safetyBoundary * 100).toFixed(1)}%`,
    );
  } else if (diff >= input.efficacyBoundary) {
    recommendation = "stop_for_efficacy";
    reasons.push(
      `Treatment-vs-control gap ${(diff * 100).toFixed(1)}pp ≥ efficacy boundary ${(input.efficacyBoundary * 100).toFixed(1)}pp`,
    );
  } else if (diff < input.futilityBoundary) {
    recommendation = "stop_for_futility";
    reasons.push(
      `Treatment-vs-control gap ${(diff * 100).toFixed(1)}pp < futility boundary ${(input.futilityBoundary * 100).toFixed(1)}pp`,
    );
  } else {
    reasons.push(
      `Gap ${(diff * 100).toFixed(1)}pp within continuation zone (futility ${(input.futilityBoundary * 100).toFixed(1)}pp, efficacy ${(input.efficacyBoundary * 100).toFixed(1)}pp)`,
    );
  }

  return {
    recommendation,
    reasons,
    dsmbReviewRequired: recommendation !== "continue",
  };
}

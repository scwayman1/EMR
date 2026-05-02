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

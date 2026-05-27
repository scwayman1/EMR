/**
 * Modular RCM engine — EMR-108
 * --------------------------------------------------------------
 * One coordinator that runs a claim through the full revenue-cycle
 * pipeline. Each step is its own module; this file is the contract +
 * orchestration layer so the agent fleet (claim-construction, scrub,
 * EDI submitter, denial triage, appeals, statements) can compose them
 * without owning the wire-up.
 *
 *   intake → eligibility → coding/scrub → submission → adjudication →
 *   posting → denial-triage → appeal → statement → collections
 *
 * Each stage takes a `RcmContext` and returns either:
 *   - { kind: "advance", to: <next stage>, mutations? }
 *   - { kind: "halt", reason, blocking } — needs human eyes
 *   - { kind: "branch", to: <other stage>, reason } — e.g. denial -> appeal
 *
 * The engine itself has zero Prisma calls. Concrete stages adapt
 * existing modules (`scrub.ts`, `edi/build-from-claim.ts`,
 * `era-ingest.ts`, `denials.ts`, `appeal-tracker.ts`,
 * `statement-generator.ts`, etc.) and return these stage results.
 *
 * Two reasons we want this layer rather than calling each module
 * directly:
 *   1. Single audit trail per claim — every transition lands as a
 *      `FinancialEvent` so the daily-close report can attribute
 *      every dollar to the agent that moved it.
 *   2. Kill switch — flip a stage off (e.g. auto-appeal disabled
 *      during a payer migration) without finding every caller.
 */

import type { ClaimStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Stages
// ---------------------------------------------------------------------------

export type RcmStage =
  | "intake"
  | "eligibility"
  | "coding_scrub"
  | "submission"
  | "ack_277ca"
  | "adjudication"
  | "posting"
  | "denial_triage"
  | "appeal"
  | "statement"
  | "collections"
  | "closed";

export const STAGE_ORDER: readonly RcmStage[] = [
  "intake",
  "eligibility",
  "coding_scrub",
  "submission",
  "ack_277ca",
  "adjudication",
  "posting",
  "statement",
  "closed",
] as const;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RcmContext {
  organizationId: string;
  claimId: string;
  patientId: string;
  encounterId: string | null;
  /** Current claim status as read from Prisma. The engine never trusts
   *  the in-memory copy across stages — stages re-fetch when needed. */
  claimStatus: ClaimStatus;
  /** Free metadata bag passed between stages. Stages may add to it but
   *  must never delete keys other stages depend on. */
  carry: Record<string, unknown>;
  /** Wall-clock used for SLA / timely-filing math; injected for tests. */
  now: () => Date;
}

export interface StageMutation {
  /** Patch to apply to the Claim row before advancing. */
  claim?: Partial<{
    status: ClaimStatus;
    paidAmountCents: number;
    patientRespCents: number;
    submittedAt: Date | null;
    paidAt: Date | null;
    deniedAt: Date | null;
    closedAt: Date | null;
    closureType: string | null;
    notes: string | null;
  }>;
  /** Append-only ledger events the engine should write. */
  events?: Array<{
    type: string;
    amountCents: number;
    description: string;
    metadata?: Record<string, unknown>;
  }>;
}

export type StageResult =
  | { kind: "advance"; to: RcmStage; mutations?: StageMutation; reason?: string }
  | { kind: "halt"; reason: string; blocking: boolean; mutations?: StageMutation }
  | { kind: "branch"; to: RcmStage; reason: string; mutations?: StageMutation };

export interface Stage {
  name: RcmStage;
  /** Returns the next stage the engine should run, or a halt. */
  run(ctx: RcmContext): Promise<StageResult>;
  /** When false, the engine skips this stage and pretends it returned
   *  `advance`. Used as the kill-switch for a misbehaving stage. */
  enabled?: boolean;
}

export interface EngineDeps {
  /** Persist the claim mutations + ledger events from a stage result.
   *  Real impl wraps Prisma; tests pass an in-memory writer. */
  apply(ctx: RcmContext, mutation: StageMutation, stage: RcmStage, transition: TransitionKind): Promise<void>;
  /** Audit hook — called for *every* transition (advance / branch /
   *  halt) so each stage shows up in the daily-close audit log. */
  audit?(ctx: RcmContext, transition: TransitionEvent): Promise<void>;
  /** When provided, used to time stages for the perf dashboard. */
  clock?: () => number;
}

export type TransitionKind = "advance" | "branch" | "halt";

export interface TransitionEvent {
  stage: RcmStage;
  to: RcmStage | null;
  kind: TransitionKind;
  reason?: string;
  durationMs: number;
  blocking?: boolean;
}

// ---------------------------------------------------------------------------
// Run loop
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** Where to start. Default: "intake" for fresh claims. */
  startAt?: RcmStage;
  /** Stop conditions. */
  stopAt?: RcmStage;
  /** Hard cap on stage transitions to prevent infinite loops. */
  maxTransitions?: number;
}

export interface RunReport {
  finalStage: RcmStage;
  transitions: TransitionEvent[];
  halted: boolean;
  haltReason: string | null;
}

/** Run the engine over a claim until it halts or hits `stopAt`/`closed`.
 *  Stages are looked up by name; missing stages cause a soft halt with
 *  the missing-stage name (not an exception — the audit log records it
 *  and ops can patch the registry). */
export async function runRcmEngine(
  ctx: RcmContext,
  stages: Stage[],
  deps: EngineDeps,
  options: RunOptions = {},
): Promise<RunReport> {
  const byName = new Map(stages.map((s) => [s.name, s]));
  const transitions: TransitionEvent[] = [];
  const max = options.maxTransitions ?? 32;
  const stopAt = options.stopAt ?? "closed";
  let current: RcmStage = options.startAt ?? "intake";
  let halted = false;
  let haltReason: string | null = null;
  let safety = 0;

  while (current !== stopAt && current !== "closed" && !halted) {
    if (safety++ > max) {
      halted = true;
      haltReason = `RCM engine exceeded ${max} transitions — likely a stage cycle.`;
      break;
    }
    const stage = byName.get(current);
    if (!stage) {
      const ev: TransitionEvent = { stage: current, to: null, kind: "halt", reason: `unknown_stage:${current}`, durationMs: 0, blocking: true };
      transitions.push(ev);
      await deps.audit?.(ctx, ev);
      halted = true;
      haltReason = `unknown_stage:${current}`;
      break;
    }
    if (stage.enabled === false) {
      const next = nextDefaultStage(current);
      const ev: TransitionEvent = { stage: current, to: next, kind: "advance", reason: "stage_disabled", durationMs: 0 };
      transitions.push(ev);
      await deps.audit?.(ctx, ev);
      current = next;
      continue;
    }
    const start = deps.clock ? deps.clock() : Date.now();
    let result: StageResult;
    try {
      result = await stage.run(ctx);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const ev: TransitionEvent = { stage: current, to: null, kind: "halt", reason: `exception:${reason}`, durationMs: (deps.clock ? deps.clock() : Date.now()) - start, blocking: true };
      transitions.push(ev);
      await deps.audit?.(ctx, ev);
      halted = true;
      haltReason = `exception:${reason}`;
      break;
    }
    const elapsed = (deps.clock ? deps.clock() : Date.now()) - start;
    if (result.mutations) {
      await deps.apply(ctx, result.mutations, current, result.kind);
    }
    if (result.kind === "halt") {
      const ev: TransitionEvent = { stage: current, to: null, kind: "halt", reason: result.reason, durationMs: elapsed, blocking: result.blocking };
      transitions.push(ev);
      await deps.audit?.(ctx, ev);
      halted = result.blocking;
      if (result.blocking) {
        haltReason = result.reason;
        break;
      }
      // Non-blocking halt — try the default next stage.
      current = nextDefaultStage(current);
      continue;
    }
    const ev: TransitionEvent = { stage: current, to: result.to, kind: result.kind, reason: result.reason, durationMs: elapsed };
    transitions.push(ev);
    await deps.audit?.(ctx, ev);
    current = result.to;
  }
  return { finalStage: current, transitions, halted, haltReason };
}

// ---------------------------------------------------------------------------
// Stage helpers
// ---------------------------------------------------------------------------

/** When a stage is disabled or returns a non-blocking halt, where do
 *  we go next? Conservative — moves through the happy-path order. */
export function nextDefaultStage(stage: RcmStage): RcmStage {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx === STAGE_ORDER.length - 1) return "closed";
  return STAGE_ORDER[idx + 1];
}

/** Build a stage that always advances — useful as a no-op / placeholder
 *  while a particular module is being rolled out. */
export function passthroughStage(name: RcmStage, to?: RcmStage): Stage {
  return {
    name,
    enabled: true,
    async run(): Promise<StageResult> {
      return { kind: "advance", to: to ?? nextDefaultStage(name) };
    },
  };
}

// ---------------------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------------------

export interface PipelineHealth {
  totalRuns: number;
  haltedRuns: number;
  blockingHalts: number;
  averageTransitionMs: Record<RcmStage, number>;
  stageHaltCounts: Record<string, number>;
  branchCounts: Record<string, number>;
}

/** Summarize a batch of run reports for the daily-close pipeline-health
 *  panel. */
export function summarizePipelineHealth(reports: RunReport[]): PipelineHealth {
  const stageMs: Partial<Record<RcmStage, { total: number; n: number }>> = {};
  const stageHalts: Record<string, number> = {};
  const branches: Record<string, number> = {};
  let blocking = 0;
  let halted = 0;
  for (const r of reports) {
    if (r.halted) halted++;
    for (const t of r.transitions) {
      const bucket = stageMs[t.stage] ?? { total: 0, n: 0 };
      bucket.total += t.durationMs;
      bucket.n++;
      stageMs[t.stage] = bucket;
      if (t.kind === "halt") {
        if (t.blocking) blocking++;
        const k = `${t.stage}:${t.reason ?? "unknown"}`;
        stageHalts[k] = (stageHalts[k] ?? 0) + 1;
      } else if (t.kind === "branch") {
        const k = `${t.stage}->${t.to}`;
        branches[k] = (branches[k] ?? 0) + 1;
      }
    }
  }
  const avg: Record<RcmStage, number> = {} as Record<RcmStage, number>;
  for (const [stage, b] of Object.entries(stageMs) as Array<[RcmStage, { total: number; n: number }]>) {
    avg[stage] = b.n > 0 ? b.total / b.n : 0;
  }
  return {
    totalRuns: reports.length,
    haltedRuns: halted,
    blockingHalts: blocking,
    averageTransitionMs: avg,
    stageHaltCounts: stageHalts,
    branchCounts: branches,
  };
}

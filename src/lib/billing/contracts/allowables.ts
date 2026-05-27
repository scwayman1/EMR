/**
 * Payer contract allowables — EMR-223 module entrypoint
 * -----------------------------------------------------
 * Re-exports the canonical pure layer from `payer-contracts.ts` plus
 * batch-aggregation helpers used by the underpayment-detection agent.
 *
 * The canonical file owns:
 *   - `findEffectiveContract` / `lookupContractRate`
 *   - `evaluateUnderpayment` (single-line)
 *   - `parseContractCsv` (admin upload format)
 *
 * This module adds:
 *   - `summarizeUnderpayments` — totals + payer-level rollup for the
 *     daily revenue cycle dashboard.
 *   - `detectClaimUnderpayments` — apply contract eval to every line on
 *     a claim in one call.
 */

export {
  evaluateUnderpayment,
  findEffectiveContract,
  lookupContractRate,
  parseContractCsv,
  UNDERPAYMENT_THRESHOLD,
  type ContractLite,
  type ContractRateLite,
  type ParsedContractCsv,
  type UnderpaymentFinding,
} from "../payer-contracts";

import {
  evaluateUnderpayment,
  findEffectiveContract,
  type ContractLite,
  type UnderpaymentFinding,
} from "../payer-contracts";

// ---------------------------------------------------------------------------
// Per-claim evaluation
// ---------------------------------------------------------------------------

export interface ClaimLineForEval {
  cptCode: string;
  modifiers?: string[];
  /** Allowed amount returned by the payer on the 835 (CLP/SVC AMT). */
  allowedCents: number;
}

export interface ClaimUnderpaymentReport {
  contractId: string | null;
  /** One finding per line. Includes lines that were within contract so
   *  the report row reflects the full claim — caller filters as needed. */
  lineFindings: Array<{ cptCode: string; modifiers: string[] } & UnderpaymentFinding>;
  totalShortfallCents: number;
  underpaidLineCount: number;
}

/** Run the underpayment evaluator across every line of a claim. */
export function detectClaimUnderpayments(args: {
  contracts: ContractLite[];
  payerId: string;
  serviceDate: Date;
  lines: ClaimLineForEval[];
  threshold?: number;
}): ClaimUnderpaymentReport {
  const contract = findEffectiveContract(args.contracts, args.payerId, args.serviceDate);
  const lineFindings = args.lines.map((l) => {
    const finding = evaluateUnderpayment({
      contract,
      cptCode: l.cptCode,
      modifiers: l.modifiers,
      allowedCents: l.allowedCents,
      threshold: args.threshold,
    });
    return { cptCode: l.cptCode, modifiers: l.modifiers ?? [], ...finding };
  });
  const totalShortfallCents = lineFindings.reduce((a, l) => a + l.shortfallCents, 0);
  const underpaidLineCount = lineFindings.filter((l) => l.underpaid).length;
  return {
    contractId: contract?.id ?? null,
    lineFindings,
    totalShortfallCents,
    underpaidLineCount,
  };
}

// ---------------------------------------------------------------------------
// Batch summary
// ---------------------------------------------------------------------------

export interface UnderpaymentSummary {
  totalClaims: number;
  underpaidClaims: number;
  totalShortfallCents: number;
  /** Top offenders for the dashboard. */
  byPayer: Array<{ payerId: string; payerName: string; shortfallCents: number; underpaidClaims: number }>;
}

export function summarizeUnderpayments(
  reports: Array<{
    payerId: string;
    payerName: string;
    report: ClaimUnderpaymentReport;
  }>,
): UnderpaymentSummary {
  const byPayer = new Map<string, { payerId: string; payerName: string; shortfallCents: number; underpaidClaims: number }>();
  let totalShortfall = 0;
  let underpaidClaims = 0;
  for (const r of reports) {
    if (r.report.totalShortfallCents > 0) {
      totalShortfall += r.report.totalShortfallCents;
      underpaidClaims++;
      const key = r.payerId;
      const entry = byPayer.get(key) ?? {
        payerId: r.payerId,
        payerName: r.payerName,
        shortfallCents: 0,
        underpaidClaims: 0,
      };
      entry.shortfallCents += r.report.totalShortfallCents;
      entry.underpaidClaims++;
      byPayer.set(key, entry);
    }
  }
  return {
    totalClaims: reports.length,
    underpaidClaims,
    totalShortfallCents: totalShortfall,
    byPayer: [...byPayer.values()].sort((a, b) => b.shortfallCents - a.shortfallCents),
  };
}

/**
 * EMR-349 — Enacted-only / settled-only legal-recommendation filter.
 *
 * Hard guardrail: the compliance agents (EMR-347) may *learn from* any
 * cited case, but they may only *implement* recommendations grounded
 * in enacted laws and officially settled cases. This module is the
 * single chokepoint that filters the set of corpus records the agent
 * is allowed to cite when proposing a site-facing change.
 *
 * Excluded from implementation:
 *  - Bills that have not passed
 *  - Cases in active litigation
 *  - Cases in review
 *  - Cases on appeal
 *  - Overturned rulings
 *
 * Attempting to recommend a change citing a non-final source must
 * fail-loud — call sites that produce site-facing copy or shipping
 * gates should run their citation list through `assertActionable()`
 * BEFORE writing.
 */

import type { CitationRef, RegulatoryStatus } from "@/lib/marketplace/state-legality-matrix";

export const ACTIONABLE_STATUSES: ReadonlySet<RegulatoryStatus> = new Set([
  "enacted",
  "settled",
]);

export const NON_ACTIONABLE_STATUSES: ReadonlySet<RegulatoryStatus> = new Set([
  "pending",
  "in_review",
  "appealed",
  "overturned",
]);

export interface FilterResult<T extends { citations: ReadonlyArray<CitationRef> }> {
  actionable: T[];
  rejected: Array<{ record: T; reason: string }>;
}

export function isActionableCitation(c: CitationRef): boolean {
  return ACTIONABLE_STATUSES.has(c.status);
}

export function isFullyActionable(citations: ReadonlyArray<CitationRef>): boolean {
  if (citations.length === 0) return false;
  return citations.every(isActionableCitation);
}

export function filterActionable<T extends { citations: ReadonlyArray<CitationRef> }>(
  records: ReadonlyArray<T>,
): FilterResult<T> {
  const actionable: T[] = [];
  const rejected: Array<{ record: T; reason: string }> = [];

  for (const record of records) {
    if (record.citations.length === 0) {
      rejected.push({ record, reason: "no citations" });
      continue;
    }
    const nonFinal = record.citations.filter((c) => NON_ACTIONABLE_STATUSES.has(c.status));
    if (nonFinal.length > 0) {
      const labels = nonFinal.map((c) => `${c.label} [${c.status}]`).join("; ");
      rejected.push({ record, reason: `non-final citations: ${labels}` });
      continue;
    }
    actionable.push(record);
  }

  return { actionable, rejected };
}

/**
 * Throws if any of the citations is not actionable. Use this at the
 * boundary where a recommendation becomes a site-facing change so a
 * non-final citation cannot accidentally be implemented.
 */
export function assertActionable(
  citations: ReadonlyArray<CitationRef>,
  context: string,
): void {
  if (citations.length === 0) {
    throw new Error(
      `[legal-status-filter] ${context}: refusing to recommend without any citations.`,
    );
  }
  const nonFinal = citations.filter((c) => NON_ACTIONABLE_STATUSES.has(c.status));
  if (nonFinal.length > 0) {
    const labels = nonFinal.map((c) => `${c.label} [${c.status}]`).join("; ");
    throw new Error(
      `[legal-status-filter] ${context}: cannot ship a site-facing change citing non-final law (${labels}). ` +
        `Only enacted statutes and settled cases are permitted.`,
    );
  }
}

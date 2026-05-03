/**
 * EMR-356 — Compliance findings → remediation backlog model.
 *
 * Type-level scaffolding for the workflow that turns compliance-scan
 * findings (EMR-351) into actionable engineering tickets. Persistence
 * lands in a follow-up — this module defines the contract every
 * producer (compliance scan agents) and consumer (remediation queue,
 * Linear sync, human-lawyer review handoff) shares.
 *
 * Each remediation ticket carries:
 *   - source finding (URL + offending element)
 *   - jurisdiction(s) affected
 *   - citation (statute or settled case ID, effective date)
 *   - severity (P0 / P1 / P2)
 *   - proposed copy or UX change
 *   - status: needs-human-lawyer-review → approved → in-progress → shipped
 */

import type { CitationRef } from "@/lib/marketplace/state-legality-matrix";
import { isFullyActionable } from "./legal-status-filter";

export type FindingSeverity = "P0" | "P1" | "P2";

export type FindingStatus =
  | "open"
  | "needs_human_lawyer_review"
  | "approved"
  | "in_progress"
  | "shipped"
  | "rejected"
  | "duplicate";

export interface ComplianceFinding {
  id: string;
  /** Where the offending element was observed (page URL or route). */
  sourceUrl: string;
  /** CSS selector / DOM path / copy snippet identifying the element. */
  offendingElement: string;
  /** Plain-language description of what the agent flagged. */
  description: string;
  /** US state codes / federal scope this finding applies to. */
  jurisdictions: string[];
  /** Citations supporting the finding — must be `enacted` / `settled`. */
  citations: CitationRef[];
  severity: FindingSeverity;
  /** Suggested copy / UX change to remediate. */
  proposedFix: string;
  /** Optional reference to the agent persona that produced the finding. */
  reportedByAgentPersonaId?: string;
}

export interface RemediationTicket extends ComplianceFinding {
  status: FindingStatus;
  /** Linear (or other tracker) issue identifier when synced. */
  externalIssueRef?: string;
  /** Outside-counsel review verdict, if any. */
  humanLawyerReview?: {
    reviewerName: string;
    verdict: "approved" | "rejected" | "modified";
    notes: string;
    reviewedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Sanity-check a finding before it's promoted to a remediation ticket.
 * Refuses findings citing non-final law (per EMR-349) and findings
 * missing the proposed-fix copy (so we don't open empty tickets).
 */
export function validateFindingForBacklog(finding: ComplianceFinding): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!finding.sourceUrl.trim()) errors.push("missing sourceUrl");
  if (!finding.offendingElement.trim()) errors.push("missing offendingElement");
  if (!finding.description.trim()) errors.push("missing description");
  if (!finding.proposedFix.trim()) errors.push("missing proposedFix");
  if (finding.jurisdictions.length === 0) errors.push("missing jurisdictions");
  if (!isFullyActionable(finding.citations)) {
    errors.push("citations must be enacted or settled (EMR-349 enacted-only filter)");
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Promote a validated finding into an open remediation ticket. The
 * `status` always starts at `needs_human_lawyer_review` because Dr.
 * Patel directive: no compliance change ships without outside-counsel
 * sign-off (EMR-357).
 */
export function promoteFindingToTicket(
  finding: ComplianceFinding,
  now: Date = new Date(),
): RemediationTicket {
  const validation = validateFindingForBacklog(finding);
  if (!validation.ok) {
    throw new Error(
      `[findings-remediation] Cannot promote finding ${finding.id}: ${validation.errors.join("; ")}`,
    );
  }
  const iso = now.toISOString();
  return {
    ...finding,
    status: "needs_human_lawyer_review",
    createdAt: iso,
    updatedAt: iso,
  };
}

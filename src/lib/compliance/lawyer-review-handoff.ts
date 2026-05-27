/**
 * EMR-357 — Human-lawyer review handoff workflow.
 *
 * No compliance change ships without outside-counsel sign-off.
 * This module formalises the export package and the inbound verdict
 * the workflow needs:
 *
 *   1. Agent produces a finding → remediation ticket with citations.
 *   2. Ticket is exported to outside counsel as a reviewable package.
 *   3. Counsel returns approve / reject / modify with notes.
 *   4. Approved items move to engineering; rejected items archive
 *      with the rationale captured back into the agent's training set.
 *
 * Persistence is handled by the consumer (queue worker / API). This
 * module owns the schema both sides agree on.
 */

import type { RemediationTicket } from "./findings-remediation";

export interface LawyerReviewPackage {
  ticketId: string;
  finding: {
    sourceUrl: string;
    offendingElement: string;
    description: string;
    jurisdictions: string[];
  };
  citations: ReadonlyArray<{
    label: string;
    url?: string;
    effective?: string;
    status: string;
  }>;
  proposedFix: string;
  /** Markdown/HTML rendering for counsel-friendly inbox display. */
  rendered: {
    markdown: string;
    /** Optional screenshot capture URL (S3 etc.) of the offending page. */
    screenshotUrl?: string;
  };
  /** The agent persona that produced this finding. */
  agentPersonaId?: string;
  /** Stable hash of the package contents for reply-correlation. */
  packageHash: string;
  exportedAt: string;
}

export type LawyerVerdict = "approved" | "rejected" | "modified";

export interface LawyerReviewVerdict {
  ticketId: string;
  reviewerName: string;
  verdict: LawyerVerdict;
  notes: string;
  /** When `verdict === "modified"`, the counsel-revised proposed fix. */
  modifiedProposedFix?: string;
  receivedAt: string;
}

function stableHash(input: string): string {
  // FNV-1a 32-bit — small, dependency-free, sufficient for correlation.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildLawyerReviewPackage(
  ticket: RemediationTicket,
  opts: { screenshotUrl?: string } = {},
): LawyerReviewPackage {
  const md = renderTicketMarkdown(ticket);
  const hash = stableHash(
    [
      ticket.id,
      ticket.sourceUrl,
      ticket.offendingElement,
      ticket.proposedFix,
      ticket.citations.map((c) => `${c.label}|${c.status}`).join(";"),
    ].join("\n"),
  );
  return {
    ticketId: ticket.id,
    finding: {
      sourceUrl: ticket.sourceUrl,
      offendingElement: ticket.offendingElement,
      description: ticket.description,
      jurisdictions: ticket.jurisdictions,
    },
    citations: ticket.citations.map((c) => ({
      label: c.label,
      url: c.url,
      effective: c.effective,
      status: c.status,
    })),
    proposedFix: ticket.proposedFix,
    rendered: { markdown: md, screenshotUrl: opts.screenshotUrl },
    agentPersonaId: ticket.reportedByAgentPersonaId,
    packageHash: hash,
    exportedAt: new Date().toISOString(),
  };
}

function renderTicketMarkdown(ticket: RemediationTicket): string {
  const lines: string[] = [];
  lines.push(`# Compliance review: ${ticket.id}`);
  lines.push("");
  lines.push(`**Severity:** ${ticket.severity}`);
  lines.push(`**Jurisdictions:** ${ticket.jurisdictions.join(", ")}`);
  lines.push(`**Source URL:** ${ticket.sourceUrl}`);
  lines.push(`**Offending element:** \`${ticket.offendingElement}\``);
  lines.push("");
  lines.push("## Finding");
  lines.push(ticket.description);
  lines.push("");
  lines.push("## Proposed fix");
  lines.push(ticket.proposedFix);
  lines.push("");
  lines.push("## Citations");
  for (const c of ticket.citations) {
    lines.push(
      `- **${c.label}** [${c.status}]${c.effective ? ` — effective ${c.effective}` : ""}${c.url ? ` — ${c.url}` : ""}`,
    );
  }
  return lines.join("\n");
}

/**
 * Fold a counsel verdict back into the ticket. Approved items become
 * engineering-ready; rejected items are archived; modified items adopt
 * counsel's revised proposed fix and re-enter the engineering queue.
 */
export function applyLawyerVerdict(
  ticket: RemediationTicket,
  verdict: LawyerReviewVerdict,
  now: Date = new Date(),
): RemediationTicket {
  const updated: RemediationTicket = {
    ...ticket,
    humanLawyerReview: {
      reviewerName: verdict.reviewerName,
      verdict: verdict.verdict,
      notes: verdict.notes,
      reviewedAt: verdict.receivedAt,
    },
    updatedAt: now.toISOString(),
  };

  switch (verdict.verdict) {
    case "approved":
      updated.status = "approved";
      return updated;
    case "rejected":
      updated.status = "rejected";
      return updated;
    case "modified":
      updated.status = "approved";
      if (verdict.modifiedProposedFix?.trim()) {
        updated.proposedFix = verdict.modifiedProposedFix;
      }
      return updated;
  }
}

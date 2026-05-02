import { describe, it, expect } from "vitest";
import {
  buildLawyerReviewPackage,
  applyLawyerVerdict,
} from "./lawyer-review-handoff";
import { promoteFindingToTicket, type ComplianceFinding } from "./findings-remediation";
import type { CitationRef } from "@/lib/marketplace/state-legality-matrix";

const enacted: CitationRef = {
  label: "Statute X",
  status: "enacted",
  effective: "2024-01-01",
  url: "https://example.gov/x",
};

const finding: ComplianceFinding = {
  id: "f-1",
  sourceUrl: "https://www.theleafmart.com/products/example",
  offendingElement: "h1.product-headline",
  description: "Headline contains 'cures anxiety'.",
  jurisdictions: ["federal-us"],
  citations: [enacted],
  severity: "P0",
  proposedFix: "Replace headline with 'supports a calm evening routine'.",
};

describe("buildLawyerReviewPackage", () => {
  it("produces a stable hash for the same ticket contents", () => {
    const ticket = promoteFindingToTicket(finding, new Date("2026-05-02T12:00:00Z"));
    const a = buildLawyerReviewPackage(ticket);
    const b = buildLawyerReviewPackage(ticket);
    expect(a.packageHash).toBe(b.packageHash);
    expect(a.rendered.markdown).toContain("cures anxiety");
    expect(a.rendered.markdown).toContain("Statute X");
  });
});

describe("applyLawyerVerdict", () => {
  it("approves a ticket and stamps the review", () => {
    const ticket = promoteFindingToTicket(finding);
    const updated = applyLawyerVerdict(
      ticket,
      {
        ticketId: ticket.id,
        reviewerName: "Outside Counsel",
        verdict: "approved",
        notes: "Looks good.",
        receivedAt: "2026-05-03T09:00:00Z",
      },
      new Date("2026-05-03T09:01:00Z"),
    );
    expect(updated.status).toBe("approved");
    expect(updated.humanLawyerReview?.verdict).toBe("approved");
  });

  it("adopts counsel's revised fix when verdict is modified", () => {
    const ticket = promoteFindingToTicket(finding);
    const updated = applyLawyerVerdict(ticket, {
      ticketId: ticket.id,
      reviewerName: "Outside Counsel",
      verdict: "modified",
      notes: "Use this safer phrasing.",
      modifiedProposedFix: "Use 'support a quieter evening routine'.",
      receivedAt: "2026-05-03T09:00:00Z",
    });
    expect(updated.status).toBe("approved");
    expect(updated.proposedFix).toContain("quieter evening routine");
  });

  it("archives a rejected ticket", () => {
    const ticket = promoteFindingToTicket(finding);
    const updated = applyLawyerVerdict(ticket, {
      ticketId: ticket.id,
      reviewerName: "Outside Counsel",
      verdict: "rejected",
      notes: "Not a violation.",
      receivedAt: "2026-05-03T09:00:00Z",
    });
    expect(updated.status).toBe("rejected");
  });
});

import { describe, it, expect } from "vitest";
import {
  validateFindingForBacklog,
  promoteFindingToTicket,
  type ComplianceFinding,
} from "./findings-remediation";
import type { CitationRef } from "@/lib/marketplace/state-legality-matrix";

const enacted: CitationRef = { label: "Statute X", status: "enacted" };
const pending: CitationRef = { label: "Pending bill", status: "pending" };

const baseFinding: ComplianceFinding = {
  id: "f-1",
  sourceUrl: "https://www.theleafmart.com/products/example",
  offendingElement: "h1.product-headline",
  description: "Headline contains 'cures anxiety'.",
  jurisdictions: ["federal-us"],
  citations: [enacted],
  severity: "P0",
  proposedFix: "Replace headline with 'supports a calm evening routine'.",
};

describe("validateFindingForBacklog", () => {
  it("accepts a complete finding citing only enacted law", () => {
    const r = validateFindingForBacklog(baseFinding);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects a finding with a non-final citation", () => {
    const r = validateFindingForBacklog({ ...baseFinding, citations: [pending] });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/enacted-only/);
  });

  it("rejects a finding missing required fields", () => {
    const r = validateFindingForBacklog({
      ...baseFinding,
      sourceUrl: "",
      offendingElement: "",
      description: "",
      proposedFix: "",
      jurisdictions: [],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe("promoteFindingToTicket", () => {
  it("creates a ticket in needs_human_lawyer_review status", () => {
    const ticket = promoteFindingToTicket(baseFinding, new Date("2026-05-02T12:00:00Z"));
    expect(ticket.status).toBe("needs_human_lawyer_review");
    expect(ticket.createdAt).toBe("2026-05-02T12:00:00.000Z");
  });

  it("throws on an invalid finding rather than opening a bad ticket", () => {
    expect(() =>
      promoteFindingToTicket({ ...baseFinding, citations: [pending] }),
    ).toThrow(/enacted-only/);
  });
});

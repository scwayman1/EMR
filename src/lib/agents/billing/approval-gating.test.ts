import { describe, expect, it } from "vitest";

import { agingAgent } from "./aging-agent";
import { chargeIntegrityAgent } from "./charge-integrity-agent";
import { clearinghouseSubmissionAgent } from "./clearinghouse-submission-agent";
import { denialTriageAgent } from "./denial-triage-agent";
import { refundCreditAgent } from "./refund-credit-agent";
import { underpaymentDetectionAgent } from "./underpayment-detection-agent";

// ---------------------------------------------------------------------------
// Approval gating — regression fence for high-risk billing agents
// ---------------------------------------------------------------------------
// These tests exist to prevent a silent regression where a billing agent
// that touches financial state is flipped back to `requiresApproval: false`.
// The failure mode is quiet (claims get submitted, money moves, tasks get
// created without a human signature) so we pin the contract here.
//
// If you legitimately need to change one of these flags, update BOTH the
// agent and this test in the same commit, and document the rationale in
// the PR body.
// ---------------------------------------------------------------------------

describe("high-risk billing agents require approval", () => {
  it("clearinghouseSubmissionAgent requires approval (external EDI submission)", () => {
    expect(clearinghouseSubmissionAgent.requiresApproval).toBe(true);
  });

  it("chargeIntegrityAgent requires approval (writes Claim.scrubIssues)", () => {
    expect(chargeIntegrityAgent.requiresApproval).toBe(true);
  });

  it("denialTriageAgent requires approval (drives appeal/write-off routing)", () => {
    expect(denialTriageAgent.requiresApproval).toBe(true);
  });

  it("underpaymentDetectionAgent requires approval (payer recovery actions)", () => {
    expect(underpaymentDetectionAgent.requiresApproval).toBe(true);
  });

  it("refundCreditAgent requires approval (money-out recommendations)", () => {
    // This agent's own description promises it is approval-gated. Enforce.
    expect(refundCreditAgent.requiresApproval).toBe(true);
  });
});

describe("reporting billing agents stay ungated (control case)", () => {
  it("agingAgent does not require approval — it's a pure A/R sweep", () => {
    // If this starts failing, someone gated a reporting agent and likely
    // meant to gate a different one. Check the PR carefully.
    expect(agingAgent.requiresApproval).toBe(false);
  });
});

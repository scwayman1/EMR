import { describe, expect, it } from "vitest";
import {
  scrubClaim,
  isClaimSubmittable,
  countBySeverity,
  type ScrubInput,
  type ScrubIssue,
} from "@/lib/billing/scrub";

// ---------------------------------------------------------------------------
// Charge Integrity Agent — pure helper tests
// ---------------------------------------------------------------------------
// The chargeIntegrity agent wraps the deterministic scrub engine in
// `@/lib/billing/scrub`. These tests exercise the pure-helper surface that
// the agent uses (scrubClaim, isClaimSubmittable, countBySeverity) so that
// any regression in the rules will be caught without needing to mock Prisma.

const FIXED_NOW = new Date("2026-04-19T12:00:00Z");

function baseClaim(overrides: Partial<ScrubInput> = {}): ScrubInput {
  return {
    cptCodes: [{ code: "99213", label: "Established Pt E&M", chargeAmount: 12500 }],
    icd10Codes: [{ code: "G89.29", label: "Chronic pain" }],
    payerName: "Blue Cross",
    serviceDate: new Date(FIXED_NOW.getTime() - 7 * 86_400_000), // 7 days ago
    providerId: "provider-1",
    patientCoverage: {
      eligibilityStatus: "active",
      payerName: "Blue Cross",
    },
    ...overrides,
  };
}

describe("scrubClaim", () => {
  it("returns no issues for a clean claim", () => {
    const issues = scrubClaim(baseClaim());
    expect(issues).toEqual([]);
  });

  it("flags MISSING_CPT as a blocking error when no CPT codes are present", () => {
    const issues = scrubClaim(baseClaim({ cptCodes: [] }));
    const missing = issues.find((i) => i.ruleCode === "MISSING_CPT");
    expect(missing).toBeDefined();
    expect(missing!.severity).toBe("error");
    expect(missing!.blocksSubmission).toBe(true);
  });

  it("flags MISSING_DIAGNOSIS as a blocking error when no ICD-10 codes are present", () => {
    const issues = scrubClaim(baseClaim({ icd10Codes: [] }));
    const missing = issues.find((i) => i.ruleCode === "MISSING_DIAGNOSIS");
    expect(missing).toBeDefined();
    expect(missing!.severity).toBe("error");
    expect(missing!.blocksSubmission).toBe(true);
  });

  it("flags MISSING_PAYER when payerName is null", () => {
    const issues = scrubClaim(baseClaim({ payerName: null }));
    expect(issues.some((i) => i.ruleCode === "MISSING_PAYER")).toBe(true);
  });

  it("flags MISSING_PROVIDER when providerId is null", () => {
    const issues = scrubClaim(baseClaim({ providerId: null }));
    expect(issues.some((i) => i.ruleCode === "MISSING_PROVIDER")).toBe(true);
  });

  it("flags ELIGIBILITY_NOT_ACTIVE when primary coverage is not active", () => {
    const issues = scrubClaim(
      baseClaim({
        patientCoverage: {
          eligibilityStatus: "termed",
          payerName: "Blue Cross",
        },
      }),
    );
    const issue = issues.find((i) => i.ruleCode === "ELIGIBILITY_NOT_ACTIVE");
    expect(issue).toBeDefined();
    expect(issue!.blocksSubmission).toBe(true);
  });

  it("flags MISSING_PRIOR_AUTH when authRequired is set but no auth number", () => {
    const issues = scrubClaim(
      baseClaim({ authRequired: true, authNumber: null }),
    );
    expect(issues.some((i) => i.ruleCode === "MISSING_PRIOR_AUTH")).toBe(true);
  });

  it("does not flag MISSING_PRIOR_AUTH when auth number is present", () => {
    const issues = scrubClaim(
      baseClaim({ authRequired: true, authNumber: "AUTH123" }),
    );
    expect(issues.some((i) => i.ruleCode === "MISSING_PRIOR_AUTH")).toBe(false);
  });

  it("emits a warning for high-level E&M codes (99215)", () => {
    const issues = scrubClaim(
      baseClaim({
        cptCodes: [{ code: "99215", label: "Est pt high", chargeAmount: 22500 }],
      }),
    );
    const issue = issues.find((i) => i.ruleCode === "HIGH_LEVEL_EM_REVIEW");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
    expect(issue!.blocksSubmission).toBe(false);
  });

  it("emits a warning for unrecognized 99xxx E&M codes", () => {
    const issues = scrubClaim(
      baseClaim({
        cptCodes: [{ code: "99999", label: "fake", chargeAmount: 10000 }],
      }),
    );
    expect(issues.some((i) => i.ruleCode === "UNRECOGNIZED_EM_CODE")).toBe(true);
  });

  it("emits MISSING_CHARGE_AMOUNT when a CPT has no charge or zero charge", () => {
    const issues = scrubClaim(
      baseClaim({
        cptCodes: [{ code: "99213", label: "x", chargeAmount: 0 }],
      }),
    );
    expect(issues.some((i) => i.ruleCode === "MISSING_CHARGE_AMOUNT")).toBe(true);
  });

  it("emits APPROACHING_TIMELY_FILING as warning when within the last 20% of the payer window", () => {
    // BCBS has a 180-day TF window; 160 days is inside the last 20%.
    const serviceDate = new Date(Date.now() - 160 * 86_400_000);
    const issues = scrubClaim(baseClaim({ serviceDate }));
    const issue = issues.find((i) => i.ruleCode === "APPROACHING_TIMELY_FILING");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("emits PAST_TIMELY_FILING as blocking error when past the payer window", () => {
    // BCBS: 200 days > 180-day TF window.
    const serviceDate = new Date(Date.now() - 200 * 86_400_000);
    const issues = scrubClaim(baseClaim({ serviceDate }));
    const issue = issues.find((i) => i.ruleCode === "PAST_TIMELY_FILING");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("error");
    expect(issue!.blocksSubmission).toBe(true);
  });
});

describe("isClaimSubmittable", () => {
  it("is true when there are no issues", () => {
    expect(isClaimSubmittable([])).toBe(true);
  });

  it("is true when only non-blocking warnings/info are present", () => {
    const issues: ScrubIssue[] = [
      {
        ruleCode: "HIGH_LEVEL_EM_REVIEW",
        severity: "warning",
        message: "",
        suggestion: "",
        blocksSubmission: false,
      },
    ];
    expect(isClaimSubmittable(issues)).toBe(true);
  });

  it("is false when any issue blocks submission", () => {
    const issues: ScrubIssue[] = [
      {
        ruleCode: "MISSING_CPT",
        severity: "error",
        message: "",
        suggestion: "",
        blocksSubmission: true,
      },
    ];
    expect(isClaimSubmittable(issues)).toBe(false);
  });
});

describe("countBySeverity", () => {
  it("zero-counts on empty list", () => {
    expect(countBySeverity([])).toEqual({ error: 0, warning: 0, info: 0 });
  });

  it("tallies mixed severities", () => {
    const issues: ScrubIssue[] = [
      { ruleCode: "a", severity: "error", message: "", suggestion: "", blocksSubmission: true },
      { ruleCode: "b", severity: "error", message: "", suggestion: "", blocksSubmission: true },
      { ruleCode: "c", severity: "warning", message: "", suggestion: "", blocksSubmission: false },
      { ruleCode: "d", severity: "info", message: "", suggestion: "", blocksSubmission: false },
    ];
    expect(countBySeverity(issues)).toEqual({ error: 2, warning: 1, info: 1 });
  });
});

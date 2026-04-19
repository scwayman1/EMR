import { describe, expect, it } from "vitest";
import {
  ALREADY_SUBMITTED_STATUSES,
  evaluateSubmissionEligibility,
  isRejectionRetryEligible,
  isRetryAllowed,
  validateForSubmission,
} from "./clearinghouse-submission-agent";

// ---------------------------------------------------------------------------
// Clearinghouse Submission Agent — pure helper tests
// ---------------------------------------------------------------------------
// The agent wraps real Prisma calls, so tests here exercise only the pure
// decision helpers: retry guard, submission eligibility, and the 837P
// validation shim.

const SERVICE_DATE = new Date("2026-04-10T00:00:00Z");

function validClaim(
  overrides: Partial<Parameters<typeof validateForSubmission>[0]> = {},
): Parameters<typeof validateForSubmission>[0] {
  return {
    billingNpi: "1234567890",
    payerId: "AETNA-001",
    billedAmountCents: 12500,
    serviceDate: SERVICE_DATE,
    cptCodes: [{ code: "99213", label: "E&M" }],
    icd10Codes: [{ code: "G89.29", label: "chronic pain" }],
    placeOfService: "11",
    ...overrides,
  };
}

describe("isRetryAllowed", () => {
  it("allows first submission (0 priors)", () => {
    expect(isRetryAllowed(0)).toEqual({ allowed: true });
  });

  it("allows the third attempt (2 priors with default max=3)", () => {
    expect(isRetryAllowed(2)).toEqual({ allowed: true });
  });

  it("denies once priors reach the max", () => {
    expect(isRetryAllowed(3)).toEqual({
      allowed: false,
      reason: "retry_limit_exceeded",
    });
  });

  it("respects a custom maxAttempts override", () => {
    expect(isRetryAllowed(4, 5)).toEqual({ allowed: true });
    expect(isRetryAllowed(5, 5)).toEqual({
      allowed: false,
      reason: "retry_limit_exceeded",
    });
  });
});

describe("isRejectionRetryEligible", () => {
  it("returns true when another attempt remains after this rejection", () => {
    // After rejection of priors=0, we've used 1 of 3 → 2 attempts left
    expect(isRejectionRetryEligible(0)).toBe(true);
    expect(isRejectionRetryEligible(1)).toBe(true);
  });

  it("returns false when this rejection was the last allowed attempt", () => {
    // priors=2 means this submission is #3 — cannot retry again
    expect(isRejectionRetryEligible(2)).toBe(false);
  });
});

describe("evaluateSubmissionEligibility", () => {
  it("allows submission for a ready claim with a clean scrub and no priors", () => {
    const result = evaluateSubmissionEligibility({
      claimStatus: "ready",
      scrubStatus: "clean",
      priorSubmissionCount: 0,
    });
    expect(result).toEqual({ submittable: true });
  });

  it("blocks when claim is already submitted", () => {
    const result = evaluateSubmissionEligibility({
      claimStatus: "submitted",
      scrubStatus: "clean",
      priorSubmissionCount: 0,
    });
    expect(result.submittable).toBe(false);
    expect(result).toMatchObject({ reason: "already_submitted", detail: "submitted" });
  });

  it("blocks when claim is accepted/paid/partial/adjudicated", () => {
    for (const status of ["accepted", "adjudicated", "paid", "partial"]) {
      expect(
        evaluateSubmissionEligibility({
          claimStatus: status,
          scrubStatus: "clean",
          priorSubmissionCount: 0,
        }),
      ).toMatchObject({ submittable: false, reason: "already_submitted" });
    }
  });

  it("blocks when scrub status is 'blocked'", () => {
    const result = evaluateSubmissionEligibility({
      claimStatus: "ready",
      scrubStatus: "blocked",
      priorSubmissionCount: 0,
    });
    expect(result).toMatchObject({
      submittable: false,
      reason: "blocked_by_scrub",
    });
  });

  it("blocks when retry limit is hit", () => {
    const result = evaluateSubmissionEligibility({
      claimStatus: "ch_rejected",
      scrubStatus: "clean",
      priorSubmissionCount: 3,
    });
    expect(result).toMatchObject({
      submittable: false,
      reason: "retry_limit_exceeded",
    });
  });

  it("prioritizes already_submitted over retry_limit when both apply", () => {
    const result = evaluateSubmissionEligibility({
      claimStatus: "paid",
      scrubStatus: "clean",
      priorSubmissionCount: 99,
    });
    expect(result).toMatchObject({ submittable: false, reason: "already_submitted" });
  });

  it("honors a custom maxAttempts value", () => {
    // With max=2 and 2 priors already on file, a third submission is blocked.
    const blocked = evaluateSubmissionEligibility({
      claimStatus: "ready",
      scrubStatus: "clean",
      priorSubmissionCount: 2,
      maxAttempts: 2,
    });
    expect(blocked).toMatchObject({
      submittable: false,
      reason: "retry_limit_exceeded",
    });

    // And with max=5, a claim with 3 priors still has room.
    const allowed = evaluateSubmissionEligibility({
      claimStatus: "ready",
      scrubStatus: "clean",
      priorSubmissionCount: 3,
      maxAttempts: 5,
    });
    expect(allowed).toEqual({ submittable: true });
  });

  it("exposes the known 'already submitted' statuses", () => {
    expect(ALREADY_SUBMITTED_STATUSES).toContain("submitted");
    expect(ALREADY_SUBMITTED_STATUSES).toContain("paid");
  });
});

describe("validateForSubmission", () => {
  it("passes on a fully populated claim", () => {
    expect(validateForSubmission(validClaim())).toEqual([]);
  });

  it("flags missing billing NPI", () => {
    const errors = validateForSubmission(validClaim({ billingNpi: null }));
    expect(errors).toContain("Missing billing NPI");
  });

  it("flags missing payer ID", () => {
    const errors = validateForSubmission(validClaim({ payerId: null }));
    expect(errors).toContain("Missing payer ID");
  });

  it("flags zero-dollar or negative billed amount", () => {
    expect(validateForSubmission(validClaim({ billedAmountCents: 0 }))).toContain(
      "Billed amount must be greater than zero",
    );
    expect(
      validateForSubmission(validClaim({ billedAmountCents: -5 })),
    ).toContain("Billed amount must be greater than zero");
  });

  it("flags empty CPT and ICD-10 arrays", () => {
    const errors = validateForSubmission(
      validClaim({ cptCodes: [], icd10Codes: [] }),
    );
    expect(errors).toEqual(
      expect.arrayContaining(["No CPT codes on claim", "No ICD-10 codes on claim"]),
    );
  });

  it("flags non-array CPT data as missing CPTs", () => {
    const errors = validateForSubmission(validClaim({ cptCodes: null as unknown }));
    expect(errors).toContain("No CPT codes on claim");
  });

  it("flags missing place of service", () => {
    const errors = validateForSubmission(validClaim({ placeOfService: null }));
    expect(errors).toContain("Missing place of service code");
  });
});

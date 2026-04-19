import { describe, expect, it } from "vitest";
import {
  ALREADY_SUBMITTED_STATUSES,
  evaluateRetryGuard,
  evaluateSubmissionEligibility,
  isRejectionRetryEligible,
  isRetryAllowed,
  SUBMISSION_COOLDOWN_MS,
  SUBMISSION_RETRY_LIMIT,
  type PriorSubmissionInput,
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

const NOW = new Date("2026-04-19T12:00:00Z");

function msAgo(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

function secondsAgo(s: number): Date {
  return msAgo(s * 1_000);
}

function minutesAgo(m: number): Date {
  return msAgo(m * 60_000);
}

function submissions(...whens: Date[]): PriorSubmissionInput[] {
  return whens.map((submittedAt) => ({ submittedAt }));
}

describe("evaluateRetryGuard", () => {
  it("allows the first-ever submission (no priors)", () => {
    const decision = evaluateRetryGuard([], NOW);
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(0);
    }
  });

  it("allows a second submission when the first is well outside the cooldown", () => {
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(30)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(1);
    }
  });

  it("blocks when exactly the retry limit has been reached", () => {
    // 3 prior submissions, all outside cooldown — still blocked by cap.
    const priors = submissions(
      minutesAgo(60),
      minutesAgo(30),
      minutesAgo(10),
    );
    const decision = evaluateRetryGuard(priors, NOW);
    expect(decision.outcome).toBe("retry_limit_exceeded");
    if (decision.outcome === "retry_limit_exceeded") {
      expect(decision.priorCount).toBe(SUBMISSION_RETRY_LIMIT);
    }
  });

  it("blocks when prior submissions exceed the retry limit", () => {
    const priors = submissions(
      minutesAgo(120),
      minutesAgo(90),
      minutesAgo(60),
      minutesAgo(30),
    );
    const decision = evaluateRetryGuard(priors, NOW);
    expect(decision.outcome).toBe("retry_limit_exceeded");
    if (decision.outcome === "retry_limit_exceeded") {
      expect(decision.priorCount).toBe(4);
    }
  });

  it("retry-limit check takes precedence over cooldown", () => {
    // 3 priors, most recent was 5s ago — limit exceeded wins over cooldown.
    const priors = submissions(
      minutesAgo(60),
      minutesAgo(30),
      secondsAgo(5),
    );
    const decision = evaluateRetryGuard(priors, NOW);
    expect(decision.outcome).toBe("retry_limit_exceeded");
  });

  it("throws cooldown when last submission is within 60s", () => {
    const lastSubmittedAt = secondsAgo(30); // 30s ago — inside window
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(10), lastSubmittedAt),
      NOW,
    );
    expect(decision.outcome).toBe("cooldown");
    if (decision.outcome === "cooldown") {
      expect(decision.priorCount).toBe(2);
      expect(decision.msSinceLast).toBe(30_000);
      expect(decision.lastSubmittedAt.getTime()).toBe(lastSubmittedAt.getTime());
    }
  });

  it("throws cooldown even when the most-recent prior is not first in the array", () => {
    // Array ordered oldest-first; the helper must still pick the newest.
    const recent = secondsAgo(10);
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(45), recent, minutesAgo(20)),
      NOW,
    );
    // 3 priors → retry limit wins. Reduce to 2 so cooldown can surface.
    expect(decision.outcome).toBe("retry_limit_exceeded");

    const decision2 = evaluateRetryGuard(
      submissions(minutesAgo(45), recent),
      NOW,
    );
    expect(decision2.outcome).toBe("cooldown");
    if (decision2.outcome === "cooldown") {
      expect(decision2.msSinceLast).toBe(10_000);
    }
  });

  it("allows submission exactly at the cooldown boundary", () => {
    // msSinceLast === SUBMISSION_COOLDOWN_MS → NOT < cooldown → allow.
    const decision = evaluateRetryGuard(
      submissions(msAgo(SUBMISSION_COOLDOWN_MS)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
  });

  it("allows submission just past the cooldown window", () => {
    const decision = evaluateRetryGuard(
      submissions(msAgo(SUBMISSION_COOLDOWN_MS + 1_000)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(1);
    }
  });

  it("blocks cooldown just under the 60s window", () => {
    const decision = evaluateRetryGuard(
      submissions(msAgo(SUBMISSION_COOLDOWN_MS - 1)),
      NOW,
    );
    expect(decision.outcome).toBe("cooldown");
  });

  it("reports the correct attemptNumber on allow", () => {
    // 2 priors outside cooldown → next attempt is attempt #2 (0-indexed).
    const decision = evaluateRetryGuard(
      submissions(minutesAgo(60), minutesAgo(30)),
      NOW,
    );
    expect(decision.outcome).toBe("allow");
    if (decision.outcome === "allow") {
      expect(decision.attemptNumber).toBe(2);
    }
  });
});

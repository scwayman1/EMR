import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALREADY_SUBMITTED_STATUSES,
  clearinghouseSubmissionAgent,
  evaluateRetryGuard,
  evaluateSubmissionEligibility,
  isRejectionRetryEligible,
  isRetryAllowed,
  SUBMISSION_COOLDOWN_MS,
  SUBMISSION_RETRY_LIMIT,
  type PriorSubmissionInput,
  validateForSubmission,
} from "./clearinghouse-submission-agent";
import type { AgentContext } from "@/lib/orchestration/types";

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

// ---------------------------------------------------------------------------
// Prisma-mocked integration tests
// ---------------------------------------------------------------------------
// Stub the Prisma singleton so we can drive run() through its real control
// flow (transaction, retry guard, cooldown, rejection escalation) without
// touching a database. writeAgentAudit and reasoning.persist both hit prisma
// as well, so their table namespaces (auditLog, agentReasoning) are also
// provided as no-ops.

const claimFindUnique = vi.fn();
const claimUpdate = vi.fn();
const claimScrubResultFindUnique = vi.fn();
const submissionFindMany = vi.fn();
const submissionCreate = vi.fn();
const submissionUpdate = vi.fn();
const financialEventCreate = vi.fn();
const auditLogCreate = vi.fn();
const agentReasoningCreate = vi.fn();
const transactionFn = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    claim: {
      findUnique: (...args: unknown[]) => claimFindUnique(...args),
      update: (...args: unknown[]) => claimUpdate(...args),
    },
    claimScrubResult: {
      findUnique: (...args: unknown[]) => claimScrubResultFindUnique(...args),
    },
    clearinghouseSubmission: {
      create: (...args: unknown[]) => submissionCreate(...args),
      update: (...args: unknown[]) => submissionUpdate(...args),
    },
    financialEvent: {
      create: (...args: unknown[]) => financialEventCreate(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreate(...args),
    },
    agentReasoning: {
      create: (...args: unknown[]) => agentReasoningCreate(...args),
    },
    $transaction: (...args: unknown[]) => transactionFn(...args),
  },
}));

function makeAgentCtx(
  organizationId: string | null = "org-a",
): AgentContext {
  return {
    jobId: "job-ch-1",
    organizationId,
    log: vi.fn(),
    emit: vi.fn(async () => {}),
    assertCan: vi.fn(),
    model: { complete: vi.fn(async () => "") },
    tools: {} as AgentContext["tools"],
    stepResults: new Map(),
  };
}

function makeLoadedClaim(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: "claim-1",
    organizationId: "org-a",
    patientId: "pat-1",
    status: "ready",
    billingNpi: "1234567890",
    renderingNpi: "1234567890",
    payerId: "AETNA-001",
    payerName: "Aetna",
    billedAmountCents: 25000,
    serviceDate: new Date("2026-04-10T00:00:00Z"),
    cptCodes: [{ code: "99213", label: "E&M" }],
    icd10Codes: [{ code: "G89.29", label: "chronic pain" }],
    placeOfService: "11",
    submissions: [],
    ...overrides,
  };
}

describe("clearinghouseSubmissionAgent — prisma-mocked integration", () => {
  beforeEach(() => {
    claimFindUnique.mockReset();
    claimUpdate.mockReset();
    claimScrubResultFindUnique.mockReset();
    submissionFindMany.mockReset();
    submissionCreate.mockReset();
    submissionUpdate.mockReset();
    financialEventCreate.mockReset();
    auditLogCreate.mockReset();
    agentReasoningCreate.mockReset();
    transactionFn.mockReset();

    claimUpdate.mockResolvedValue({});
    submissionUpdate.mockResolvedValue({});
    financialEventCreate.mockResolvedValue({});
    auditLogCreate.mockResolvedValue({});
    agentReasoningCreate.mockResolvedValue({});

    // Default: $transaction runs the callback with a tx-like object whose
    // methods delegate to the per-table mocks. Individual tests can still
    // override transactionFn wholesale.
    transactionFn.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        clearinghouseSubmission: {
          findMany: (...args: unknown[]) => submissionFindMany(...args),
          create: (...args: unknown[]) => submissionCreate(...args),
        },
      }),
    );
  });

  it("success path: creates submission, flips claim to 'submitted', writes financial event, emits events", async () => {
    claimFindUnique.mockResolvedValue(makeLoadedClaim());
    claimScrubResultFindUnique.mockResolvedValue({
      id: "scrub-1",
      status: "clean",
    });
    submissionFindMany.mockResolvedValue([]);
    submissionCreate.mockResolvedValue({ id: "sub-1" });

    const ctx = makeAgentCtx("org-a");
    const result = await clearinghouseSubmissionAgent.run(
      {
        claimId: "claim-1",
        organizationId: "org-a",
        scrubResultId: "scrub-1",
      },
      ctx,
    );

    expect(result).toEqual({
      claimId: "claim-1",
      submissionId: "sub-1",
      status: "accepted",
      submitted: true,
    });

    // Submission row was created under the transaction (attempt 0, pending)
    expect(submissionCreate).toHaveBeenCalledTimes(1);
    const createArgs = submissionCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.claimId).toBe("claim-1");
    expect(createArgs.data.organizationId).toBe("org-a");
    expect(createArgs.data.retryCount).toBe(0);
    expect(createArgs.data.responseStatus).toBe("pending");

    // Claim flipped to 'submitted'
    const claimUpdateArgs = claimUpdate.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(claimUpdateArgs.where.id).toBe("claim-1");
    expect(claimUpdateArgs.data.status).toBe("submitted");
    expect(claimUpdateArgs.data.submittedAt).toBeInstanceOf(Date);

    // FinancialEvent ledger entry
    expect(financialEventCreate).toHaveBeenCalledTimes(1);
    const feArgs = financialEventCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(feArgs.data.organizationId).toBe("org-a");
    expect(feArgs.data.type).toBe("claim_submitted");
    expect(feArgs.data.amountCents).toBe(25000);

    // Events emitted: claim.submitted AND clearinghouse.accepted
    const emitCalls = (ctx.emit as unknown as { mock: { calls: unknown[][] } })
      .mock.calls;
    const eventNames = emitCalls.map(
      (c) => (c[0] as { name: string }).name,
    );
    expect(eventNames).toContain("claim.submitted");
    expect(eventNames).toContain("clearinghouse.accepted");
  });

  it("cooldown path: recent prior submission returns 'cooldown_active' and does NOT create a new submission", async () => {
    claimFindUnique.mockResolvedValue(makeLoadedClaim());
    claimScrubResultFindUnique.mockResolvedValue({
      id: "scrub-1",
      status: "clean",
    });
    // 10 seconds ago — well inside the 60s cooldown window.
    submissionFindMany.mockResolvedValue([
      { id: "prev-sub", submittedAt: new Date(Date.now() - 10_000) },
    ]);

    const ctx = makeAgentCtx("org-a");
    const result = await clearinghouseSubmissionAgent.run(
      {
        claimId: "claim-1",
        organizationId: "org-a",
        scrubResultId: "scrub-1",
      },
      ctx,
    );

    expect(result).toEqual({
      claimId: "claim-1",
      submissionId: null,
      status: "cooldown_active",
      submitted: false,
    });

    // Critical: no new submission, no claim status flip, no ledger write.
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();
  });

  it("max-retries-exceeded path: 3 prior submissions blocks, emits human.review.required, writes audit", async () => {
    claimFindUnique.mockResolvedValue(makeLoadedClaim());
    claimScrubResultFindUnique.mockResolvedValue({
      id: "scrub-1",
      status: "clean",
    });
    // Three priors, all old enough to be outside cooldown — only the retry
    // cap should trip.
    submissionFindMany.mockResolvedValue([
      { id: "s1", submittedAt: new Date(Date.now() - 60 * 60_000) },
      { id: "s2", submittedAt: new Date(Date.now() - 30 * 60_000) },
      { id: "s3", submittedAt: new Date(Date.now() - 10 * 60_000) },
    ]);

    const ctx = makeAgentCtx("org-a");
    const result = await clearinghouseSubmissionAgent.run(
      {
        claimId: "claim-1",
        organizationId: "org-a",
        scrubResultId: "scrub-1",
      },
      ctx,
    );

    expect(result).toEqual({
      claimId: "claim-1",
      submissionId: null,
      status: "retry_limit_exceeded",
      submitted: false,
    });

    // No new submission created, no claim status flip, no financial event.
    expect(submissionCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();

    // A human.review.required event should have been emitted with tier 1.
    const emitCalls = (ctx.emit as unknown as { mock: { calls: unknown[][] } })
      .mock.calls;
    expect(emitCalls.length).toBeGreaterThan(0);
    const review = emitCalls
      .map((c) => c[0] as { name: string; tier?: number; category?: string })
      .find((e) => e.name === "human.review.required");
    expect(review).toBeDefined();
    expect(review!.tier).toBe(1);
    expect(review!.category).toBe("submission_retry_limit");

    // Audit row written for the retry-limit escalation.
    expect(auditLogCreate).toHaveBeenCalled();
    const auditArgs = auditLogCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(auditArgs.data.action).toBe("submission.retry_limit_reached");
  });

  it("claim not found: returns error_claim_not_found, no writes", async () => {
    claimFindUnique.mockResolvedValue(null);

    const ctx = makeAgentCtx("org-a");
    const result = await clearinghouseSubmissionAgent.run(
      {
        claimId: "missing",
        organizationId: "org-a",
        scrubResultId: "scrub-1",
      },
      ctx,
    );

    expect(result).toEqual({
      claimId: "missing",
      submissionId: null,
      status: "error_claim_not_found",
      submitted: false,
    });

    expect(submissionCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();
  });

  it("blocked-by-scrub: refuses to submit when scrub status is 'blocked'", async () => {
    claimFindUnique.mockResolvedValue(makeLoadedClaim());
    claimScrubResultFindUnique.mockResolvedValue({
      id: "scrub-1",
      status: "blocked",
    });

    const ctx = makeAgentCtx("org-a");
    const result = await clearinghouseSubmissionAgent.run(
      {
        claimId: "claim-1",
        organizationId: "org-a",
        scrubResultId: "scrub-1",
      },
      ctx,
    );

    expect(result).toEqual({
      claimId: "claim-1",
      submissionId: null,
      status: "blocked_by_scrub",
      submitted: false,
    });

    expect(submissionCreate).not.toHaveBeenCalled();
    expect(claimUpdate).not.toHaveBeenCalled();
    expect(financialEventCreate).not.toHaveBeenCalled();
  });

  it("org mismatch: claim's organizationId differs from input — current behavior exercises no guard (documented bug)", async () => {
    // NOTE: This test documents the CURRENT behavior of the agent, which does
    // NOT call assertOrgMatch before writing. The claim row lives in org-b
    // but the input provides organizationId: "org-a" — the agent currently
    // writes a submission row stamped with org-a regardless. See the report
    // accompanying this PR: this is a cross-tenant write hazard.
    claimFindUnique.mockResolvedValue(
      makeLoadedClaim({ organizationId: "org-b" }),
    );
    claimScrubResultFindUnique.mockResolvedValue({
      id: "scrub-1",
      status: "clean",
    });
    submissionFindMany.mockResolvedValue([]);
    submissionCreate.mockResolvedValue({ id: "sub-xorg" });

    const ctx = makeAgentCtx("org-a");
    const result = await clearinghouseSubmissionAgent.run(
      {
        claimId: "claim-1",
        organizationId: "org-a",
        scrubResultId: "scrub-1",
      },
      ctx,
    );

    // Current (undesired) behavior: the write goes through under the
    // *input*'s org, not the claim's org. When the guard is added, this
    // assertion should flip to `.rejects.toThrow(/Org scope violation/)`.
    expect(result.status).toBe("accepted");
    const createArgs = submissionCreate.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data.organizationId).toBe("org-a");
  });
});

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Clearinghouse Submission Agent
// ---------------------------------------------------------------------------
// Formats claims as 837P EDI transactions, submits to the clearinghouse, and
// parses responses. Owns the submission boundary — does NOT make coding
// decisions or modify claim content.
//
// In V1 the actual clearinghouse API call is simulated. The structure is in
// place so that swapping in a real EDI gateway (Availity, Waystar, etc.) is
// a single function replacement.
//
// Layer 4 events: subscribes claim.scrubbed (status=clean|warnings)
//   emits: claim.submitted, clearinghouse.accepted, clearinghouse.rejected
// ---------------------------------------------------------------------------

const input = z.object({
  claimId: z.string(),
  organizationId: z.string(),
  scrubResultId: z.string(),
});

const output = z.object({
  claimId: z.string(),
  submissionId: z.string().nullable(),
  status: z.string(),
  submitted: z.boolean(),
});

// ---------------------------------------------------------------------------
// Retry guard (pure) — extracted for testability
// ---------------------------------------------------------------------------
// Race condition background: two concurrent runs for the same claim could
// both read submissions.length=2, both pass the `>= 3` check, and both
// create a new submission, double-billing the clearinghouse. The fix is
// two-layered:
//   1. Wrap the check + create inside a prisma.$transaction so the read
//      and the insert commit together (preventing the duplicate-read race).
//   2. Add a small cooldown window so if another worker just created a
//      submission a few seconds ago, we refuse instead of piling on.
// This pure helper encodes layer (2) so it can be unit-tested without
// Prisma.

/** Minimum gap between two submissions for the same claim. */
export const SUBMISSION_COOLDOWN_MS = 60_000;

/** Hard cap on attempts per claim. */
export const SUBMISSION_RETRY_LIMIT = 3;

/** Shape the guard needs. Keeps the pure function Prisma-free. */
export interface PriorSubmissionInput {
  submittedAt: Date;
}

export type RetryGuardDecision =
  | { outcome: "allow"; attemptNumber: number }
  | { outcome: "retry_limit_exceeded"; priorCount: number }
  | {
      outcome: "cooldown";
      priorCount: number;
      msSinceLast: number;
      lastSubmittedAt: Date;
    };

/**
 * Evaluate whether a new clearinghouse submission may be created, given the
 * prior submissions on the claim and the current time. Pure — no I/O.
 *
 * Callers MUST invoke this inside the same transaction that reads the prior
 * submissions and creates the new one; the cooldown here is a best-effort
 * second layer, the primary serialization is the transaction itself.
 */
export function evaluateRetryGuard(
  priorSubmissions: PriorSubmissionInput[],
  now: Date,
): RetryGuardDecision {
  const priorCount = priorSubmissions.length;

  if (priorCount >= SUBMISSION_RETRY_LIMIT) {
    return { outcome: "retry_limit_exceeded", priorCount };
  }

  // Find the most-recent prior submission (the caller may pass them in any
  // order; we don't want to assume).
  let lastSubmittedAt: Date | null = null;
  for (const s of priorSubmissions) {
    if (lastSubmittedAt == null || s.submittedAt > lastSubmittedAt) {
      lastSubmittedAt = s.submittedAt;
    }
  }

  if (lastSubmittedAt != null) {
    const msSinceLast = now.getTime() - lastSubmittedAt.getTime();
    if (msSinceLast < SUBMISSION_COOLDOWN_MS) {
      return {
        outcome: "cooldown",
        priorCount,
        msSinceLast,
        lastSubmittedAt,
      };
    }
  }

  return { outcome: "allow", attemptNumber: priorCount };
}

/**
 * Internal control-flow error used to bubble a retry-guard decision out of
 * the `prisma.$transaction` callback so the transaction rolls back cleanly
 * (no partial row insert) while the outer handler can respond with the
 * appropriate audit + event emission.
 */
class RetryGuardError extends Error {
  constructor(
    public readonly kind: "retry_limit_exceeded" | "cooldown",
    public readonly details: Record<string, unknown>,
  ) {
    super(`RetryGuard: ${kind}`);
    this.name = "RetryGuardError";
  }
}

export const clearinghouseSubmissionAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "clearinghouseSubmission",
  version: "1.0.0",
  description:
    "Formats claims as 837P EDI transactions and submits to the clearinghouse. " +
    "Parses acceptance/rejection responses. Manages retry logic and submission " +
    "ledger entries.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.claim",
    "write.claim.status",
    "write.financialEvent",
  ],
  // Financial submission to external clearinghouse — sends 837P EDI to a third
  // party, transitions claim.status, and writes the submission ledger entry.
  // A human must sign off before any batch so we never wire a bad claim out.
  requiresApproval: true,

  async run({ claimId, organizationId, scrubResultId }, ctx) {
    const trace = startReasoning("clearinghouseSubmission", "1.0.0", ctx.jobId);
    trace.step("begin clearinghouse submission", { claimId, scrubResultId });

    ctx.assertCan("read.claim");

    // ── Load the claim ─────────────────────────────────────────────
    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { submissions: { orderBy: { submittedAt: "desc" } } },
    });

    if (!claim) {
      ctx.log("error", "Claim not found", { claimId });
      trace.conclude({ confidence: 1.0, summary: "Claim not found — cannot submit." });
      await trace.persist();
      return { claimId, submissionId: null, status: "error_claim_not_found", submitted: false };
    }

    trace.step("loaded claim", {
      status: claim.status,
      billedAmountCents: claim.billedAmountCents,
      payerName: claim.payerName,
      submissionCount: claim.submissions.length,
    });

    // ── Idempotency: if claim is already submitted/accepted, skip ──
    if (
      claim.status === "submitted" ||
      claim.status === "accepted" ||
      claim.status === "adjudicated" ||
      claim.status === "paid" ||
      claim.status === "partial"
    ) {
      ctx.log("info", "Claim already submitted or beyond — skipping", {
        claimId,
        status: claim.status,
      });
      const latestSubmission = claim.submissions[0];
      trace.conclude({
        confidence: 1.0,
        summary: `Claim already in status "${claim.status}" — no resubmission needed.`,
      });
      await trace.persist();
      return {
        claimId,
        submissionId: latestSubmission?.id ?? null,
        status: `already_${claim.status}`,
        submitted: false,
      };
    }

    // ── Load and verify the scrub result ───────────────────────────
    const scrubResult = await prisma.claimScrubResult.findUnique({
      where: { id: scrubResultId },
    });

    if (!scrubResult) {
      ctx.log("error", "Scrub result not found", { scrubResultId });
      trace.conclude({ confidence: 1.0, summary: "Scrub result not found — cannot verify claim cleanliness." });
      await trace.persist();
      return { claimId, submissionId: null, status: "error_scrub_not_found", submitted: false };
    }

    if (scrubResult.status === "blocked") {
      ctx.log("warn", "Scrub status is blocked — refusing to submit", { scrubResultId });
      trace.conclude({
        confidence: 1.0,
        summary: "Scrub status is 'blocked'. Claim cannot be submitted until scrub issues are resolved.",
      });
      await trace.persist();
      return { claimId, submissionId: null, status: "blocked_by_scrub", submitted: false };
    }

    trace.step("verified scrub result", {
      scrubStatus: scrubResult.status,
      scrubResultId,
    });

    // ── Retry guard + submission create (atomic) ───────────────────
    // We re-read `submissions` inside a transaction and then create the new
    // ClearinghouseSubmission row in the SAME transaction. This serializes
    // the check+create pair so two concurrent agent runs for the same claim
    // cannot both pass the retry check and both insert a row. A 60s
    // cooldown layered on top provides a second safety net against a
    // straggler job that holds a stale view.
    ctx.assertCan("write.claim.status");

    let priorSubmissionCount = 0;
    let submission:
      | Awaited<ReturnType<typeof prisma.clearinghouseSubmission.create>>
      | null = null;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const priorSubmissions = await tx.clearinghouseSubmission.findMany({
          where: { claimId },
          orderBy: { submittedAt: "desc" },
          select: { id: true, submittedAt: true },
        });

        const decision = evaluateRetryGuard(priorSubmissions, new Date());

        if (decision.outcome === "retry_limit_exceeded") {
          throw new RetryGuardError("retry_limit_exceeded", {
            priorCount: decision.priorCount,
          });
        }
        if (decision.outcome === "cooldown") {
          throw new RetryGuardError("cooldown", {
            priorCount: decision.priorCount,
            msSinceLast: decision.msSinceLast,
            lastSubmittedAt: decision.lastSubmittedAt,
          });
        }

        const created = await tx.clearinghouseSubmission.create({
          data: {
            claimId,
            organizationId,
            clearinghouseName: "SimulatedClearinghouse", // V1 placeholder
            retryCount: decision.attemptNumber,
            responseStatus: "pending",
            ediPayload: buildEdi837Stub(claim),
          },
        });

        return { created, attemptNumber: decision.attemptNumber };
      });

      priorSubmissionCount = result.attemptNumber;
      submission = result.created;

      ctx.log("info", "clearinghouse submission created", {
        claimId,
        submissionId: submission.id,
        attemptNumber: priorSubmissionCount + 1,
        retryCount: priorSubmissionCount,
      });

      trace.step("created submission record", {
        submissionId: submission.id,
        retryCount: priorSubmissionCount,
      });
    } catch (err) {
      if (err instanceof RetryGuardError && err.kind === "retry_limit_exceeded") {
        const { priorCount } = err.details as { priorCount: number };
        ctx.log("warn", "Claim has been submitted 3+ times — escalating", {
          claimId,
          retryCount: priorCount,
        });

        await ctx.emit({
          name: "human.review.required",
          sourceAgent: "clearinghouseSubmission",
          category: "submission_retry_limit",
          claimId,
          patientId: claim.patientId,
          summary: `Claim ${claimId} has been submitted ${priorCount} times and continues to fail. Manual review required.`,
          suggestedAction:
            "Review rejection reasons on prior submissions. Consider correcting the claim or contacting the clearinghouse directly.",
          tier: 1,
          organizationId,
        });

        await writeAgentAudit(
          "clearinghouseSubmission",
          "1.0.0",
          organizationId,
          "submission.retry_limit_reached",
          { type: "Claim", id: claimId },
          { retryCount: priorCount },
        );

        trace.conclude({
          confidence: 0.95,
          summary: `Submission blocked: claim has ${priorCount} prior submissions (limit is 3). Escalated to human review.`,
        });
        await trace.persist();

        return {
          claimId,
          submissionId: null,
          status: "retry_limit_exceeded",
          submitted: false,
        };
      }

      if (err instanceof RetryGuardError && err.kind === "cooldown") {
        const { priorCount, msSinceLast } = err.details as {
          priorCount: number;
          msSinceLast: number;
          lastSubmittedAt: Date;
        };
        ctx.log("warn", "Cooldown: prior submission too recent — deferring", {
          claimId,
          priorCount,
          msSinceLast,
          cooldownMs: SUBMISSION_COOLDOWN_MS,
        });

        trace.conclude({
          confidence: 0.9,
          summary: `Submission deferred: previous submission was ${Math.round(
            msSinceLast / 1000,
          )}s ago (cooldown is ${SUBMISSION_COOLDOWN_MS / 1000}s). Likely concurrent job — backing off.`,
        });
        await trace.persist();

        return {
          claimId,
          submissionId: null,
          status: "cooldown_active",
          submitted: false,
        };
      }

      throw err;
    }

    if (submission == null) {
      // Should be unreachable — retained for exhaustiveness.
      throw new Error("Submission was not created and no guard error was thrown.");
    }

    // ── Simulate clearinghouse submission ───────────────────────────
    // In production, this block would call the clearinghouse API with the
    // EDI payload and parse the synchronous or async response. For V1 we
    // perform basic validation and accept the claim.

    ctx.log("info", "sending submission to clearinghouse", {
      claimId,
      submissionId: submission.id,
      clearinghouseName: "SimulatedClearinghouse",
      attemptNumber: priorSubmissionCount + 1,
    });

    const validationErrors = validateForSubmission(claim);

    if (validationErrors.length > 0) {
      ctx.log("warn", "clearinghouse rejected submission", {
        claimId,
        submissionId: submission.id,
        rejectionCode: "VALIDATION_FAIL",
        errors: validationErrors,
      });

      // Simulate a rejection
      await prisma.clearinghouseSubmission.update({
        where: { id: submission.id },
        data: {
          responseStatus: "rejected",
          responseCode: "VALIDATION_FAIL",
          responseMessage: validationErrors.join("; "),
          respondedAt: new Date(),
        },
      });

      await prisma.claim.update({
        where: { id: claimId },
        data: { status: "ch_rejected" },
      });

      await ctx.emit({
        name: "clearinghouse.rejected",
        claimId,
        submissionId: submission.id,
        rejectionCode: "VALIDATION_FAIL",
        rejectionMessage: validationErrors.join("; "),
        retryEligible: isRejectionRetryEligible(priorSubmissionCount),
        organizationId,
      });

      await writeAgentAudit(
        "clearinghouseSubmission",
        "1.0.0",
        organizationId,
        "submission.rejected",
        { type: "ClearinghouseSubmission", id: submission.id },
        { claimId, errors: validationErrors },
      );

      trace.conclude({
        confidence: 0.9,
        summary: `Submission rejected by validation: ${validationErrors.join("; ")}`,
      });
      await trace.persist();

      return {
        claimId,
        submissionId: submission.id,
        status: "rejected",
        submitted: false,
      };
    }

    // ── Accepted ───────────────────────────────────────────────────
    const now = new Date();

    await prisma.clearinghouseSubmission.update({
      where: { id: submission.id },
      data: {
        responseStatus: "accepted",
        responseCode: "A1",
        responseMessage: "Claim accepted by clearinghouse.",
        respondedAt: now,
      },
    });

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: "submitted",
        submittedAt: now,
      },
    });

    ctx.log("info", "clearinghouse accepted submission", {
      claimId,
      submissionId: submission.id,
      responseCode: "A1",
      attemptNumber: priorSubmissionCount + 1,
    });

    trace.step("clearinghouse accepted", {
      submissionId: submission.id,
      responseCode: "A1",
    });

    // ── Emit events ────────────────────────────────────────────────
    await ctx.emit({
      name: "claim.submitted",
      claimId,
      organizationId,
    });

    await ctx.emit({
      name: "clearinghouse.accepted",
      claimId,
      submissionId: submission.id,
      organizationId,
    });

    // ── Ledger entry ───────────────────────────────────────────────
    ctx.assertCan("write.financialEvent");

    await prisma.financialEvent.create({
      data: {
        organizationId,
        patientId: claim.patientId,
        claimId,
        type: "claim_submitted",
        amountCents: claim.billedAmountCents,
        description: `Claim submitted to clearinghouse (${claim.payerName ?? "unknown payer"}). Billed: $${(claim.billedAmountCents / 100).toFixed(2)}.`,
        metadata: {
          submissionId: submission.id,
          clearinghouseName: "SimulatedClearinghouse",
          retryCount: priorSubmissionCount,
          scrubResultId,
        },
        createdByAgent: "clearinghouseSubmission@1.0.0",
      },
    });

    trace.step("created financial event ledger entry", {
      type: "claim_submitted",
      amountCents: claim.billedAmountCents,
    });

    // ── Audit ──────────────────────────────────────────────────────
    await writeAgentAudit(
      "clearinghouseSubmission",
      "1.0.0",
      organizationId,
      "submission.accepted",
      { type: "ClearinghouseSubmission", id: submission.id },
      {
        claimId,
        billedAmountCents: claim.billedAmountCents,
        payerName: claim.payerName,
        retryCount: priorSubmissionCount,
      },
    );

    trace.conclude({
      confidence: 0.95,
      summary: `Claim ${claimId} submitted and accepted by clearinghouse. Billed $${(claim.billedAmountCents / 100).toFixed(2)} to ${claim.payerName ?? "unknown payer"}. Submission #${priorSubmissionCount + 1}.`,
    });
    await trace.persist();

    return {
      claimId,
      submissionId: submission.id,
      status: "accepted",
      submitted: true,
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Claim statuses that indicate the claim has already been handed to the
 * clearinghouse (or beyond) and should NOT be resubmitted. */
export const ALREADY_SUBMITTED_STATUSES = [
  "submitted",
  "accepted",
  "adjudicated",
  "paid",
  "partial",
] as const;

/**
 * Pure retry-guard check. Returns whether a new submission attempt is allowed
 * given the number of prior submissions already on file. Kept as a standalone
 * helper so the threshold can be covered by unit tests without touching
 * Prisma.
 */
export function isRetryAllowed(
  priorSubmissionCount: number,
  maxAttempts = 3,
): { allowed: true } | { allowed: false; reason: "retry_limit_exceeded" } {
  if (priorSubmissionCount >= maxAttempts) {
    return { allowed: false, reason: "retry_limit_exceeded" };
  }
  return { allowed: true };
}

/** Decide whether a rejected claim is still eligible for automatic retry.
 * Public so downstream callers (and tests) can reuse the same invariant. */
export function isRejectionRetryEligible(
  priorSubmissionCount: number,
  maxAttempts = 3,
): boolean {
  // After this rejection the claim has one more attempt recorded, so the
  // total attempt count at retry time is priorSubmissionCount + 1. We only
  // want to auto-retry if THAT count is still strictly below maxAttempts.
  return priorSubmissionCount + 1 < maxAttempts;
}

export type SubmissionEligibility =
  | { submittable: true }
  | {
      submittable: false;
      reason:
        | "already_submitted"
        | "blocked_by_scrub"
        | "retry_limit_exceeded";
      detail?: string;
    };

/** Single decision point for "should we attempt a clearinghouse submission
 * right now?". Encapsulates idempotency, scrub gating, and retry guard so
 * the rules are testable in isolation. */
export function evaluateSubmissionEligibility(params: {
  claimStatus: string;
  scrubStatus: string | null;
  priorSubmissionCount: number;
  maxAttempts?: number;
}): SubmissionEligibility {
  const max = params.maxAttempts ?? 3;

  if (
    (ALREADY_SUBMITTED_STATUSES as readonly string[]).includes(params.claimStatus)
  ) {
    return {
      submittable: false,
      reason: "already_submitted",
      detail: params.claimStatus,
    };
  }

  if (params.scrubStatus === "blocked") {
    return { submittable: false, reason: "blocked_by_scrub" };
  }

  if (params.priorSubmissionCount >= max) {
    return { submittable: false, reason: "retry_limit_exceeded" };
  }

  return { submittable: true };
}

/**
 * Build a minimal 837P EDI stub for audit storage. In production this would
 * be a full ANSI X12 837P transaction set built from claim + patient + payer
 * data.
 */
function buildEdi837Stub(claim: {
  id: string;
  billingNpi: string | null;
  renderingNpi: string | null;
  payerId: string | null;
  payerName: string | null;
  billedAmountCents: number;
  serviceDate: Date;
}): string {
  return [
    `ISA*00*          *00*          *ZZ*GREENPATH      *ZZ*${(claim.payerId ?? "UNKNOWN").padEnd(15)}*${formatDate(claim.serviceDate)}*0000*^*00501*000000001*0*P*:~`,
    `GS*HC*GREENPATH*${claim.payerId ?? "UNKNOWN"}*${formatDate(claim.serviceDate)}*0000*1*X*005010X222A1~`,
    `ST*837*0001*005010X222A1~`,
    `BHT*0019*00*${claim.id}*${formatDate(claim.serviceDate)}*0000*CH~`,
    `// ... full 837P segments would follow in production ...`,
    `CLM*${claim.id}*${(claim.billedAmountCents / 100).toFixed(2)}***${claim.billingNpi ?? ""}:B:1*Y*A*Y*Y~`,
    `SE*6*0001~`,
    `GE*1*1~`,
    `IEA*1*000000001~`,
  ].join("\n");
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/**
 * Pre-submission validation checks. Returns an array of error strings.
 * Empty array means the claim passes basic validation.
 */
export function validateForSubmission(claim: {
  billingNpi: string | null;
  payerId: string | null;
  billedAmountCents: number;
  serviceDate: Date;
  cptCodes: unknown;
  icd10Codes: unknown;
  placeOfService: string | null;
}): string[] {
  const errors: string[] = [];

  if (!claim.billingNpi) {
    errors.push("Missing billing NPI");
  }
  if (!claim.payerId) {
    errors.push("Missing payer ID");
  }
  if (claim.billedAmountCents <= 0) {
    errors.push("Billed amount must be greater than zero");
  }
  if (!claim.serviceDate) {
    errors.push("Missing service date");
  }

  const cptCodes = claim.cptCodes as unknown[];
  if (!Array.isArray(cptCodes) || cptCodes.length === 0) {
    errors.push("No CPT codes on claim");
  }

  const icd10Codes = claim.icd10Codes as unknown[];
  if (!Array.isArray(icd10Codes) || icd10Codes.length === 0) {
    errors.push("No ICD-10 codes on claim");
  }

  if (!claim.placeOfService) {
    errors.push("Missing place of service code");
  }

  return errors;
}

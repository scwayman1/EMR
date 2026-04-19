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

    // ── Retry guard: block after 3 prior submissions ───────────────
    const priorSubmissionCount = claim.submissions.length;
    if (priorSubmissionCount >= 3) {
      ctx.log("warn", "Claim has been submitted 3+ times — escalating", {
        claimId,
        retryCount: priorSubmissionCount,
      });

      await ctx.emit({
        name: "human.review.required",
        sourceAgent: "clearinghouseSubmission",
        category: "submission_retry_limit",
        claimId,
        patientId: claim.patientId,
        summary: `Claim ${claimId} has been submitted ${priorSubmissionCount} times and continues to fail. Manual review required.`,
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
        { retryCount: priorSubmissionCount },
      );

      trace.conclude({
        confidence: 0.95,
        summary: `Submission blocked: claim has ${priorSubmissionCount} prior submissions (limit is 3). Escalated to human review.`,
      });
      await trace.persist();

      return {
        claimId,
        submissionId: null,
        status: "retry_limit_exceeded",
        submitted: false,
      };
    }

    // ── Create ClearinghouseSubmission record (pending) ────────────
    ctx.assertCan("write.claim.status");

    const submission = await prisma.clearinghouseSubmission.create({
      data: {
        claimId,
        organizationId,
        clearinghouseName: "SimulatedClearinghouse", // V1 placeholder
        retryCount: priorSubmissionCount,
        responseStatus: "pending",
        ediPayload: buildEdi837Stub(claim),
      },
    });

    trace.step("created submission record", {
      submissionId: submission.id,
      retryCount: priorSubmissionCount,
    });

    // ── Simulate clearinghouse submission ───────────────────────────
    // In production, this block would call the clearinghouse API with the
    // EDI payload and parse the synchronous or async response. For V1 we
    // perform basic validation and accept the claim.

    const validationErrors = validateForSubmission(claim);

    if (validationErrors.length > 0) {
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
        retryEligible: priorSubmissionCount < 2,
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
function validateForSubmission(claim: {
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

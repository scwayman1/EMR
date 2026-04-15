import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { scrubClaim, countBySeverity, isClaimSubmittable } from "@/lib/billing/scrub";

// ---------------------------------------------------------------------------
// Charge Integrity Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #2: "Ensure encounters become clean billable charges."
//
// Wraps the deterministic scrub engine. Runs on claim.created events,
// persists scrub issues to claim.scrubIssues, and either:
//   - Marks the claim as ready for submission (no errors)
//   - Holds the claim for biller review (errors present)
//
// This is a fast, deterministic agent — no LLM. The Claim Scrub Agent
// will later use an LLM to suggest fixes for ambiguous cases.
// ---------------------------------------------------------------------------

const input = z.object({ claimId: z.string() });

const output = z.object({
  claimId: z.string(),
  issueCount: z.number(),
  errorCount: z.number(),
  warningCount: z.number(),
  blockedFromSubmission: z.boolean(),
  scrubbedAt: z.string(),
});

export const chargeIntegrityAgent: Agent<z.infer<typeof input>, z.infer<typeof output>> = {
  name: "chargeIntegrity",
  version: "1.0.0",
  description:
    "Validates new claims against payer + coding rules. Persists scrub issues " +
    "to the claim and either marks it ready or holds it for biller review.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.patient", "write.claim.scrub"],
  requiresApproval: false,

  async run({ claimId }, ctx) {
    ctx.assertCan("read.claim");
    ctx.log("info", "Running charge integrity scrub", { claimId });

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        patient: {
          include: {
            coverages: { where: { type: "primary", active: true }, take: 1 },
          },
        },
      },
    });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const coverage = claim.patient.coverages[0];

    const issues = scrubClaim({
      cptCodes: claim.cptCodes as any,
      icd10Codes: claim.icd10Codes as any,
      payerName: claim.payerName,
      serviceDate: claim.serviceDate,
      providerId: claim.providerId,
      patientCoverage: coverage
        ? {
            eligibilityStatus: coverage.eligibilityStatus,
            payerName: coverage.payerName,
          }
        : null,
    });

    const counts = countBySeverity(issues);
    const submittable = isClaimSubmittable(issues);

    ctx.assertCan("write.claim.scrub");

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        scrubIssues: issues as any,
        scrubbedAt: new Date(),
      },
    });

    // Write a financial event for the audit trail
    await prisma.financialEvent.create({
      data: {
        organizationId: claim.organizationId,
        patientId: claim.patientId,
        claimId: claim.id,
        type: "charge_created",
        amountCents: 0,
        description: submittable
          ? `Claim scrub passed (${counts.warning} warnings)`
          : `Claim held — ${counts.error} blocking errors`,
        metadata: {
          ruleCodes: issues.map((i) => i.ruleCode),
          severityCounts: counts,
        },
        createdByAgent: "chargeIntegrity:1.0.0",
      },
    });

    ctx.log("info", "Scrub complete", {
      claimId,
      issueCount: issues.length,
      errors: counts.error,
      warnings: counts.warning,
      submittable,
    });

    return {
      claimId,
      issueCount: issues.length,
      errorCount: counts.error,
      warningCount: counts.warning,
      blockedFromSubmission: !submittable,
      scrubbedAt: new Date().toISOString(),
    };
  },
};

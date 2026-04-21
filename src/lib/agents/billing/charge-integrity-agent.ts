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
  // Writes Claim.scrubIssues and gates whether a claim is submittable.
  // A wrong scrub verdict either blocks clean revenue or releases a bad claim
  // to the clearinghouse — human review is required before those verdicts
  // stick.
  requiresApproval: true,

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

    // Cannabis-specific supplemental scrub. The base scrubClaim is general
    // payer-rules; this layer catches the patterns a seasoned cannabis
    // biller has memorized. Emit warnings (not errors) — clinician override
    // at claim time wins, but the biller sees what's coming before submit.
    const icd10List = Array.isArray(claim.icd10Codes)
      ? (claim.icd10Codes as any[]).map((c) => (typeof c === "string" ? c : c?.code)).filter((c): c is string => typeof c === "string")
      : [];
    const cptList = Array.isArray(claim.cptCodes)
      ? (claim.cptCodes as any[]).map((c) => (typeof c === "string" ? c : c?.code)).filter((c): c is string => typeof c === "string")
      : [];

    const cannabisIssues: Array<{
      ruleCode: string;
      severity: "error" | "warning";
      message: string;
      payerGuidance?: string;
    }> = [];

    const hasF12 = icd10List.some((c) => c.startsWith("F12"));
    const hasF12Unspecified = icd10List.includes("F12.10") || icd10List.includes("F12.90");
    const hasZ71 = icd10List.some((c) => c.startsWith("Z71"));
    const hasMod25OnEm = cptList.some((c) => /^992\d\d/.test(c));
    const payerName = claim.payerName?.toLowerCase() ?? "";
    const isCommercial = /aetna|united|cigna|blue|humana|anthem|kaiser/.test(payerName);

    if (hasF12Unspecified) {
      cannabisIssues.push({
        ruleCode: "cannabis.f12.specificity",
        severity: "warning",
        message: "Cannabis use disorder coded as unspecified severity (F12.10/F12.90).",
        payerGuidance:
          "Review note: if documentation supports moderate/severe CUD (2+ DSM-5 criteria + functional impact), upgrade to F12.20. Higher specificity reduces downstream medical-necessity denials.",
      });
    }
    if (hasZ71 && hasMod25OnEm && isCommercial) {
      cannabisIssues.push({
        ruleCode: "cannabis.z71.modifier25",
        severity: "warning",
        message: `${claim.payerName} historically bundles Z71 cannabis counseling into E/M despite modifier 25.`,
        payerGuidance:
          "Confirm clinician documentation supports separate, significant counseling time. If not, drop the Z71 line and bill E/M only. If documented, expect a possible CO-97 denial; pre-build the appeal packet.",
      });
    }
    if (hasF12 && !coverage) {
      cannabisIssues.push({
        ruleCode: "cannabis.f12.no-coverage",
        severity: "warning",
        message: "F12.x coded but patient has no active primary coverage on file.",
        payerGuidance:
          "F12.x claims without coverage are near-certain self-pay. Route to patient-collections workflow and generate a plain-language estimate now.",
      });
    }
    if (hasF12 && isCommercial) {
      cannabisIssues.push({
        ruleCode: "cannabis.f12.commercial-coverage-risk",
        severity: "warning",
        message: `Commercial payer (${claim.payerName}) — cannabis-related F12.x claims carry elevated denial risk.`,
        payerGuidance:
          "Check BillingMemory for this payer's historical pass rate on F12 claims. If <70%, attach the comprehensive psychiatric evaluation + cannabis protocol documentation proactively.",
      });
    }

    const allIssues = [...issues, ...cannabisIssues];
    const counts = countBySeverity(allIssues);
    const submittable = isClaimSubmittable(allIssues);

    ctx.assertCan("write.claim.scrub");

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        scrubIssues: allIssues as any,
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
          ? `Claim scrub passed (${counts.warning} warnings${cannabisIssues.length > 0 ? `, ${cannabisIssues.length} cannabis-specific` : ""})`
          : `Claim held — ${counts.error} blocking errors`,
        metadata: {
          ruleCodes: allIssues.map((i) => i.ruleCode),
          severityCounts: counts,
          cannabisRuleCodes: cannabisIssues.map((i) => i.ruleCode),
        },
        createdByAgent: "chargeIntegrity:1.0.0",
      },
    });

    ctx.log("info", "Scrub complete", {
      claimId,
      issueCount: allIssues.length,
      errors: counts.error,
      warnings: counts.warning,
      cannabisIssueCount: cannabisIssues.length,
      submittable,
    });

    return {
      claimId,
      issueCount: allIssues.length,
      errorCount: counts.error,
      warningCount: counts.warning,
      blockedFromSubmission: !submittable,
      scrubbedAt: new Date().toISOString(),
    };
  },
};

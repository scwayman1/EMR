import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import {
  scrubClaim,
  countBySeverity,
  isClaimSubmittable,
  type ScrubIssue,
} from "@/lib/billing/scrub";

// ---------------------------------------------------------------------------
// Cannabis-aware supplemental scrub rules
// ---------------------------------------------------------------------------
// scrubClaim() in src/lib/billing/scrub.ts handles generic payer + coding
// rules. These four rules layer cannabis-specific scrubs on top so the
// biller sees the coverage reality alongside the coding reality. Each
// warning carries a concrete payerGuidance action.

const COMMERCIAL_PAYERS = [
  "aetna",
  "united",
  "uhc",
  "cigna",
  "bcbs",
  "blue cross",
  "blue shield",
  "humana",
  "anthem",
  "kaiser",
];

function isCommercial(payerName: string | null): boolean {
  if (!payerName) return false;
  const name = payerName.toLowerCase();
  return COMMERCIAL_PAYERS.some((k) => name.includes(k));
}

interface CannabisScrubInput {
  cptCodes: string[];
  icd10Codes: string[];
  payerName: string | null;
  hasActiveCoverage: boolean;
}

export function scrubCannabisRules(input: CannabisScrubInput): ScrubIssue[] {
  const issues: ScrubIssue[] = [];
  const hasF12 = input.icd10Codes.some((c) => c.startsWith("F12"));
  const hasZ71 = input.icd10Codes.some((c) => c.startsWith("Z71"));
  const hasEM = input.cptCodes.some((c) => c.startsWith("992"));
  const commercial = isCommercial(input.payerName);

  // Rule 1: F12.10 / F12.90 specificity — both mean "unspecified" and
  // often get denied for under-specificity. Recommend upgrading to a
  // severity-coded F12.2x / F12.9x when documentation supports it.
  const lowSpec = input.icd10Codes.filter(
    (c) => c === "F12.10" || c === "F12.90",
  );
  if (lowSpec.length > 0) {
    issues.push({
      ruleCode: "CANNABIS_F12_SPECIFICITY",
      severity: "warning",
      message: `Unspecified cannabis-use code on claim (${lowSpec.join(", ")}). Many commercial payers deny F12.10/F12.90 for under-specificity.`,
      suggestion:
        "Review documentation for DSM-5 severity criteria. If mild/moderate/severe can be supported, upgrade to F12.2x (dependence) or F12.1x with severity subcode.",
      relatedCode: lowSpec[0],
      blocksSubmission: false,
    });
  }

  // Rule 2: Z71 + E/M + commercial payer + no modifier 25 — common
  // cause of CO-97 bundling denials.
  if (hasZ71 && hasEM && commercial) {
    issues.push({
      ruleCode: "CANNABIS_Z71_MODIFIER25",
      severity: "warning",
      message: `Z71 counseling code billed with E/M on a commercial payer (${input.payerName}). These lines routinely deny as bundled without modifier 25.`,
      suggestion:
        "Verify the E/M line carries modifier 25 AND that documentation clearly shows a separately-identifiable service beyond the counseling. If the payer's policy bars mod-25 on Z71, drop the Z71 line and document counseling time inside the E/M.",
      relatedCode: "Z71.89",
      blocksSubmission: false,
    });
  }

  // Rule 3: F12 + no active coverage — the claim will be denied outright.
  // Route to self-pay before submission to avoid burning timely filing.
  if (hasF12 && !input.hasActiveCoverage) {
    issues.push({
      ruleCode: "CANNABIS_F12_NO_COVERAGE",
      severity: "error",
      message:
        "F12 diagnosis on a claim with no active coverage. This will be denied outright; submitting burns the timely-filing window.",
      suggestion:
        "Hold this claim. Route the encounter to self-pay using the practice's published rate and issue a written ABN for the next visit.",
      relatedCode: "F12",
      blocksSubmission: true,
    });
  }

  // Rule 4: F12 + commercial payer — high denial risk even with
  // coverage. Warn the biller to confirm the payer's cannabis coverage
  // policy before submission.
  if (hasF12 && commercial && input.hasActiveCoverage) {
    issues.push({
      ruleCode: "CANNABIS_F12_COMMERCIAL_RISK",
      severity: "warning",
      message: `F12 diagnosis on a commercial payer (${input.payerName}). Commercial cannabis coverage is inconsistent — denials for medical necessity or benefit exclusion are common.`,
      suggestion:
        "Pull this payer's cannabis / SUD coverage policy by number before submission. If excluded, convert to self-pay. If covered, pre-load DSM-5 severity + prior-treatment failure documentation so an appeal packet is one-click if denied.",
      relatedCode: "F12",
      blocksSubmission: false,
    });
  }

  return issues;
}

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

    // Cannabis-aware supplemental scrub. Normalizes the Json-typed code
    // arrays down to plain strings before feeding them in.
    const cptStrings: string[] = Array.isArray(claim.cptCodes)
      ? (claim.cptCodes as any[])
          .map((c) => (typeof c === "string" ? c : c?.code))
          .filter((c): c is string => typeof c === "string")
      : [];
    const icd10Strings: string[] = Array.isArray(claim.icd10Codes)
      ? (claim.icd10Codes as any[])
          .map((c) => (typeof c === "string" ? c : c?.code))
          .filter((c): c is string => typeof c === "string")
      : [];
    const hasActiveCoverage =
      !!coverage && coverage.eligibilityStatus === "active";
    const cannabisIssues = scrubCannabisRules({
      cptCodes: cptStrings,
      icd10Codes: icd10Strings,
      payerName: claim.payerName,
      hasActiveCoverage,
    });
    issues.push(...cannabisIssues);

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

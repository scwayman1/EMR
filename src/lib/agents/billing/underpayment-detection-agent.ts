import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { formatMoney } from "@/lib/domain/billing";

// ---------------------------------------------------------------------------
// Underpayment Detection Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #11: "Spot payer underpayments. Compare adjudicated payment
// to expected contract logic where available. Flag underpayment candidates.
// Route for review or appeal."
//
// Phase 1 implementation: compares the actual paid + adjustment vs the
// org's fee schedule expectation. Without full contract modeling, we use
// the fee schedule as the "expected" baseline and flag anything where
// the allowed amount is significantly below it.
// ---------------------------------------------------------------------------

const input = z.object({ organizationId: z.string() });

const output = z.object({
  organizationId: z.string(),
  claimsChecked: z.number(),
  underpaymentsFound: z.number(),
  totalUnderpaymentCents: z.number(),
  candidates: z.array(
    z.object({
      claimId: z.string(),
      cptCode: z.string(),
      expectedCents: z.number(),
      allowedCents: z.number(),
      varianceCents: z.number(),
      payerName: z.string().nullable(),
    }),
  ),
});

// What % below expected counts as a flag
const UNDERPAYMENT_THRESHOLD = 0.85;

export const underpaymentDetectionAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "underpaymentDetection",
  version: "1.0.0",
  description:
    "Compares adjudicated allowed amounts against the practice fee schedule. " +
    "Flags claims where the payer paid significantly less than expected.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "write.task"],
  // Asserts that a payer underpaid and drives recovery actions (appeal,
  // rebill, contract-dispute). False positives damage payer relationships
  // and waste biller cycles; false negatives lose revenue. Every batch of
  // underpayment claims must be human-reviewed before follow-up fires.
  requiresApproval: true,

  async run({ organizationId }, ctx) {
    ctx.assertCan("read.claim");

    // Pull paid + partial claims
    const claims = await prisma.claim.findMany({
      where: {
        organizationId,
        status: { in: ["paid", "partial"] },
        allowedAmountCents: { not: null },
      },
    });

    // Pull fee schedule for comparison
    const feeSchedule = await prisma.feeScheduleEntry.findMany({
      where: { organizationId, active: true },
    });
    const feeMap = Object.fromEntries(
      feeSchedule.map((f) => [f.cptCode, f.defaultChargeCents]),
    );

    const candidates: {
      claimId: string;
      cptCode: string;
      expectedCents: number;
      allowedCents: number;
      varianceCents: number;
      payerName: string | null;
    }[] = [];

    let totalUnderpaymentCents = 0;

    for (const claim of claims) {
      const cptCodes = claim.cptCodes as Array<{ code: string; chargeAmount?: number }>;
      const allowed = claim.allowedAmountCents ?? 0;

      // Sum of expected charges across all CPT codes on this claim
      const expected = cptCodes.reduce((acc, c) => {
        const fromFeeSchedule = feeMap[c.code] ?? 0;
        const fromClaim = c.chargeAmount ?? 0;
        return acc + Math.max(fromFeeSchedule, fromClaim);
      }, 0);

      if (expected === 0) continue;

      const ratio = allowed / expected;
      if (ratio < UNDERPAYMENT_THRESHOLD) {
        const variance = expected - allowed;
        candidates.push({
          claimId: claim.id,
          cptCode: cptCodes[0]?.code ?? "unknown",
          expectedCents: expected,
          allowedCents: allowed,
          varianceCents: variance,
          payerName: claim.payerName,
        });
        totalUnderpaymentCents += variance;
      }
    }

    // Create review tasks for the biggest underpayments
    const topCandidates = [...candidates]
      .sort((a, b) => b.varianceCents - a.varianceCents)
      .slice(0, 5);

    ctx.assertCan("write.task");
    for (const candidate of topCandidates) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const existing = await prisma.task.findFirst({
        where: {
          createdAt: { gte: sevenDaysAgo },
          title: { contains: "Underpayment review" },
          description: { contains: candidate.claimId },
        },
      });
      if (existing) continue;

      const claim = claims.find((c) => c.id === candidate.claimId);
      if (!claim) continue;

      await prisma.task.create({
        data: {
          organizationId,
          patientId: claim.patientId,
          title: `Underpayment review: ${candidate.payerName ?? "payer"} (${formatMoney(candidate.varianceCents)} variance)`,
          description: `Claim ${candidate.claimId.slice(0, 8)} (${candidate.cptCode}) was paid below expectation.\n\nExpected: ${formatMoney(candidate.expectedCents)}\nAllowed: ${formatMoney(candidate.allowedCents)}\nVariance: ${formatMoney(candidate.varianceCents)}\n\nReview the contract and consider an appeal if the payer's allowed amount is below your contracted rate.\n\n[Created by underpaymentDetection agent]`,
          status: "open",
          assigneeRole: "operator",
          dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      });
    }

    ctx.log("info", "Underpayment detection complete", {
      claimsChecked: claims.length,
      candidates: candidates.length,
      totalVariance: totalUnderpaymentCents,
    });

    return {
      organizationId,
      claimsChecked: claims.length,
      underpaymentsFound: candidates.length,
      totalUnderpaymentCents,
      candidates,
    };
  },
};

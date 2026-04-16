import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Billing Reconciliation Enhancement Agent
// ---------------------------------------------------------------------------
// Reads claims + payments over a date window and identifies claims where the
// payer's allowed amount exceeds what has actually been paid — i.e., the
// payer acknowledged a higher obligation than they remitted. Those are
// candidates for an appeal or a payer follow-up.
// ---------------------------------------------------------------------------

const input = z.object({
  organizationId: z.string(),
  dateRangeDays: z.number().int().positive().max(365),
});

const output = z.object({
  discrepanciesFound: z.number(),
  totalUnderpaidCents: z.number(),
  claimsToAppeal: z.array(z.string()),
});

export const billingReconEnhancementAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "billingReconEnhancement",
  version: "1.0.0",
  description:
    "Scans recent claims/payments and flags claims where the allowed amount " +
    "is greater than the total paid so far — candidates for appeal.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.payment"],
  requiresApproval: false,

  async run({ organizationId, dateRangeDays }, ctx) {
    ctx.assertCan("read.claim");
    ctx.assertCan("read.payment");

    const since = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000);

    const claims = await prisma.claim.findMany({
      where: {
        organizationId,
        serviceDate: { gte: since },
        allowedAmountCents: { not: null },
      },
      include: {
        payments: true,
      },
      orderBy: { serviceDate: "desc" },
    });

    let totalUnderpaidCents = 0;
    const claimsToAppeal: string[] = [];

    for (const claim of claims) {
      const allowed = claim.allowedAmountCents ?? 0;
      const paid = claim.payments.reduce(
        (sum, p) => sum + (p.amountCents ?? 0),
        0
      );

      // A claim is "underpaid" if the payer allowed an amount greater than what
      // has actually been received. We subtract patient responsibility so we
      // only flag true payer underpayments, not outstanding patient balances.
      const patientResp = claim.patientRespCents ?? 0;
      const expectedFromPayer = Math.max(0, allowed - patientResp);
      const variance = expectedFromPayer - paid;

      if (variance > 100) {
        // > $1.00 threshold, avoid float noise
        totalUnderpaidCents += variance;
        claimsToAppeal.push(claim.id);
      }
    }

    await writeAgentAudit(
      "billingReconEnhancement",
      "1.0.0",
      organizationId,
      "reconciliation.enhanced",
      { type: "Organization", id: organizationId },
      {
        claimsChecked: claims.length,
        discrepancies: claimsToAppeal.length,
        totalUnderpaidCents,
      }
    );

    ctx.log("info", "Reconciliation enhancement complete", {
      claimsChecked: claims.length,
      discrepancies: claimsToAppeal.length,
      totalUnderpaidCents,
    });

    return {
      discrepanciesFound: claimsToAppeal.length,
      totalUnderpaidCents,
      claimsToAppeal,
    };
  },
};

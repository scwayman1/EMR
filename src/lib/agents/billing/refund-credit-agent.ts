import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { formatMoney } from "@/lib/domain/billing";

// ---------------------------------------------------------------------------
// Refund / Credit Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #12: "Prevent chaos in credits and refunds. Detect credit
// balances. Recommend transfer, refund, or hold action. Enforce approval
// rules."
//
// This agent walks all patients with potential credit balances and:
//   1. Identifies overpayments (patient paid more than they owed)
//   2. Looks for other open balances on the same patient that the credit
//      could be transferred to
//   3. Creates a Task with the recommended action — transfer, refund, or
//      hold (default: hold pending review)
//
// Refund issuance is approval-gated by policy — this agent only RECOMMENDS,
// never executes refunds automatically.
// ---------------------------------------------------------------------------

const input = z.object({ organizationId: z.string() });

const output = z.object({
  organizationId: z.string(),
  patientsChecked: z.number(),
  creditsFound: z.number(),
  totalCreditCents: z.number(),
  recommendations: z.array(
    z.object({
      patientId: z.string(),
      creditCents: z.number(),
      action: z.enum(["transfer", "refund", "hold"]),
      reason: z.string(),
      taskId: z.string().nullable(),
    }),
  ),
});

export const refundCreditAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "refundCredit",
  version: "1.0.0",
  description:
    "Detects patient credit balances and recommends transfer, refund, " +
    "or hold action. Approval-gated — never auto-issues refunds.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.payment", "write.task"],
  // Drives refund / credit-transfer recommendations. The agent's own
  // description promises it is approval-gated ("never auto-issues refunds") —
  // this flag enforces that contract. Money leaving the practice must have a
  // human signature upstream of the recommendation task.
  requiresApproval: true,

  async run({ organizationId }, ctx) {
    ctx.assertCan("read.claim");
    ctx.log("info", "Running refund/credit detection", { organizationId });

    // Pull all patients in the org with their claims + payments
    const patients = await prisma.patient.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        claims: {
          include: { payments: true },
        },
      },
    });

    const recommendations: {
      patientId: string;
      creditCents: number;
      action: "transfer" | "refund" | "hold";
      reason: string;
      taskId: string | null;
    }[] = [];

    let totalCreditCents = 0;

    for (const patient of patients) {
      // Compute total patient resp vs total patient payments
      const totalRespCents = patient.claims.reduce(
        (acc, c) => acc + c.patientRespCents,
        0,
      );
      const totalPatientPaidCents = patient.claims.reduce(
        (acc, c) =>
          acc +
          c.payments
            .filter((p) => p.source === "patient")
            .reduce((sum, p) => sum + p.amountCents, 0),
        0,
      );

      const creditCents = totalPatientPaidCents - totalRespCents;
      if (creditCents <= 0) continue;

      totalCreditCents += creditCents;

      // Check for OTHER open balances we could transfer the credit to
      const openOtherBalance = patient.claims.some(
        (c) =>
          c.status !== "paid" &&
          c.status !== "written_off" &&
          c.patientRespCents > 0 &&
          c.payments
            .filter((p) => p.source === "patient")
            .reduce((sum, p) => sum + p.amountCents, 0) < c.patientRespCents,
      );

      let action: "transfer" | "refund" | "hold";
      let reason: string;

      if (openOtherBalance) {
        action = "transfer";
        reason = `Patient has ${formatMoney(creditCents)} credit and an open balance on another claim. Recommend applying the credit to the open balance.`;
      } else if (creditCents >= 5000) {
        action = "refund";
        reason = `Patient has ${formatMoney(creditCents)} credit with no other open balances. Recommend issuing a refund (approval required).`;
      } else {
        action = "hold";
        reason = `Patient has a small ${formatMoney(creditCents)} credit. Hold pending the next visit's charges.`;
      }

      // Avoid duplicate task creation within 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const existing = await prisma.task.findFirst({
        where: {
          patientId: patient.id,
          createdAt: { gte: sevenDaysAgo },
          title: { contains: "Credit balance" },
        },
      });

      let taskId: string | null = null;
      if (!existing) {
        ctx.assertCan("write.task");
        const task = await prisma.task.create({
          data: {
            organizationId,
            patientId: patient.id,
            title: `Credit balance: ${patient.firstName} ${patient.lastName} (${formatMoney(creditCents)})`,
            description: `${reason}\n\nRecommended action: ${action.toUpperCase()}\n\n[Created by refundCredit agent]`,
            status: "open",
            assigneeRole: "operator",
            dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          },
        });
        taskId = task.id;
      }

      recommendations.push({
        patientId: patient.id,
        creditCents,
        action,
        reason,
        taskId,
      });
    }

    ctx.log("info", "Refund/credit detection complete", {
      patientsChecked: patients.length,
      creditsFound: recommendations.length,
      totalCreditCents,
    });

    return {
      organizationId,
      patientsChecked: patients.length,
      creditsFound: recommendations.length,
      totalCreditCents,
      recommendations,
    };
  },
};

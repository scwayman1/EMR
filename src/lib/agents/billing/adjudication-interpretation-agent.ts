import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";
import { writeAgentAudit } from "@/lib/orchestration/context";
import { startReasoning } from "../memory/agent-reasoning";

// ---------------------------------------------------------------------------
// Adjudication Interpretation Agent
// ---------------------------------------------------------------------------
// Wakes up when an ERA/835 is received. Parses the payer's decision, matches
// payments and adjustments to claims, detects denials and underpayments, and
// routes each to the appropriate downstream agent.
//
// This is the bridge between "payer made a decision" and "we act on it."
//
// Layer 3 state transition: accepted → adjudicated → (paid | partial | denied)
// Layer 4 events: subscribes adjudication.received
//   emits: payment.received, denial.detected, underpayment.detected
// ---------------------------------------------------------------------------

const input = z.object({
  claimId: z.string(),
  adjudicationResultId: z.string(),
  organizationId: z.string(),
});

const output = z.object({
  claimId: z.string(),
  claimStatus: z.string(),
  totalPaidCents: z.number(),
  totalDeniedCents: z.number(),
  totalAdjustedCents: z.number(),
  totalPatientRespCents: z.number(),
  denialEventsCreated: z.number(),
  paymentsCreated: z.number(),
});

export const adjudicationInterpretationAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "adjudicationInterpretation",
  version: "1.0.0",
  description:
    "Parses ERA/835 adjudication results. Matches payments to claims, " +
    "creates denial events for denied lines, detects underpayments, and " +
    "routes to appropriate downstream agents.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [
    "read.claim",
    "read.payment",
    "write.claim.status",
    "write.financialEvent",
    "write.denial.triage",
  ],
  requiresApproval: false,

  async run({ claimId, adjudicationResultId, organizationId }, ctx) {
    const trace = startReasoning("adjudicationInterpretation", "1.0.0", ctx.jobId);
    trace.step("begin adjudication interpretation", { claimId, adjudicationResultId });

    ctx.assertCan("read.claim");

    // ── Load the adjudication result + claim ────────────────────
    const adjResult = await prisma.adjudicationResult.findUnique({
      where: { id: adjudicationResultId },
    });
    if (!adjResult) throw new Error(`AdjudicationResult ${adjudicationResultId} not found`);

    const claim = await prisma.claim.findUnique({
      where: { id: claimId },
      include: { patient: true },
    });
    if (!claim) throw new Error(`Claim ${claimId} not found`);

    trace.step("loaded adjudication + claim", {
      claimStatus: adjResult.claimStatus,
      totalPaidCents: adjResult.totalPaidCents,
      totalAllowedCents: adjResult.totalAllowedCents,
    });

    const lineDetails = Array.isArray(adjResult.lineDetails)
      ? (adjResult.lineDetails as any[])
      : [];

    let totalDeniedCents = 0;
    let denialEventsCreated = 0;
    let paymentsCreated = 0;

    // ── Process per-line results ────────────────────────────────
    for (const line of lineDetails) {
      // Check for denied lines (CARC codes present with group CO or PR)
      if (line.carcCode && line.deniedAmountCents > 0) {
        const denialEvent = await prisma.denialEvent.create({
          data: {
            claimId,
            claimLineSequence: line.sequence ?? null,
            carcCode: String(line.carcCode),
            rarcCode: line.rarcCode ? String(line.rarcCode) : null,
            groupCode: line.groupCode ?? "CO",
            amountDeniedCents: line.deniedAmountCents,
            recoverable: isRecoverable(String(line.carcCode), line.groupCode ?? "CO"),
            recoverableAmountCents: isRecoverable(String(line.carcCode), line.groupCode ?? "CO")
              ? line.deniedAmountCents
              : null,
          },
        });

        totalDeniedCents += line.deniedAmountCents;
        denialEventsCreated++;

        await ctx.emit({
          name: "denial.detected",
          claimId,
          denialEventId: denialEvent.id,
          carcCode: String(line.carcCode),
          groupCode: line.groupCode ?? "CO",
          amountDeniedCents: line.deniedAmountCents,
          organizationId,
        });

        trace.step("created denial event", {
          carcCode: line.carcCode,
          groupCode: line.groupCode,
          amountCents: line.deniedAmountCents,
        });
      }
    }

    // ── Create payment record if any amount was paid ────────────
    if (adjResult.totalPaidCents > 0) {
      ctx.assertCan("write.financialEvent");

      const payment = await prisma.payment.create({
        data: {
          claimId,
          source: "insurance",
          amountCents: adjResult.totalPaidCents,
          paymentDate: adjResult.eraDate,
          reference: adjResult.checkNumber,
          notes: `ERA payment — ${adjResult.claimStatus}`,
        },
      });
      paymentsCreated++;

      await ctx.emit({
        name: "payment.received",
        paymentId: payment.id,
        claimId,
        organizationId,
      });

      trace.step("created payment", {
        amountCents: adjResult.totalPaidCents,
        checkNumber: adjResult.checkNumber,
      });
    }

    // ── Create contractual adjustments ──────────────────────────
    if (adjResult.totalAdjustedCents > 0) {
      await prisma.adjustment.create({
        data: {
          claimId,
          type: "contractual",
          amountCents: adjResult.totalAdjustedCents,
          reason: "Contractual adjustment per payer agreement",
          postedAt: new Date(),
        },
      });
      trace.step("created contractual adjustment", {
        amountCents: adjResult.totalAdjustedCents,
      });
    }

    // ── Update claim status ─────────────────────────────────────
    ctx.assertCan("write.claim.status");

    let finalStatus: string;
    if (denialEventsCreated > 0 && adjResult.totalPaidCents === 0) {
      finalStatus = "denied";
    } else if (denialEventsCreated > 0 && adjResult.totalPaidCents > 0) {
      finalStatus = "partial";
    } else {
      finalStatus = "paid";
    }

    await prisma.claim.update({
      where: { id: claimId },
      data: {
        status: finalStatus as any,
        paidAmountCents: adjResult.totalPaidCents,
        allowedAmountCents: adjResult.totalAllowedCents,
        patientRespCents: adjResult.totalPatientRespCents,
        paidAt: adjResult.totalPaidCents > 0 ? new Date() : undefined,
        deniedAt: finalStatus === "denied" ? new Date() : undefined,
      },
    });

    trace.step("updated claim status", { finalStatus });

    // ── Check for underpayment ──────────────────────────────────
    // Compare paid amount against the fee schedule expected amount
    if (adjResult.totalPaidCents > 0 && claim.billedAmountCents > 0) {
      const varianceCents = claim.billedAmountCents - adjResult.totalPaidCents - adjResult.totalAdjustedCents;
      const variancePct = varianceCents / claim.billedAmountCents;

      if (varianceCents > 500 && variancePct > 0.05) {
        // $5+ and 5%+ variance = meaningful underpayment
        await ctx.emit({
          name: "underpayment.detected",
          claimId,
          expectedCents: claim.billedAmountCents - adjResult.totalAdjustedCents,
          actualCents: adjResult.totalPaidCents,
          varianceCents,
          organizationId,
        });
        trace.step("underpayment detected", {
          expectedCents: claim.billedAmountCents - adjResult.totalAdjustedCents,
          actualCents: adjResult.totalPaidCents,
          varianceCents,
        });
      }
    }

    // ── Patient responsibility ───────────────────────────────────
    if (adjResult.totalPatientRespCents > 0) {
      await ctx.emit({
        name: "patient.balance.created",
        patientId: claim.patientId,
        claimId,
        amountCents: adjResult.totalPatientRespCents,
        source: "coinsurance", // simplified; real implementation parses CARC group PR
        organizationId,
      });
      trace.step("patient responsibility identified", {
        amountCents: adjResult.totalPatientRespCents,
      });
    }

    // ── Audit + close ───────────────────────────────────────────
    await writeAgentAudit(
      "adjudicationInterpretation",
      "1.0.0",
      organizationId,
      "adjudication.interpreted",
      { type: "Claim", id: claimId },
      {
        finalStatus,
        paidCents: adjResult.totalPaidCents,
        deniedCents: totalDeniedCents,
        denialEvents: denialEventsCreated,
        patientRespCents: adjResult.totalPatientRespCents,
      },
    );

    trace.conclude({
      confidence: 0.95, // ERA parsing is deterministic, confidence is high
      summary: `Interpreted adjudication: ${finalStatus}. Paid $${(adjResult.totalPaidCents / 100).toFixed(2)}, denied $${(totalDeniedCents / 100).toFixed(2)}, patient resp $${(adjResult.totalPatientRespCents / 100).toFixed(2)}. ${denialEventsCreated} denial event(s), ${paymentsCreated} payment(s).`,
    });
    await trace.persist();

    return {
      claimId,
      claimStatus: finalStatus,
      totalPaidCents: adjResult.totalPaidCents,
      totalDeniedCents: totalDeniedCents,
      totalAdjustedCents: adjResult.totalAdjustedCents,
      totalPatientRespCents: adjResult.totalPatientRespCents,
      denialEventsCreated,
      paymentsCreated,
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine if a denial is worth pursuing (recoverable) based on CARC + group.
 * Per Layer 6 decision framework.
 */
function isRecoverable(carcCode: string, groupCode: string): boolean {
  // Contractual adjustments (CARC 45, group CO) are not recoverable — they're expected
  if (carcCode === "45" && groupCode === "CO") return false;

  // Patient responsibility (group PR) — not recoverable from payer
  if (groupCode === "PR") return false;

  // Timely filing (CARC 29) — only recoverable if we can prove timely submission
  if (carcCode === "29") return true; // optimistic — agent will verify dates

  // Most CO denials are potentially recoverable through correction or appeal
  if (groupCode === "CO") return true;

  return true; // default optimistic
}

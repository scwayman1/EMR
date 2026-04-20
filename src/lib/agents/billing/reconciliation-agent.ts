import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import type { Agent } from "@/lib/orchestration/types";

// ---------------------------------------------------------------------------
// Pure helpers (extracted for testing)
// ---------------------------------------------------------------------------

export type ReconPayment = {
  id: string;
  amountCents: number;
  source: string;
};

export type ReconLedgerEvent = {
  paymentId: string;
  amountCents: number;
  type: string;
};

export type ReconException = {
  paymentId: string;
  reason: string;
  amountCents: number;
};

/** Map a payment source onto the financial-event type the reconciliation
 * agent looks for. Pure so tests can assert the contract. */
export function expectedEventTypeFor(source: string): "insurance_paid" | "patient_payment" {
  return source === "insurance" ? "insurance_paid" : "patient_payment";
}

/** Pure payment-to-ledger matcher. Given a payment and the candidate
 * financial event (or null if none found), return either a matched result
 * or a variance exception. Extracted so all of the "is this reconciled?"
 * logic can be covered without touching Prisma. */
export function matchPaymentToEvent(
  payment: ReconPayment,
  event: ReconLedgerEvent | null,
): { matched: true } | { matched: false; exception: ReconException } {
  if (!event) {
    return {
      matched: false,
      exception: {
        paymentId: payment.id,
        reason: "Payment recorded but no matching ledger event",
        amountCents: payment.amountCents,
      },
    };
  }

  if (event.amountCents !== payment.amountCents) {
    return {
      matched: false,
      exception: {
        paymentId: payment.id,
        reason: `Ledger event amount (${event.amountCents / 100}) does not match payment amount (${payment.amountCents / 100})`,
        amountCents: payment.amountCents,
      },
    };
  }

  return { matched: true };
}

/** Fold a list of payments + their matched events into a reconciliation
 * summary. Tests can feed fixture inputs rather than spinning up Prisma. */
export function reconcilePayments(
  pairs: Array<{ payment: ReconPayment; event: ReconLedgerEvent | null }>,
): {
  matched: number;
  exceptions: ReconException[];
  totalCheckedCents: number;
  totalUnmatchedCents: number;
} {
  let matched = 0;
  let totalCheckedCents = 0;
  let totalUnmatchedCents = 0;
  const exceptions: ReconException[] = [];

  for (const { payment, event } of pairs) {
    totalCheckedCents += payment.amountCents;
    const res = matchPaymentToEvent(payment, event);
    if (res.matched) {
      matched++;
    } else {
      exceptions.push(res.exception);
      totalUnmatchedCents += payment.amountCents;
    }
  }

  return { matched, exceptions, totalCheckedCents, totalUnmatchedCents };
}

// ---------------------------------------------------------------------------
// Reconciliation Agent
// ---------------------------------------------------------------------------
// Per PRD §13.2 #9: "Reconcile payments, settlements, deposits, and ledger
// activity. Match processor transactions to internal records. Match
// settlements to bank deposits. Flag fee or deposit mismatches."
//
// This is the daily-close agent. Walks recent payments, verifies they have
// corresponding ledger events, flags any payment without a matching financial
// event, and produces a reconciliation report.
//
// Phase 1: variance detection only. Phase 2 will add bank-deposit matching
// once we have a banking integration.
// ---------------------------------------------------------------------------

const input = z.object({
  organizationId: z.string(),
  sinceDate: z.string().optional(), // ISO date string; defaults to today
});

const output = z.object({
  organizationId: z.string(),
  paymentsChecked: z.number(),
  matched: z.number(),
  unmatched: z.number(),
  totalCheckedCents: z.number(),
  totalUnmatchedCents: z.number(),
  exceptions: z.array(
    z.object({
      paymentId: z.string(),
      reason: z.string(),
      amountCents: z.number(),
    }),
  ),
  generatedAt: z.string(),
});

export const reconciliationAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "reconciliation",
  version: "1.0.0",
  description:
    "Walks recent payments and verifies each has a matching financial event " +
    "in the ledger. Flags variances for ops review. Daily-close foundation.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: ["read.claim", "read.payment", "write.payment.match"],
  requiresApproval: false,

  async run({ organizationId, sinceDate }, ctx) {
    ctx.assertCan("read.payment");

    const since = sinceDate ? new Date(sinceDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    ctx.log("info", "Running reconciliation pass", {
      organizationId,
      since: since.toISOString(),
    });

    // Walk all payments since `since` for this org
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: since },
        claim: { organizationId },
      },
      include: { claim: true },
    });

    // Collect each payment + its candidate ledger event, then fold through
    // the pure reconciler so all variance logic is exercised in one place.
    const pairs: Array<{ payment: ReconPayment; event: ReconLedgerEvent | null }> = [];
    for (const payment of payments) {
      const matchingEvent = await prisma.financialEvent.findFirst({
        where: {
          paymentId: payment.id,
          type: expectedEventTypeFor(payment.source),
        },
      });
      pairs.push({
        payment: {
          id: payment.id,
          amountCents: payment.amountCents,
          source: payment.source,
        },
        event: matchingEvent
          ? {
              paymentId: matchingEvent.paymentId ?? payment.id,
              amountCents: matchingEvent.amountCents,
              type: matchingEvent.type,
            }
          : null,
      });
    }

    const {
      matched,
      exceptions,
      totalCheckedCents,
      totalUnmatchedCents,
    } = reconcilePayments(pairs);

    // Write reconciliation summary as a financial event so it shows up in audit
    if (payments.length > 0) {
      await prisma.financialEvent.create({
        data: {
          organizationId,
          patientId: payments[0].claim.patientId, // arbitrary; needed by schema
          type: "patient_payment",
          amountCents: 0,
          description: `Reconciliation pass: ${matched}/${payments.length} payments matched`,
          metadata: {
            kind: "reconciliation_summary",
            paymentsChecked: payments.length,
            matched,
            unmatched: exceptions.length,
            exceptionReasons: exceptions.map((e) => e.reason),
            since: since.toISOString(),
          },
          createdByAgent: "reconciliation:1.0.0",
        },
      });
    }

    ctx.log("info", "Reconciliation complete", {
      checked: payments.length,
      matched,
      exceptions: exceptions.length,
      unmatchedCents: totalUnmatchedCents,
    });

    return {
      organizationId,
      paymentsChecked: payments.length,
      matched,
      unmatched: exceptions.length,
      totalCheckedCents,
      totalUnmatchedCents,
      exceptions,
      generatedAt: new Date().toISOString(),
    };
  },
};

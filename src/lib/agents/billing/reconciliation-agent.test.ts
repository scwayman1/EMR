import { describe, expect, it } from "vitest";
import {
  expectedEventTypeFor,
  matchPaymentToEvent,
  reconcilePayments,
  type ReconLedgerEvent,
  type ReconPayment,
} from "./reconciliation-agent";

// ---------------------------------------------------------------------------
// Reconciliation Agent — pure helper tests
// ---------------------------------------------------------------------------
// Payment-matching + variance detection is isolated into pure helpers so we
// can cover the interesting cases (missing event, amount mismatch, mixed
// sources) without setting up Prisma fixtures.

function payment(overrides: Partial<ReconPayment> = {}): ReconPayment {
  return {
    id: "pay-1",
    amountCents: 5000,
    source: "insurance",
    ...overrides,
  };
}

function event(overrides: Partial<ReconLedgerEvent> = {}): ReconLedgerEvent {
  return {
    paymentId: "pay-1",
    amountCents: 5000,
    type: "insurance_paid",
    ...overrides,
  };
}

describe("expectedEventTypeFor", () => {
  it("maps insurance payments to insurance_paid", () => {
    expect(expectedEventTypeFor("insurance")).toBe("insurance_paid");
  });

  it("maps anything else to patient_payment", () => {
    expect(expectedEventTypeFor("patient")).toBe("patient_payment");
    expect(expectedEventTypeFor("cash")).toBe("patient_payment");
    expect(expectedEventTypeFor("")).toBe("patient_payment");
  });
});

describe("matchPaymentToEvent", () => {
  it("returns matched when amounts agree and an event exists", () => {
    expect(matchPaymentToEvent(payment(), event())).toEqual({ matched: true });
  });

  it("returns an exception when no event is found", () => {
    const result = matchPaymentToEvent(payment({ amountCents: 1234 }), null);
    expect(result.matched).toBe(false);
    expect(result).toMatchObject({
      exception: {
        paymentId: "pay-1",
        reason: "Payment recorded but no matching ledger event",
        amountCents: 1234,
      },
    });
  });

  it("returns an exception when event amount differs from payment amount", () => {
    const result = matchPaymentToEvent(
      payment({ amountCents: 5000 }),
      event({ amountCents: 4950 }),
    );
    expect(result.matched).toBe(false);
    expect(result).toMatchObject({
      exception: {
        paymentId: "pay-1",
        amountCents: 5000,
      },
    });
    // Reason string must include both dollar amounts for biller clarity
    if (!result.matched) {
      expect(result.exception.reason).toContain("49.5");
      expect(result.exception.reason).toContain("50");
    }
  });

  it("treats a zero-amount event as a variance against a non-zero payment", () => {
    const result = matchPaymentToEvent(payment({ amountCents: 100 }), event({ amountCents: 0 }));
    expect(result.matched).toBe(false);
  });
});

describe("reconcilePayments", () => {
  it("returns zeros for an empty input", () => {
    const summary = reconcilePayments([]);
    expect(summary).toEqual({
      matched: 0,
      exceptions: [],
      totalCheckedCents: 0,
      totalUnmatchedCents: 0,
    });
  });

  it("counts every clean payment as matched", () => {
    const summary = reconcilePayments([
      { payment: payment({ id: "a", amountCents: 100 }), event: event({ amountCents: 100 }) },
      { payment: payment({ id: "b", amountCents: 250 }), event: event({ amountCents: 250 }) },
    ]);
    expect(summary.matched).toBe(2);
    expect(summary.exceptions).toHaveLength(0);
    expect(summary.totalCheckedCents).toBe(350);
    expect(summary.totalUnmatchedCents).toBe(0);
  });

  it("separates matches from variances with mixed inputs", () => {
    const summary = reconcilePayments([
      // ok
      { payment: payment({ id: "a", amountCents: 1000 }), event: event({ amountCents: 1000 }) },
      // missing event
      { payment: payment({ id: "b", amountCents: 500 }), event: null },
      // amount mismatch
      { payment: payment({ id: "c", amountCents: 300 }), event: event({ amountCents: 299 }) },
    ]);
    expect(summary.matched).toBe(1);
    expect(summary.exceptions).toHaveLength(2);
    expect(summary.totalCheckedCents).toBe(1800);
    expect(summary.totalUnmatchedCents).toBe(800);
    expect(summary.exceptions.map((e) => e.paymentId).sort()).toEqual(["b", "c"]);
  });

  it("preserves payment ids on exceptions for downstream task creation", () => {
    const summary = reconcilePayments([
      { payment: payment({ id: "pay-99", amountCents: 42 }), event: null },
    ]);
    expect(summary.exceptions[0].paymentId).toBe("pay-99");
    expect(summary.exceptions[0].amountCents).toBe(42);
  });

  it("accumulates exception amounts even with multiple variances", () => {
    const summary = reconcilePayments([
      { payment: payment({ id: "a", amountCents: 100 }), event: null },
      { payment: payment({ id: "b", amountCents: 200 }), event: null },
      { payment: payment({ id: "c", amountCents: 50 }), event: null },
    ]);
    expect(summary.totalUnmatchedCents).toBe(350);
    expect(summary.matched).toBe(0);
  });
});

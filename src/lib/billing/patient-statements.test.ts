import { describe, expect, it } from "vitest";
import {
  aggregateStatement,
  decideCadence,
  defaultPlainLanguageSummary,
  generateStatementNumber,
} from "./patient-statements";

const day = (s: string) => new Date(s);

describe("generateStatementNumber", () => {
  it("formats STMT-YYYYMMDD-SEQ with zero-padded sequence", () => {
    expect(generateStatementNumber(day("2026-04-15T12:00:00Z"), 0)).toBe("STMT-20260415-0001");
    expect(generateStatementNumber(day("2026-04-15T12:00:00Z"), 9)).toBe("STMT-20260415-0010");
    expect(generateStatementNumber(day("2026-12-31T12:00:00Z"), 999)).toBe("STMT-20261231-1000");
  });
});

describe("decideCadence", () => {
  const baseInput = {
    firstResponsibilityAt: day("2026-01-01T12:00:00Z"),
    lastStatementSentAt: null,
    lastPatientPaymentAt: null,
    amountDueCents: 10000,
    onPaymentPlan: false,
  };

  it("skips when balance is zero", () => {
    const d = decideCadence({ ...baseInput, amountDueCents: 0 }, day("2026-02-15"));
    expect(d.shouldIssue).toBe(false);
    expect(d.cycle).toBe("skip");
  });

  it("skips during the 30-day grace window", () => {
    const d = decideCadence(baseInput, day("2026-01-15T12:00:00Z"));
    expect(d.shouldIssue).toBe(false);
    expect(d.reason).toContain("grace");
  });

  it("issues the first statement after grace", () => {
    const d = decideCadence(baseInput, day("2026-02-01T12:00:00Z"));
    expect(d.shouldIssue).toBe(true);
    expect(d.cycle).toBe("first");
  });

  it("waits 30d between cycles", () => {
    const d = decideCadence(
      { ...baseInput, lastStatementSentAt: day("2026-02-01") },
      day("2026-02-20"),
    );
    expect(d.shouldIssue).toBe(false);
    expect(d.cycle).toBe("skip");
  });

  it("issues a monthly statement after 30d", () => {
    const d = decideCadence(
      { ...baseInput, lastStatementSentAt: day("2026-02-01T12:00:00Z") },
      day("2026-03-05T12:00:00Z"),
    );
    expect(d.shouldIssue).toBe(true);
    expect(d.cycle).toBe("monthly");
  });

  it("escalates to final_notice past 90d from first responsibility", () => {
    const d = decideCadence(
      {
        ...baseInput,
        firstResponsibilityAt: day("2026-01-01T12:00:00Z"),
        lastStatementSentAt: day("2026-03-15T12:00:00Z"),
      },
      day("2026-04-20T12:00:00Z"),
    );
    expect(d.shouldIssue).toBe(true);
    expect(d.cycle).toBe("final_notice");
  });

  it("skips when on a payment plan", () => {
    const d = decideCadence({ ...baseInput, onPaymentPlan: true }, day("2026-03-01"));
    expect(d.shouldIssue).toBe(false);
    expect(d.reason).toContain("payment plan");
  });
});

describe("aggregateStatement", () => {
  it("computes amount_due as charges + prior - insurance - adjustments - paid", () => {
    const a = aggregateStatement({
      lineItems: [
        { description: "Office visit", amountCents: 20000, encounterId: "e1", cptCode: "99214", serviceDate: new Date() },
        { description: "Lab", amountCents: 5000, encounterId: "e1", cptCode: "36415", serviceDate: new Date() },
      ],
      insurancePaidCents: 15000,
      adjustmentsCents: 2000,
      priorBalanceCents: 1000,
      paidToDateCents: 1000,
    });
    expect(a.totalChargesCents).toBe(25000);
    expect(a.amountDueCents).toBe(8000);
  });

  it("clamps negative amount_due to zero (credits roll forward, never refunds here)", () => {
    const a = aggregateStatement({
      lineItems: [{ description: "Visit", amountCents: 10000, encounterId: null, cptCode: null, serviceDate: null }],
      insurancePaidCents: 12000,
      adjustmentsCents: 0,
      priorBalanceCents: 0,
      paidToDateCents: 500,
    });
    expect(a.amountDueCents).toBe(0);
  });
});

describe("defaultPlainLanguageSummary", () => {
  it("returns a paid-in-full short-form when amount_due is zero", () => {
    const s = defaultPlainLanguageSummary({
      patientFirstName: "Maya",
      agg: aggregateStatement({
        lineItems: [],
        insurancePaidCents: 0,
        adjustmentsCents: 0,
        priorBalanceCents: 0,
        paidToDateCents: 0,
      }),
      dueDate: new Date(),
    });
    expect(s).toContain("paid in full");
  });

  it("includes the four key amounts in the summary", () => {
    const s = defaultPlainLanguageSummary({
      patientFirstName: "James",
      agg: aggregateStatement({
        lineItems: [{ description: "Visit", amountCents: 20000, encounterId: null, cptCode: null, serviceDate: null }],
        insurancePaidCents: 15000,
        adjustmentsCents: 2000,
        priorBalanceCents: 0,
        paidToDateCents: 1000,
      }),
      dueDate: day("2026-05-15"),
    });
    expect(s).toContain("James");
    expect(s).toContain("$200.00"); // charges
    expect(s).toContain("$150.00"); // insurance
    expect(s).toContain("$20.00");  // adjustments
    expect(s).toContain("$10.00");  // paid
    expect(s).toContain("$20.00");  // owed (also $20)
  });
});

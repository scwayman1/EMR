import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAP_CENTS,
  calculateMonthlyReimbursement,
  sameCalendarYearUtc,
  startOfMonthUtc,
  sumYtdReimbursable,
  type ExistingReimbursement,
} from "./reimbursement";

describe("calculateMonthlyReimbursement", () => {
  it("returns full spend when within cap and YTD empty", () => {
    const r = calculateMonthlyReimbursement({
      documentedSpendCents: 12_000,
      ytdReimbursableCents: 0,
    });
    expect(r.reimbursableCents).toBe(12_000);
    expect(r.cappedByAnnualLimit).toBe(false);
    expect(r.remainingCapCents).toBe(DEFAULT_CAP_CENTS - 12_000);
  });

  it("caps at the annual remaining when spend would exceed it", () => {
    const r = calculateMonthlyReimbursement({
      documentedSpendCents: 30_000,
      ytdReimbursableCents: 40_000, // already used $400 of $500
    });
    expect(r.reimbursableCents).toBe(10_000); // only $100 left
    expect(r.cappedByAnnualLimit).toBe(true);
    expect(r.remainingCapCents).toBe(0);
  });

  it("returns 0 when YTD already at cap", () => {
    const r = calculateMonthlyReimbursement({
      documentedSpendCents: 5_000,
      ytdReimbursableCents: DEFAULT_CAP_CENTS,
    });
    expect(r.reimbursableCents).toBe(0);
    expect(r.cappedByAnnualLimit).toBe(true);
  });

  it("respects custom cap", () => {
    const r = calculateMonthlyReimbursement({
      documentedSpendCents: 100_000,
      ytdReimbursableCents: 0,
      capCents: 80_000,
    });
    expect(r.reimbursableCents).toBe(80_000);
    expect(r.cappedByAnnualLimit).toBe(true);
  });

  it("rejects negative spend", () => {
    expect(() =>
      calculateMonthlyReimbursement({
        documentedSpendCents: -1,
        ytdReimbursableCents: 0,
      }),
    ).toThrow();
  });

  it("rejects negative YTD", () => {
    expect(() =>
      calculateMonthlyReimbursement({
        documentedSpendCents: 100,
        ytdReimbursableCents: -1,
      }),
    ).toThrow();
  });
});

describe("startOfMonthUtc", () => {
  it("truncates a mid-month date", () => {
    const d = new Date("2026-04-29T18:30:00Z");
    expect(startOfMonthUtc(d).toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("sameCalendarYearUtc", () => {
  it("returns true for two dates in same year", () => {
    expect(sameCalendarYearUtc(new Date("2026-01-01"), new Date("2026-12-31"))).toBe(true);
  });
  it("returns false across year boundary", () => {
    expect(sameCalendarYearUtc(new Date("2025-12-31"), new Date("2026-01-01"))).toBe(false);
  });
});

describe("sumYtdReimbursable", () => {
  const month = new Date("2026-04-01T00:00:00Z");
  const rows: ExistingReimbursement[] = [
    { serviceMonth: new Date("2026-01-01T00:00:00Z"), reimbursableCents: 5_000, status: "approved" },
    { serviceMonth: new Date("2026-02-01T00:00:00Z"), reimbursableCents: 10_000, status: "submitted" },
    { serviceMonth: new Date("2026-03-01T00:00:00Z"), reimbursableCents: 7_000, status: "draft" }, // ignored
    { serviceMonth: new Date("2025-11-01T00:00:00Z"), reimbursableCents: 9_000, status: "paid" }, // wrong year
    { serviceMonth: new Date("2026-03-01T00:00:00Z"), reimbursableCents: 8_000, status: "paid" },
  ];

  it("sums approved/submitted/paid rows in same calendar year", () => {
    expect(sumYtdReimbursable(rows, month)).toBe(5_000 + 10_000 + 8_000);
  });

  it("ignores drafts and denials", () => {
    const r = sumYtdReimbursable(
      [
        ...rows,
        { serviceMonth: new Date("2026-04-01T00:00:00Z"), reimbursableCents: 50_000, status: "denied" },
      ],
      month,
    );
    expect(r).toBe(5_000 + 10_000 + 8_000);
  });
});

// EMR-145 — Cannabis Dispensary Billing + CMS $500 Reimbursement.
//
// Federal Medicare/Medicaid does NOT currently reimburse cannabis
// purchases. This module documents what *would* qualify under a
// hypothetical $500-per-patient-per-year program (Dr. Patel's spec)
// so the practice has clean records ready when the regulation
// changes. The math here is the system of record for
// `DispensaryReimbursement` rows.
//
// The cap defaults to 500 USD per patient per calendar year. Per
// month is the granularity we record because dispensary spending
// reports come in monthly statements; the annual cap is rolled up
// across all months for that patient.

export const DEFAULT_CAP_CENTS = 50_000; // $500.00

export interface ReimbursementInput {
  /** Patient's documented out-of-pocket cannabis spend for the month, in cents. */
  documentedSpendCents: number;
  /** Sum of `reimbursableCents` already approved earlier in the same calendar year. */
  ytdReimbursableCents: number;
  /** Per-patient annual cap in cents. Defaults to $500. */
  capCents?: number;
}

export interface ReimbursementCalculation {
  documentedSpendCents: number;
  reimbursableCents: number;
  remainingCapCents: number;
  cappedByAnnualLimit: boolean;
  capCents: number;
}

/**
 * Given a month's documented spend and what's already been
 * reimbursed YTD, return the dollar amount we can claim this month
 * without exceeding the annual cap.
 */
export function calculateMonthlyReimbursement(
  input: ReimbursementInput,
): ReimbursementCalculation {
  const cap = input.capCents ?? DEFAULT_CAP_CENTS;
  if (input.documentedSpendCents < 0) {
    throw new Error("documentedSpendCents must be non-negative");
  }
  if (input.ytdReimbursableCents < 0) {
    throw new Error("ytdReimbursableCents must be non-negative");
  }
  const remainingBefore = Math.max(0, cap - input.ytdReimbursableCents);
  const reimbursable = Math.min(input.documentedSpendCents, remainingBefore);
  const cappedByAnnualLimit =
    reimbursable < input.documentedSpendCents && remainingBefore < input.documentedSpendCents;
  return {
    documentedSpendCents: input.documentedSpendCents,
    reimbursableCents: reimbursable,
    remainingCapCents: remainingBefore - reimbursable,
    cappedByAnnualLimit,
    capCents: cap,
  };
}

/** Truncate any date to the first millisecond of its month, UTC. */
export function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Two reimbursements are in the same calendar year (UTC). */
export function sameCalendarYearUtc(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear();
}

export interface ExistingReimbursement {
  serviceMonth: Date;
  reimbursableCents: number;
  status: "draft" | "submitted" | "approved" | "paid" | "denied";
}

/**
 * Sum the YTD reimbursable cents across approved+submitted+paid
 * statuses for a given month's calendar year. Drafts and denials
 * don't count against the cap.
 */
export function sumYtdReimbursable(
  existing: ExistingReimbursement[],
  serviceMonth: Date,
): number {
  return existing
    .filter((r) => sameCalendarYearUtc(r.serviceMonth, serviceMonth))
    .filter((r) => r.status === "submitted" || r.status === "approved" || r.status === "paid")
    .reduce((sum, r) => sum + r.reimbursableCents, 0);
}

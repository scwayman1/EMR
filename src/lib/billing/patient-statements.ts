/**
 * Patient statement auto-generator — EMR-225
 * ------------------------------------------
 * The fleet records patient responsibility on every claim adjudication
 * but never produces statements. No statements = no patient collections.
 *
 * Cadence: 30 days after the first patient-responsibility posting,
 * then every 30 days until paid. Multi-channel delivery (portal +
 * email + SMS + paper fallback) is wired via EMR-211 reminder
 * orchestration; this module stays pure.
 *
 * Generates:
 *   - Statement number (`STMT-YYYYMMDD-SEQ`).
 *   - Period boundaries (`periodStart` / `periodEnd`).
 *   - Aggregated line items pulled from FinancialEvent + Claim.
 *   - Plain-language summary template (LLM substitutes the long form
 *     in the agent layer; this returns a deterministic fallback).
 */

import { formatMoney } from "@/lib/domain/billing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatementLineItem {
  description: string;
  amountCents: number;
  encounterId: string | null;
  cptCode: string | null;
  serviceDate: Date | null;
}

export interface StatementCadenceInput {
  /** When patient responsibility was first booked. */
  firstResponsibilityAt: Date;
  /** Most recent statement issued, or null if none. */
  lastStatementSentAt: Date | null;
  /** Most recent patient payment toward this balance, or null. */
  lastPatientPaymentAt: Date | null;
  /** Outstanding balance now, in cents. */
  amountDueCents: number;
  /** Whether the patient is on an active payment plan covering this balance. */
  onPaymentPlan: boolean;
}

export interface StatementCadenceDecision {
  /** Whether to issue a statement today. */
  shouldIssue: boolean;
  /** What kind of statement (drives tone in EMR-211 dunning). */
  cycle: "first" | "monthly" | "final_notice" | "skip";
  /** Reason — for audit + UI. */
  reason: string;
  /** When the next decision should be re-evaluated, in days from now. */
  nextEvalInDays: number;
}

// ---------------------------------------------------------------------------
// Statement number generator
// ---------------------------------------------------------------------------

/** Generate `STMT-YYYYMMDD-SEQ`. The caller passes the count of
 *  statements already issued today (org-scoped) — that becomes the
 *  sequence. Zero-padded to 4 digits so lex order tracks issue order. */
export function generateStatementNumber(today: Date, todaysIssuedCount: number): string {
  const ymd = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, "0")}${String(today.getUTCDate()).padStart(2, "0")}`;
  const seq = String(todaysIssuedCount + 1).padStart(4, "0");
  return `STMT-${ymd}-${seq}`;
}

// ---------------------------------------------------------------------------
// Cadence
// ---------------------------------------------------------------------------

const FIRST_STATEMENT_GRACE_DAYS = 30;
const STATEMENT_INTERVAL_DAYS = 30;
const FINAL_NOTICE_AFTER_DAYS = 90;

export function decideCadence(
  input: StatementCadenceInput,
  today: Date = new Date(),
): StatementCadenceDecision {
  if (input.amountDueCents <= 0) {
    return {
      shouldIssue: false,
      cycle: "skip",
      reason: "no patient balance",
      nextEvalInDays: 30,
    };
  }
  if (input.onPaymentPlan) {
    return {
      shouldIssue: false,
      cycle: "skip",
      reason: "patient is on an active payment plan — installment notices handle communication",
      nextEvalInDays: 30,
    };
  }
  const daysSinceFirst = daysBetween(input.firstResponsibilityAt, today);
  if (daysSinceFirst < FIRST_STATEMENT_GRACE_DAYS) {
    return {
      shouldIssue: false,
      cycle: "skip",
      reason: `first responsibility ${daysSinceFirst}d ago — within ${FIRST_STATEMENT_GRACE_DAYS}d grace window`,
      nextEvalInDays: FIRST_STATEMENT_GRACE_DAYS - daysSinceFirst,
    };
  }
  if (!input.lastStatementSentAt) {
    return {
      shouldIssue: true,
      cycle: "first",
      reason: "first statement after 30-day grace",
      nextEvalInDays: STATEMENT_INTERVAL_DAYS,
    };
  }
  const daysSinceLast = daysBetween(input.lastStatementSentAt, today);
  if (daysSinceLast < STATEMENT_INTERVAL_DAYS) {
    return {
      shouldIssue: false,
      cycle: "skip",
      reason: `last statement ${daysSinceLast}d ago — wait ${STATEMENT_INTERVAL_DAYS - daysSinceLast}d`,
      nextEvalInDays: STATEMENT_INTERVAL_DAYS - daysSinceLast,
    };
  }
  if (daysSinceFirst >= FINAL_NOTICE_AFTER_DAYS) {
    return {
      shouldIssue: true,
      cycle: "final_notice",
      reason: `${daysSinceFirst}d past first responsibility — final notice tier`,
      nextEvalInDays: STATEMENT_INTERVAL_DAYS,
    };
  }
  return {
    shouldIssue: true,
    cycle: "monthly",
    reason: "30-day monthly cycle",
    nextEvalInDays: STATEMENT_INTERVAL_DAYS,
  };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface StatementAggregateInput {
  /** Charges and adjustments since the last statement period. */
  lineItems: StatementLineItem[];
  insurancePaidCents: number;
  adjustmentsCents: number;
  /** Balance carried in from prior statements that wasn't paid. */
  priorBalanceCents: number;
  /** Patient payments made since the last statement. */
  paidToDateCents: number;
}

export interface StatementAggregate {
  totalChargesCents: number;
  insurancePaidCents: number;
  adjustmentsCents: number;
  priorBalanceCents: number;
  paidToDateCents: number;
  amountDueCents: number;
  lineItems: StatementLineItem[];
}

/** Compute the totals row for a statement.
 *
 *   amount_due = total_charges + prior_balance
 *              - insurance_paid
 *              - adjustments
 *              - paid_to_date
 *
 *  Negative results clamp to 0 — credits roll forward as `priorBalance`
 *  on the next cycle rather than appearing as a refund here.
 */
export function aggregateStatement(input: StatementAggregateInput): StatementAggregate {
  const totalCharges = input.lineItems.reduce((a, l) => a + l.amountCents, 0);
  const due =
    totalCharges +
    input.priorBalanceCents -
    input.insurancePaidCents -
    input.adjustmentsCents -
    input.paidToDateCents;
  return {
    totalChargesCents: totalCharges,
    insurancePaidCents: input.insurancePaidCents,
    adjustmentsCents: input.adjustmentsCents,
    priorBalanceCents: input.priorBalanceCents,
    paidToDateCents: input.paidToDateCents,
    amountDueCents: Math.max(0, due),
    lineItems: input.lineItems,
  };
}

// ---------------------------------------------------------------------------
// Plain-language summary (deterministic fallback)
// ---------------------------------------------------------------------------

/** Plain-English summary used when the LLM-drafted version is unavailable
 *  or the agent isn't approved to send. Patients who call billing
 *  understand "your insurance paid X, you owe Y" — that's the summary. */
export function defaultPlainLanguageSummary(args: {
  patientFirstName: string;
  agg: StatementAggregate;
  dueDate: Date;
}): string {
  const { patientFirstName, agg, dueDate } = args;
  const dueOn = dueDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const charges = formatMoney(agg.totalChargesCents);
  const insurance = formatMoney(agg.insurancePaidCents);
  const adjustments = formatMoney(agg.adjustmentsCents);
  const paid = formatMoney(agg.paidToDateCents);
  const owed = formatMoney(agg.amountDueCents);

  if (agg.amountDueCents === 0) {
    return `Hi ${patientFirstName} — good news: your account is paid in full. No action needed.`;
  }
  return [
    `Hi ${patientFirstName} — here's a quick summary of your account.`,
    `Your visit charges came to ${charges}. Your insurance paid ${insurance} and we applied ${adjustments} in adjustments. You've paid ${paid} so far.`,
    `That leaves ${owed} due by ${dueOn}.`,
    `If you'd like to set up a payment plan or have questions, reply to this message or call us — we'll work it out together.`,
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

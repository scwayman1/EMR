/**
 * Patient statements generator — EMR-225 module entrypoint
 * --------------------------------------------------------
 * Re-exports the canonical pure cadence layer (`patient-statements.ts`)
 * and the persistence + dispatch entrypoint (`statement-generator.ts`),
 * plus adds multi-channel selection helpers and a small policy layer
 * for tone/cycle decisions the dunning agent uses.
 *
 * Module organization:
 *   - `patient-statements.ts` (pure)   — cadence, aggregation, plain-language
 *   - `statement-generator.ts` (DB)    — batch run, AgentJob dispatch
 *   - this file                        — multi-channel selection + tone
 *
 * Why the indirection: keeps the pure layer test-fast (no Prisma) while
 * still giving callers a single import path that follows the EMR-225
 * ticket's named home.
 */

export {
  aggregateStatement,
  decideCadence,
  defaultPlainLanguageSummary,
  generateStatementNumber,
  type StatementAggregate,
  type StatementAggregateInput,
  type StatementCadenceDecision,
  type StatementCadenceInput,
  type StatementLineItem,
} from "../patient-statements";

export {
  generateStatementBatch,
  type DeliveryChannel,
  type GenerateBatchInput,
  type GenerateBatchResult,
} from "../statement-generator";

import { defaultPlainLanguageSummary, type StatementAggregate } from "../patient-statements";
import type { DeliveryChannel } from "../statement-generator";

// ---------------------------------------------------------------------------
// Multi-channel selection (pure)
// ---------------------------------------------------------------------------

export interface ChannelInput {
  /** Patient's currently-set communication preference. */
  smsOptIn: boolean;
  emailOptIn: boolean;
  /** Whether we have actual contact details on file. */
  hasEmail: boolean;
  hasPhone: boolean;
  /** True when the patient has logged into the portal in the last 30d. */
  portalActive: boolean;
  /** Cycle bumps the floor — the more overdue, the more channels we use. */
  cycle: "first" | "monthly" | "final_notice";
}

/** Pure selector. Returns the channels we should *attempt* in priority
 *  order. The reminder fleet hands these off to per-channel adapters
 *  and falls through to the next on a hard failure (bounce, opt-out
 *  callback, undeliverable phone).
 *
 *  Policy:
 *    - first:        prefer one channel — portal if active, else email
 *                    or SMS, falling back to mail.
 *    - monthly:      portal + email (or SMS) so a missed inbox isn't
 *                    the only delivery attempt.
 *    - final_notice: every channel we have. Mail is mandatory because
 *                    legal/HIPAA precedent requires a paper trail
 *                    before turning a balance over to collections.
 */
export function selectDeliveryChannels(input: ChannelInput): DeliveryChannel[] {
  const channels: DeliveryChannel[] = [];
  const addEmail = () => input.hasEmail && input.emailOptIn && channels.push("email");
  const addSms = () => input.hasPhone && input.smsOptIn && channels.push("sms");
  const addPortal = () => input.portalActive && channels.push("portal");

  if (input.cycle === "first") {
    if (input.portalActive) addPortal();
    else if (input.hasEmail && input.emailOptIn) addEmail();
    else if (input.hasPhone && input.smsOptIn) addSms();
    if (channels.length === 0) channels.push("mail");
    return channels;
  }

  if (input.cycle === "monthly") {
    addPortal();
    addEmail();
    addSms();
    if (channels.length === 0) channels.push("mail");
    return channels;
  }

  // final_notice — fan out, always include mail.
  addPortal();
  addEmail();
  addSms();
  channels.push("mail");
  return channels;
}

// ---------------------------------------------------------------------------
// Tone selector
// ---------------------------------------------------------------------------

export type StatementTone = "friendly" | "reminder" | "firm";

export function toneForCycle(cycle: "first" | "monthly" | "final_notice"): StatementTone {
  if (cycle === "first") return "friendly";
  if (cycle === "monthly") return "reminder";
  return "firm";
}

// ---------------------------------------------------------------------------
// Plain-language summary by tone
// ---------------------------------------------------------------------------

/** Tone-adjusted variant of `defaultPlainLanguageSummary`. The LLM-driven
 *  agent generally writes a personalized version; this is the
 *  deterministic fallback used when the agent isn't approved to send. */
export function plainLanguageSummaryFor(args: {
  patientFirstName: string;
  agg: StatementAggregate;
  dueDate: Date;
  tone: StatementTone;
}): string {
  const base = defaultPlainLanguageSummary({
    patientFirstName: args.patientFirstName,
    agg: args.agg,
    dueDate: args.dueDate,
  });
  if (args.tone === "friendly") return base;
  if (args.tone === "reminder") {
    return base.replace(
      "If you'd like to set up a payment plan",
      "This is your monthly reminder. If you'd like to set up a payment plan",
    );
  }
  // firm — final notice. Add the consequences sentence.
  return [
    base,
    "Please reach out within the next 14 days. If we don't hear from you, this account may be referred for further collection — we'd much rather work it out together.",
  ].join("\n\n");
}

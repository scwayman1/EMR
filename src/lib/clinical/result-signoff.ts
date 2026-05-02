/**
 * EMR-165 — Doctor sign-off workflow for patient results.
 * --------------------------------------------------------
 * `lib/clinical/result-signoff.ts` is the pure-logic core for the
 * results-review surface at `/clinic/results/review`. The action layer
 * wraps these helpers in transactional Prisma writes; the page reads
 * the queue via `buildSignoffQueue()` and submits sign actions through
 * server actions.
 *
 * The shape is deliberately small:
 *   - `buildSignoffQueue()` — sort/group an unsigned-result list.
 *   - `validateSignoff()` — gate the submit (catch missing comment on
 *     abnormal results, prevent double-sign, enforce same-org).
 *   - `buildSignoffAuditPayload()` — the metadata blob written into
 *     `AuditLog.metadata`. Kept structured so a future research export
 *     can roll it up.
 *   - `buildPatientNotification()` — the message that gets enqueued
 *     for the patient when the clinician signs.
 *
 * Sorted by abnormal-first, then oldest-first within each band so an
 * abnormal lab can't sit longer than the SLA.
 */

import { z } from "zod";

export type SignoffResultKind = "lab" | "imaging" | "pathology" | "screening";

export interface SignoffQueueItem {
  id: string;
  kind: SignoffResultKind;
  patientId: string;
  patientName: string;
  panelName: string;
  receivedAt: Date;
  abnormalFlag: boolean;
  signedAt: Date | null;
  /** Pre-computed AI summary, when available. */
  aiSummary: string | null;
}

export type SignoffUrgency = "stat" | "high" | "normal";

export interface RankedSignoffItem extends SignoffQueueItem {
  urgency: SignoffUrgency;
  /** How many days the result has been waiting on a signature. */
  ageDays: number;
}

const STAT_AGE_DAYS = 2;
const HIGH_AGE_DAYS = 5;

export function buildSignoffQueue(
  items: SignoffQueueItem[],
  asOf: Date = new Date(),
): RankedSignoffItem[] {
  const ranked = items
    .filter((i) => i.signedAt === null)
    .map<RankedSignoffItem>((i) => {
      const ageDays = Math.floor(
        (asOf.getTime() - i.receivedAt.getTime()) / 86_400_000,
      );
      const urgency: SignoffUrgency =
        i.abnormalFlag && ageDays >= STAT_AGE_DAYS
          ? "stat"
          : i.abnormalFlag || ageDays >= HIGH_AGE_DAYS
            ? "high"
            : "normal";
      return { ...i, urgency, ageDays };
    });

  const urgencyRank: Record<SignoffUrgency, number> = { stat: 0, high: 1, normal: 2 };
  ranked.sort((a, b) => {
    const u = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (u !== 0) return u;
    return a.receivedAt.getTime() - b.receivedAt.getTime();
  });
  return ranked;
}

// ---------------------------------------------------------------------------
// Sign-off validation
// ---------------------------------------------------------------------------

export const SignoffInputSchema = z
  .object({
    resultId: z.string().min(1),
    /** Free-text comment the clinician adds. Required for abnormal results. */
    comment: z.string().max(2_000).default(""),
    /** Outcome — flows into LabResult.reviewOutcome and the patient notification copy. */
    outcome: z.enum(["looks_good", "needs_followup", "repeat", "routed_to_ma"]),
    /** True iff the patient should be notified after sign. */
    notifyPatient: z.boolean().default(true),
  })
  .strict();

export type SignoffInput = z.infer<typeof SignoffInputSchema>;

export interface SignoffContext {
  resultId: string;
  patientId: string;
  organizationId: string;
  abnormalFlag: boolean;
  alreadySigned: boolean;
  /** The clinician's organization — must match the result's org. */
  clinicianOrgId: string;
}

export interface SignoffValidation {
  ok: boolean;
  errors: string[];
}

export function validateSignoff(
  input: SignoffInput,
  ctx: SignoffContext,
): SignoffValidation {
  const errors: string[] = [];

  if (ctx.alreadySigned) {
    errors.push("This result is already signed.");
  }
  if (ctx.organizationId !== ctx.clinicianOrgId) {
    errors.push("Forbidden — result belongs to a different organization.");
  }
  if (ctx.abnormalFlag && input.outcome === "looks_good") {
    errors.push(
      "Abnormal result cannot be signed as 'looks good' — escalate or document follow-up.",
    );
  }
  if (ctx.abnormalFlag && input.comment.trim().length < 10) {
    errors.push(
      "Abnormal results require a clinician comment of at least 10 characters.",
    );
  }
  if (input.outcome === "needs_followup" && input.comment.trim().length === 0) {
    errors.push("Document the follow-up plan in the comment.");
  }

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Audit payload — written to AuditLog.metadata
// ---------------------------------------------------------------------------

export interface SignoffAuditPayload {
  action: "result.signed";
  resultId: string;
  resultKind: SignoffResultKind;
  panelName: string;
  abnormalFlag: boolean;
  outcome: SignoffInput["outcome"];
  commentLength: number;
  notifyPatient: boolean;
  signedAt: string;
}

export function buildSignoffAuditPayload(args: {
  input: SignoffInput;
  item: SignoffQueueItem;
  signedAt?: Date;
}): SignoffAuditPayload {
  return {
    action: "result.signed",
    resultId: args.item.id,
    resultKind: args.item.kind,
    panelName: args.item.panelName,
    abnormalFlag: args.item.abnormalFlag,
    outcome: args.input.outcome,
    commentLength: args.input.comment.trim().length,
    notifyPatient: args.input.notifyPatient,
    signedAt: (args.signedAt ?? new Date()).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Patient notification copy
// ---------------------------------------------------------------------------

export interface PatientNotification {
  channel: "portal-message";
  subject: string;
  body: string;
}

const OUTCOME_COPY: Record<SignoffInput["outcome"], (panel: string) => string> = {
  looks_good: (panel) =>
    `Your ${panel} result has been reviewed by your clinician — everything looks normal. No action is needed; we'll see you at your next visit.`,
  needs_followup: (panel) =>
    `Your ${panel} result has been reviewed and your clinician would like to discuss next steps. We'll reach out shortly to schedule a follow-up.`,
  repeat: (panel) =>
    `Your ${panel} result has been reviewed and your clinician would like to repeat the test in a few weeks. We'll send you instructions for the repeat order.`,
  routed_to_ma: (panel) =>
    `Your ${panel} result has been reviewed. Our medical assistant will follow up with you on the next steps.`,
};

export function buildPatientNotification(
  item: SignoffQueueItem,
  input: SignoffInput,
): PatientNotification | null {
  if (!input.notifyPatient) return null;

  const baseBody = OUTCOME_COPY[input.outcome](item.panelName);
  const body = input.comment.trim().length
    ? `${baseBody}\n\nClinician note: ${input.comment.trim()}`
    : baseBody;

  return {
    channel: "portal-message",
    subject: `${item.panelName} — reviewed`,
    body,
  };
}

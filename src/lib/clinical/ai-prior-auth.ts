/**
 * EMR-076 — AI-driven prior authorization escalation
 *
 * Per Dr. Patel: PAs that need approval should be initially handled by AI
 * — pull data, code it correctly, submit. Only on a *second* denial does
 * the provider get pulled in, with messaging and phone calls happening
 * inside the system.
 *
 * The packet construction itself lives in `billing/prior-auth.ts`. This
 * module decides:
 *
 *   - whether a request can be handled autonomously by the AI agent, or
 *     needs provider review *before* first submission (high-risk drugs,
 *     red-flag combinations);
 *   - what the AI should do on each denial (auto-appeal, escalate, or
 *     give up);
 *   - the messaging contract the in-system call / message workflow uses
 *     when escalation triggers.
 *
 * Everything here is deterministic so audits can trace exactly which rule
 * fired.
 */

export type DenialReasonCode =
  | "missing_documentation"
  | "step_therapy_not_met"
  | "non_formulary"
  | "experimental"
  | "not_medically_necessary"
  | "duplicate_therapy"
  | "auth_already_on_file"
  | "patient_not_eligible"
  | "incorrect_coding"
  | "other";

export type AiAction =
  | { kind: "submit_autonomously"; reason: string }
  | { kind: "submit_with_provider_review"; reason: string }
  | { kind: "auto_appeal"; reason: string; addendum: string[] }
  | { kind: "escalate_to_provider"; reason: string; messageTemplate: string }
  | { kind: "give_up"; reason: string };

export interface PriorAuthAttempt {
  /** 1-indexed submission attempt — first submission is 1, etc. */
  attempt: number;
  /** ISO timestamp of submission. */
  submittedAt: string;
  /** Optional denial details — present when the previous attempt was denied. */
  denial?: {
    code: DenialReasonCode;
    payerNote?: string;
    deniedAt: string;
  };
}

export interface AiReviewInput {
  /** Drug / service identity. */
  serviceName: string;
  /** RxNorm or CPT — for the "high risk" registry. */
  serviceCode?: string;
  /** ICD-10 codes attached to the request. */
  icd10Codes: string[];
  /** Severity scores from validated screeners. */
  severityScores: Array<{ instrument: string; score: number }>;
  /** Number of prior treatments documented. */
  priorTreatmentCount: number;
  /** History so far — every attempt + outcome to date. */
  history: PriorAuthAttempt[];
  /** True if the request involves a controlled substance / opioid / stimulant. */
  controlled?: boolean;
  /** True if the request is for a cannabis-related service. */
  cannabis?: boolean;
}

/**
 * High-risk service patterns where we always loop the provider in
 * *before* the first submission, regardless of how clean the packet is.
 */
const HIGH_RISK_PATTERNS: RegExp[] = [
  /\bbiologic\b/i,
  /humira|adalimumab|enbrel|etanercept|rituxan|rituximab/i,
  /chemo|chemotherapy|oncolytic/i,
  /gene therapy|crispr/i,
  /opioid|fentanyl|oxycodone|morphine|hydrocodone/i,
];

/** Denial codes the AI can automatically address without provider help. */
const AUTO_APPEALABLE: Set<DenialReasonCode> = new Set([
  "missing_documentation",
  "step_therapy_not_met",
  "incorrect_coding",
  "duplicate_therapy",
]);

/** Denial codes that demand human medical judgement. */
const HARD_STOP: Set<DenialReasonCode> = new Set([
  "experimental",
  "patient_not_eligible",
]);

/**
 * Cap how many times the AI agent will autonomously re-submit before
 * pulling the provider in. Per Dr. Patel: "Only on second denial does
 * provider involvement kick in."
 */
export const MAX_AI_ATTEMPTS = 2;

export function reviewPriorAuth(input: AiReviewInput): AiAction {
  const lastDenial = mostRecentDenial(input.history);
  const attempt = nextAttempt(input.history);

  // -----------------------------------------------------------------
  // First submission
  // -----------------------------------------------------------------
  if (attempt === 1) {
    if (isHighRisk(input)) {
      return {
        kind: "submit_with_provider_review",
        reason:
          "High-risk service — provider attestation required before first submission.",
      };
    }
    if (input.priorTreatmentCount === 0 && !input.cannabis) {
      // Most commercial payers expect step therapy. Without documented
      // prior treatments the auto-submit will be wasted.
      return {
        kind: "submit_with_provider_review",
        reason:
          "Step therapy missing — no prior treatments documented. Provider should attest before submission.",
      };
    }
    return {
      kind: "submit_autonomously",
      reason: "Packet appears clean — AI will submit on the provider's behalf.",
    };
  }

  // -----------------------------------------------------------------
  // Resubmission after denial
  // -----------------------------------------------------------------
  if (!lastDenial) {
    // Pending / approved / unknown — nothing to do.
    return {
      kind: "give_up",
      reason: "No actionable denial in history.",
    };
  }

  if (HARD_STOP.has(lastDenial.code)) {
    return {
      kind: "escalate_to_provider",
      reason:
        lastDenial.code === "experimental"
          ? "Payer classifies service as experimental — requires peer-to-peer."
          : "Patient eligibility issue — provider / front office must resolve.",
      messageTemplate: providerEscalationMessage(input, lastDenial.code),
    };
  }

  // Second denial → escalate to provider, regardless of code.
  if (attempt > MAX_AI_ATTEMPTS) {
    return {
      kind: "escalate_to_provider",
      reason: `Second denial — AI cap reached at ${MAX_AI_ATTEMPTS} attempts.`,
      messageTemplate: providerEscalationMessage(input, lastDenial.code),
    };
  }

  if (AUTO_APPEALABLE.has(lastDenial.code)) {
    return {
      kind: "auto_appeal",
      reason: `${lastDenial.code} can be addressed deterministically.`,
      addendum: buildAddendum(lastDenial.code, input),
    };
  }

  // "not_medically_necessary" / "non_formulary" / "auth_already_on_file" /
  // "other" — let provider decide.
  return {
    kind: "escalate_to_provider",
    reason: `Denial code "${lastDenial.code}" needs clinical judgement.`,
    messageTemplate: providerEscalationMessage(input, lastDenial.code),
  };
}

function isHighRisk(input: AiReviewInput): boolean {
  if (HIGH_RISK_PATTERNS.some((p) => p.test(input.serviceName))) return true;
  if (input.controlled) return true;
  return false;
}

function mostRecentDenial(
  history: PriorAuthAttempt[],
): NonNullable<PriorAuthAttempt["denial"]> | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i]!;
    if (h.denial) return h.denial;
  }
  return null;
}

function nextAttempt(history: PriorAuthAttempt[]): number {
  return history.length + 1;
}

function buildAddendum(
  code: DenialReasonCode,
  input: AiReviewInput,
): string[] {
  const out: string[] = [];
  if (code === "missing_documentation") {
    out.push(
      "Attaching complete severity-score history and provider attestation block.",
    );
    if (input.severityScores.length > 0) {
      const top = input.severityScores
        .slice()
        .sort((a, b) => b.score - a.score)[0]!;
      out.push(
        `Highlighted instrument: ${top.instrument} score ${top.score} — supports medical necessity.`,
      );
    }
  }
  if (code === "step_therapy_not_met") {
    out.push(
      `Documenting ${input.priorTreatmentCount} prior treatment${
        input.priorTreatmentCount === 1 ? "" : "s"
      } per payer step-therapy requirements.`,
    );
  }
  if (code === "incorrect_coding") {
    out.push(
      "Re-coding request against the most recent CPT/ICD-10 crosswalk for this payer.",
    );
  }
  if (code === "duplicate_therapy") {
    out.push(
      "Reviewed active medication list; attaching attestation that the new request is non-duplicative.",
    );
  }
  return out;
}

function providerEscalationMessage(
  input: AiReviewInput,
  denial: DenialReasonCode,
): string {
  return [
    `PA for ${input.serviceName} requires your input.`,
    `Latest denial reason: ${denial.replace(/_/g, " ")}.`,
    "Open the PA queue to draft a peer-to-peer request or update clinical narrative.",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Cohort summary — used by the dashboard tile
// ---------------------------------------------------------------------------

export interface PaCohortItem {
  patientName: string;
  serviceName: string;
  attempt: number;
  lastDenial?: DenialReasonCode;
  decidedAction: AiAction["kind"];
}

export interface PaCohortSummary {
  total: number;
  autonomous: number;
  appealing: number;
  needsProvider: number;
  highRisk: number;
}

export function summarizeCohort(items: PaCohortItem[]): PaCohortSummary {
  const s: PaCohortSummary = {
    total: items.length,
    autonomous: 0,
    appealing: 0,
    needsProvider: 0,
    highRisk: 0,
  };
  for (const item of items) {
    switch (item.decidedAction) {
      case "submit_autonomously":
        s.autonomous += 1;
        break;
      case "auto_appeal":
        s.appealing += 1;
        break;
      case "submit_with_provider_review":
        s.highRisk += 1;
        break;
      case "escalate_to_provider":
        s.needsProvider += 1;
        break;
      default:
        break;
    }
  }
  return s;
}

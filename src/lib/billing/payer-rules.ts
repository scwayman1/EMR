/**
 * Payer Rules Registry
 * --------------------
 * Single source of truth for per-payer billing behavior. Every billing
 * agent that needs to answer questions like
 *   - "When does this claim go stale?"
 *   - "Does this payer cover F12 services?"
 *   - "What frequency code does this payer accept on corrected claims?"
 *   - "Is this a commercial or government payer?"
 *   - "Does this payer honor modifier 25 on Z71?"
 *   - "How long do we wait for a 277CA before flagging the claim stale?"
 * routes through this registry instead of hardcoding substrings.
 *
 * The registry is intentionally pure + code-resident for day-1 launch.
 * A future ticket (EMR-218) migrates it into the DB so operations can
 * edit rules without a deploy.
 */

export type PayerClass = "commercial" | "government" | "medicare_advantage" | "medicaid_managed" | "workers_comp" | "self_pay" | "other";

export interface PayerRule {
  /** Stable id — use the EDI payer id where we have it, otherwise a slug. */
  id: string;
  /** Display name used for substring matching against Claim.payerName. */
  displayName: string;
  /** Aliases seen on incoming coverage records (lowercased substrings). */
  aliases: string[];
  class: PayerClass;
  /** Timely filing window in days from the date of service. Measured
   * against original claim submission, not correction. */
  timelyFilingDays: number;
  /** Timely filing window for corrected claims (frequency 7/8) — usually
   * shorter than the original window and counted from the original
   * denial/ERA date, not DOS. */
  correctedTimelyFilingDays: number;
  /** Appeal level 1 / 2 / external-review deadlines in days from the
   * denial date. */
  appealDeadlines: {
    level1Days: number;
    level2Days: number;
    externalReviewDays: number | null;
  };
  /** Payer's expected window between 837P submission and 277CA
   * acknowledgment. Claims past this without a response are "stale"
   * and get a stale-claim ticket. */
  ackSlaDays: number;
  /** How long until an unadjudicated accepted claim is considered
   * stalled — roughly the payer's processing SLA. */
  adjudicationSlaDays: number;
  /** Eligibility cache TTL in hours. Must agree with ttlForPayer() in
   * the eligibility-benefits agent; duplicated here so dependent
   * billing code reads a single source. */
  eligibilityTtlHours: number;
  /** Frequency code the payer expects on corrected claims — almost
   * always "7" but a handful of payers require "6" or a full void+rebill
   * (8 then 1). */
  correctedClaimFrequency: "7" | "6" | "8_then_1";
  /** Does this payer honor modifier 25 on a same-day Z71.x + E/M pair?
   * When false, `scrubCannabisRules` will recommend dropping the Z71
   * line rather than billing it with mod-25. */
  honorsMod25OnZ71: boolean;
  /** Does this payer require prior authorization for F12.* or Z71.*
   * services? Drives the `prior-auth-cannabis` denial pattern and the
   * PA gate in claim construction. */
  requiresPriorAuthForCannabis: boolean;
  /** True when the payer's benefit booklet explicitly excludes cannabis
   * services. Drives `cannabis-not-covered-policy` → self-pay routing
   * instead of appeal. */
  excludesCannabis: boolean;
  /** Optional payer policy reference to cite in appeal letters. */
  cannabisPolicyCitation: string | null;
  /** Accepts electronic 837P submission. When false, the claim must be
   * dropped to paper/fax by the operator — the fleet flags it up front
   * rather than pretending to submit. */
  supportsElectronicSubmission: boolean;
  /** Claim attachment mechanism for supporting docs (PWK / fax / mail /
   * portal). Used by the appeals agent when ranking delivery channels. */
  attachmentChannels: Array<"pwk_electronic" | "fax" | "mail" | "portal">;
}

// ---------------------------------------------------------------------------
// Registry — seed rules
// ---------------------------------------------------------------------------

export const PAYER_RULES: PayerRule[] = [
  // ─ Commercial ──────────────────────────────────────────────────
  {
    id: "aetna",
    displayName: "Aetna",
    aliases: ["aetna"],
    class: "commercial",
    timelyFilingDays: 180,
    correctedTimelyFilingDays: 180,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 2,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "Aetna Clinical Policy Bulletin 0527 (Cannabinoids)",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "portal"],
  },
  {
    id: "uhc",
    displayName: "UnitedHealthcare",
    aliases: ["uhc", "united healthcare", "united health", "unitedhealth"],
    class: "commercial",
    timelyFilingDays: 90,
    correctedTimelyFilingDays: 180,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 2,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: false,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "UHC Medical Policy 2023T0543 (Medical Marijuana)",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "portal"],
  },
  {
    id: "cigna",
    displayName: "Cigna",
    aliases: ["cigna"],
    class: "commercial",
    timelyFilingDays: 90,
    correctedTimelyFilingDays: 180,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 2,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "Cigna Coverage Policy 0519 (Medical Cannabis)",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax"],
  },
  {
    id: "bcbs",
    displayName: "Blue Cross Blue Shield",
    aliases: ["bcbs", "blue cross", "blue shield", "bluecross", "blueshield", "anthem bc"],
    class: "commercial",
    timelyFilingDays: 180,
    correctedTimelyFilingDays: 180,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 2,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "BCBS Medical Policy MED.00163 (Cannabis & Cannabinoids)",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "mail", "portal"],
  },
  {
    id: "humana",
    displayName: "Humana",
    aliases: ["humana"],
    class: "commercial",
    timelyFilingDays: 180,
    correctedTimelyFilingDays: 180,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 2,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "Humana Medical Coverage Policy — Cannabis",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "portal"],
  },
  {
    id: "anthem",
    displayName: "Anthem",
    aliases: ["anthem"],
    class: "commercial",
    timelyFilingDays: 90,
    correctedTimelyFilingDays: 365,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 2,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "Anthem Medical Policy MED.00163",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "portal"],
  },
  {
    id: "kaiser",
    displayName: "Kaiser Permanente",
    aliases: ["kaiser"],
    class: "commercial",
    timelyFilingDays: 365,
    correctedTimelyFilingDays: 365,
    appealDeadlines: { level1Days: 180, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 3,
    adjudicationSlaDays: 45,
    eligibilityTtlHours: 4,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: true,
    cannabisPolicyCitation: "Kaiser members: cannabis services excluded; route to self-pay",
    supportsElectronicSubmission: true,
    attachmentChannels: ["portal", "fax"],
  },

  // ─ Government ─────────────────────────────────────────────────
  {
    id: "medicare",
    displayName: "Medicare",
    aliases: ["medicare", "cms", "palmetto", "novitas", "noridian", "wps"],
    class: "government",
    timelyFilingDays: 365,
    correctedTimelyFilingDays: 365,
    appealDeadlines: { level1Days: 120, level2Days: 180, externalReviewDays: 60 },
    ackSlaDays: 3,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 12,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: false,
    excludesCannabis: true,
    cannabisPolicyCitation: "Cannabis not covered under federal Medicare (Schedule I)",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "mail"],
  },
  {
    id: "medicaid",
    displayName: "Medicaid",
    aliases: ["medicaid", "medi-cal", "medical", "masshealth", "amerigroup", "molina"],
    class: "medicaid_managed",
    timelyFilingDays: 365,
    correctedTimelyFilingDays: 365,
    appealDeadlines: { level1Days: 60, level2Days: 60, externalReviewDays: 120 },
    ackSlaDays: 3,
    adjudicationSlaDays: 45,
    eligibilityTtlHours: 12,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: true,
    excludesCannabis: false,
    cannabisPolicyCitation: "State Medicaid cannabis coverage varies — verify state MCO policy",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "mail", "portal"],
  },
  {
    id: "tricare",
    displayName: "TRICARE",
    aliases: ["tricare", "champva", "va "],
    class: "government",
    timelyFilingDays: 365,
    correctedTimelyFilingDays: 365,
    appealDeadlines: { level1Days: 90, level2Days: 60, externalReviewDays: 60 },
    ackSlaDays: 3,
    adjudicationSlaDays: 30,
    eligibilityTtlHours: 12,
    correctedClaimFrequency: "7",
    honorsMod25OnZ71: true,
    requiresPriorAuthForCannabis: false,
    excludesCannabis: true,
    cannabisPolicyCitation: "TRICARE follows federal law — cannabis not covered",
    supportsElectronicSubmission: true,
    attachmentChannels: ["pwk_electronic", "fax", "mail"],
  },
];

/** Conservative defaults used when no registry entry matches. We err on the
 * tight side for timely filing (90 days) so the fleet escalates borderline
 * claims instead of silently letting them run out. */
export const DEFAULT_PAYER_RULE: PayerRule = {
  id: "__default__",
  displayName: "Unknown payer (defaults)",
  aliases: [],
  class: "other",
  timelyFilingDays: 90,
  correctedTimelyFilingDays: 90,
  appealDeadlines: { level1Days: 60, level2Days: 60, externalReviewDays: null },
  ackSlaDays: 3,
  adjudicationSlaDays: 45,
  eligibilityTtlHours: 6,
  correctedClaimFrequency: "7",
  honorsMod25OnZ71: true,
  requiresPriorAuthForCannabis: true,
  excludesCannabis: false,
  cannabisPolicyCitation: null,
  supportsElectronicSubmission: true,
  attachmentChannels: ["fax", "mail"],
};

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

/**
 * Resolve a PayerRule from whatever identifier we have — payer id, alias,
 * or display name. Always returns something (falls back to DEFAULT_PAYER_RULE)
 * so callers never have to nil-check.
 */
export function resolvePayerRule(input: {
  payerId?: string | null;
  payerName?: string | null;
}): PayerRule {
  const id = (input.payerId ?? "").toLowerCase().trim();
  if (id.length > 0) {
    const byId = PAYER_RULES.find((r) => r.id === id);
    if (byId) return byId;
  }
  const name = (input.payerName ?? "").toLowerCase().trim();
  if (name.length > 0) {
    for (const rule of PAYER_RULES) {
      if (rule.aliases.some((a) => name.includes(a))) return rule;
      if (name.includes(rule.displayName.toLowerCase())) return rule;
    }
  }
  return DEFAULT_PAYER_RULE;
}

/**
 * Compute the timely-filing deadline for a claim given its service date
 * and payer. Exposed as a standalone helper so both claim construction
 * (writes the deadline) and the scrub engine (checks against it) use
 * identical logic.
 */
export function computeTimelyFilingDeadline(args: {
  serviceDate: Date;
  payerId?: string | null;
  payerName?: string | null;
  /** true for corrected claims (frequency 7/8) so we use the shorter window */
  corrected?: boolean;
}): Date {
  const rule = resolvePayerRule({ payerId: args.payerId, payerName: args.payerName });
  const days = args.corrected ? rule.correctedTimelyFilingDays : rule.timelyFilingDays;
  return new Date(args.serviceDate.getTime() + days * 86_400_000);
}

/**
 * Eligibility cache TTL in milliseconds. Mirrors ttlForPayer() in the
 * eligibility-benefits agent but sources from the same registry so the
 * two can never drift.
 */
export function eligibilityTtlMs(payerName: string | null | undefined): number {
  const rule = resolvePayerRule({ payerName });
  return rule.eligibilityTtlHours * 3600 * 1000;
}

/** Convenience: is this payer commercial? Used by several scrub rules. */
export function isCommercialPayer(payerName: string | null | undefined): boolean {
  const rule = resolvePayerRule({ payerName });
  return rule.class === "commercial";
}

/** Convenience: is this payer government? */
export function isGovernmentPayer(payerName: string | null | undefined): boolean {
  const rule = resolvePayerRule({ payerName });
  return rule.class === "government" || rule.class === "medicaid_managed";
}

/**
 * Route decision: given a claim with F12/Z71 diagnoses, should we bill
 * insurance or drop to self-pay up front? Keeps the "don't burn timely
 * filing on a non-covered appeal" invariant in one place.
 */
export function shouldRouteCannabisToSelfPay(args: {
  payerId?: string | null;
  payerName?: string | null;
  hasCannabisDx: boolean;
}): { selfPay: boolean; reason: string | null } {
  if (!args.hasCannabisDx) return { selfPay: false, reason: null };
  const rule = resolvePayerRule(args);
  if (rule.excludesCannabis) {
    return {
      selfPay: true,
      reason: `${rule.displayName} excludes cannabis services per ${rule.cannabisPolicyCitation ?? "payer policy"}. Route to self-pay rather than burn timely filing on an appealable-zero denial.`,
    };
  }
  return { selfPay: false, reason: null };
}

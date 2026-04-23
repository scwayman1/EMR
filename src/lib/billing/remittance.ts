/**
 * Remittance Advice (ERA / 835) taxonomy
 * --------------------------------------
 * Single source of truth for the semantics of CARC (Claim Adjustment
 * Reason Codes), RARC (Remittance Advice Remark Codes), and group
 * codes that appear on every 835/EOB.
 *
 * Scope:
 *   - Classify each group code (CO / PR / OA / PI) correctly so
 *     contractual writeoffs don't get booked as patient responsibility
 *     and patient copays don't get booked as denials.
 *   - Split PR (patient responsibility) into its sub-buckets
 *     (deductible / coinsurance / copay / non-covered) using the CARC
 *     code, so patient statements read accurately.
 *   - Flag takebacks / reversals (negative paid amounts + group WO)
 *     so reconciliation can correctly reverse prior postings.
 *   - Catch "contractual adjustment that SHOULD have been paid" cases
 *     (253 sequestration, 94 processed in excess, 237 legislated
 *     adjustment) that look like CO but are actually recoverable.
 */

export type GroupCode = "CO" | "PR" | "OA" | "PI" | "CR" | "WO";

/** What a patient-responsibility adjustment actually represents. Drives
 * how the line rolls up onto the statement ("deductible", "coinsurance",
 * "copay", "not covered"). */
export type PatientRespBucket =
  | "deductible"
  | "coinsurance"
  | "copay"
  | "non_covered"
  | "prior_payer_paid"
  | "other";

/**
 * Group code semantics. Extracted to a pure table so every billing agent
 * agrees on (a) who owes the money and (b) whether the line is
 * recoverable by the practice.
 */
export const GROUP_CODE_SEMANTICS: Record<
  GroupCode,
  {
    label: string;
    whoOwes: "payer" | "patient" | "practice" | "prior_payer" | "unknown";
    /** Is the money still collectible (from someone)? CO (contractual)
     * is almost never recoverable; PR always is (from the patient). */
    collectible: boolean;
    description: string;
  }
> = {
  CO: {
    label: "Contractual Obligation",
    whoOwes: "practice",
    collectible: false,
    description:
      "Provider contractual adjustment per payer agreement. Not billable to the patient. Not recoverable.",
  },
  PR: {
    label: "Patient Responsibility",
    whoOwes: "patient",
    collectible: true,
    description:
      "Amount the patient owes — deductible, coinsurance, copay, or non-covered service.",
  },
  OA: {
    label: "Other Adjustments",
    whoOwes: "unknown",
    collectible: false,
    description:
      "Catch-all for payer-initiated adjustments that don't fit CO or PR. Requires case-by-case review.",
  },
  PI: {
    label: "Payer-Initiated Reductions",
    whoOwes: "practice",
    collectible: false,
    description:
      "Payer reduced payment based on their internal rules. Usually not appealable without contract language.",
  },
  CR: {
    label: "Corrections and Reversals",
    whoOwes: "unknown",
    collectible: true,
    description:
      "Line-level correction or reversal. Treat as a takeback against the prior posting.",
  },
  WO: {
    label: "Write-Off",
    whoOwes: "practice",
    collectible: false,
    description:
      "Payer issued a write-off. Typically a negative paid amount reversing a prior payment.",
  },
};

/**
 * CARC semantics — taxonomy of the codes we actually see. Used to
 * decide PR sub-bucket, whether the line is recoverable under CO, and
 * to feed the denial-resolution routing.
 */
export interface CarcEntry {
  code: string;
  label: string;
  /** When this CARC appears under group PR, what sub-bucket does it
   * represent on the patient statement? Null if this CARC is not a PR
   * sub-type. */
  prBucket: PatientRespBucket | null;
  /** When the line is actually recoverable even though it looks like a
   * CO contractual. */
  recoverableUnderCo: boolean;
  /** Description for billers and prompts. */
  description: string;
}

export const CARC_TAXONOMY: Record<string, CarcEntry> = {
  // Patient responsibility sub-codes
  "1": {
    code: "1",
    label: "Deductible amount",
    prBucket: "deductible",
    recoverableUnderCo: false,
    description: "Patient has not met deductible — goes on patient statement.",
  },
  "2": {
    code: "2",
    label: "Coinsurance amount",
    prBucket: "coinsurance",
    recoverableUnderCo: false,
    description: "Patient's coinsurance share.",
  },
  "3": {
    code: "3",
    label: "Copayment amount",
    prBucket: "copay",
    recoverableUnderCo: false,
    description: "Fixed copay per visit.",
  },
  "96": {
    code: "96",
    label: "Non-covered charges",
    prBucket: "non_covered",
    recoverableUnderCo: false,
    description: "Service not covered by plan. Under PR = patient bills; under CO = contractual.",
  },
  "23": {
    code: "23",
    label: "Prior payer impact",
    prBucket: "prior_payer_paid",
    recoverableUnderCo: false,
    description: "Prior payer's adjudicated amount — secondary claim use.",
  },

  // Contractual / normally-not-recoverable
  "45": {
    code: "45",
    label: "Charge exceeds fee schedule",
    prBucket: null,
    recoverableUnderCo: false,
    description: "Standard contractual write-down. Not recoverable; post as contractual.",
  },
  "253": {
    code: "253",
    label: "Sequestration — federal payment reduction",
    prBucket: null,
    recoverableUnderCo: false,
    description: "Medicare sequestration adjustment. Never recoverable, but track separately for reporting.",
  },
  "94": {
    code: "94",
    label: "Processed in excess of charges",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Payer claims we billed less than paid — rare. Verify amounts; usually an EOB error.",
  },
  "237": {
    code: "237",
    label: "Legislated/regulatory penalty",
    prBucket: null,
    recoverableUnderCo: false,
    description: "Regulatory penalty reduction. Document and track; generally not appealable.",
  },

  // Recoverable / fixable
  "4": {
    code: "4",
    label: "Modifier inconsistent with procedure",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Modifier is missing or wrong for the procedure. Often fixable with a corrected claim.",
  },
  "16": {
    code: "16",
    label: "Claim/service lacks information",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Attach missing information and resubmit. Check the accompanying RARC for what's missing.",
  },
  "18": {
    code: "18",
    label: "Duplicate claim/service",
    prBucket: null,
    recoverableUnderCo: false,
    description: "Payer thinks this is a duplicate. Verify against ERA history — could be true dup or a provider-level confusion.",
  },
  "29": {
    code: "29",
    label: "Past timely filing",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Filed past the payer's window. Appeal only with proof of timely intent.",
  },
  "50": {
    code: "50",
    label: "Non-covered — not medically necessary",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Medical necessity denial. Appealable with supporting clinical documentation.",
  },
  "97": {
    code: "97",
    label: "Benefit included in another service",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Bundling. If modifier 25/59 correctly separates the service, appealable.",
  },
  "109": {
    code: "109",
    label: "Not covered by this payer — bill another",
    prBucket: null,
    recoverableUnderCo: true,
    description: "Wrong payer billed. Resubmit to the correct carrier (COB issue).",
  },
  "197": {
    code: "197",
    label: "Precertification/authorization absent",
    prBucket: null,
    recoverableUnderCo: true,
    description: "PA required and missing. Obtain PA or cite existing auth and resubmit.",
  },
};

// ---------------------------------------------------------------------------
// Interpreters
// ---------------------------------------------------------------------------

/**
 * Classify a single adjustment by group + CARC. Returns the semantics
 * the adjudication agent should apply — who owes, what bucket, whether
 * recoverable.
 */
export function classifyAdjustment(args: {
  groupCode: string;
  carcCode: string | null | undefined;
  amountCents: number;
}): {
  group: GroupCode | "UNKNOWN";
  label: string;
  whoOwes: "payer" | "patient" | "practice" | "prior_payer" | "unknown";
  collectible: boolean;
  /** For group=PR, the sub-bucket (deductible / coinsurance / copay /
   * non_covered). Null for every other group. */
  prBucket: PatientRespBucket | null;
  /** A signed amount is a takeback/reversal of a prior posting. */
  isTakeback: boolean;
  /** Is this CO/OA/PI amount actually recoverable via correction or appeal? */
  recoverable: boolean;
  description: string;
} {
  const group = (args.groupCode as GroupCode) in GROUP_CODE_SEMANTICS
    ? (args.groupCode as GroupCode)
    : ("UNKNOWN" as const);
  const groupSem = group !== "UNKNOWN" ? GROUP_CODE_SEMANTICS[group] : null;
  const carc = args.carcCode ? CARC_TAXONOMY[args.carcCode] : null;
  const isTakeback = args.amountCents < 0;

  // PR sub-bucket — only valid under group PR
  const prBucket = group === "PR" ? (carc?.prBucket ?? "other") : null;

  // Recoverability: CO/PI/OA are usually not recoverable, but a handful
  // of CARCs (4, 16, 50, 97, 109, 197) are appealable/correctable even
  // under CO.
  const recoverable =
    group === "PR"
      ? true // patient can always be billed
      : group === "CR" || group === "WO"
        ? true
        : carc?.recoverableUnderCo ?? false;

  return {
    group,
    label: carc?.label ?? groupSem?.label ?? "Unclassified adjustment",
    whoOwes: groupSem?.whoOwes ?? "unknown",
    collectible: groupSem?.collectible ?? false,
    prBucket,
    isTakeback,
    recoverable,
    description: carc?.description ?? groupSem?.description ?? "Unknown group code.",
  };
}

/**
 * Given a 835 line with possibly-stacked CARCs, split the patient
 * responsibility into the three sub-buckets. Input is an array of
 * { groupCode, carcCode, amountCents } — output sums each bucket.
 *
 * Example input: [
 *   { groupCode: "PR", carcCode: "1", amountCents: 15000 },  // $150 deductible
 *   { groupCode: "PR", carcCode: "2", amountCents: 4000 },   // $40 coinsurance
 *   { groupCode: "CO", carcCode: "45", amountCents: 8000 },  // $80 contractual
 * ]
 * Output: { deductibleCents: 15000, coinsuranceCents: 4000, copayCents: 0,
 *           nonCoveredCents: 0, otherPrCents: 0, contractualCents: 8000,
 *           unknownCents: 0, takebackCents: 0, totalPrCents: 19000 }
 */
export interface PatientRespSplit {
  deductibleCents: number;
  coinsuranceCents: number;
  copayCents: number;
  nonCoveredCents: number;
  otherPrCents: number;
  totalPrCents: number;
  contractualCents: number;
  recoverableCoCents: number;
  unknownCents: number;
  takebackCents: number;
}

export function splitPatientResponsibility(
  adjustments: Array<{
    groupCode: string;
    carcCode?: string | null;
    amountCents: number;
  }>,
): PatientRespSplit {
  const out: PatientRespSplit = {
    deductibleCents: 0,
    coinsuranceCents: 0,
    copayCents: 0,
    nonCoveredCents: 0,
    otherPrCents: 0,
    totalPrCents: 0,
    contractualCents: 0,
    recoverableCoCents: 0,
    unknownCents: 0,
    takebackCents: 0,
  };
  for (const a of adjustments) {
    const cls = classifyAdjustment({
      groupCode: a.groupCode,
      carcCode: a.carcCode ?? null,
      amountCents: a.amountCents,
    });
    if (cls.isTakeback) {
      out.takebackCents += Math.abs(a.amountCents);
      continue;
    }
    if (cls.group === "PR") {
      out.totalPrCents += a.amountCents;
      switch (cls.prBucket) {
        case "deductible":
          out.deductibleCents += a.amountCents;
          break;
        case "coinsurance":
          out.coinsuranceCents += a.amountCents;
          break;
        case "copay":
          out.copayCents += a.amountCents;
          break;
        case "non_covered":
          out.nonCoveredCents += a.amountCents;
          break;
        default:
          out.otherPrCents += a.amountCents;
      }
    } else if (cls.group === "CO") {
      if (cls.recoverable) {
        out.recoverableCoCents += a.amountCents;
      } else {
        out.contractualCents += a.amountCents;
      }
    } else if (cls.group === "OA" || cls.group === "PI") {
      if (cls.recoverable) {
        out.recoverableCoCents += a.amountCents;
      } else {
        out.unknownCents += a.amountCents;
      }
    } else {
      out.unknownCents += a.amountCents;
    }
  }
  return out;
}

/**
 * Balance check: an 835 should satisfy
 *   billed = paid + sum(all adjustments)
 * with penny-tolerance. Returns null when balanced, or a human-readable
 * variance string when it isn't.
 */
export function reconcileClaimTotals(args: {
  billedCents: number;
  paidCents: number;
  adjustmentsCents: number;
  /** Allow up to this much variance in cents before flagging. Default 2¢. */
  toleranceCents?: number;
}): { balanced: true } | { balanced: false; varianceCents: number; message: string } {
  const tolerance = args.toleranceCents ?? 2;
  const sum = args.paidCents + args.adjustmentsCents;
  const variance = args.billedCents - sum;
  if (Math.abs(variance) <= tolerance) return { balanced: true };
  return {
    balanced: false,
    varianceCents: variance,
    message: `Claim totals do not balance: billed=${(args.billedCents / 100).toFixed(2)}, paid=${(args.paidCents / 100).toFixed(2)}, adjustments=${(args.adjustmentsCents / 100).toFixed(2)}. Variance ${(variance / 100).toFixed(2)} (tolerance ${(tolerance / 100).toFixed(2)}).`,
  };
}

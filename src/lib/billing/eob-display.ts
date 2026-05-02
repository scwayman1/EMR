/**
 * EOB display layer — EMR-115
 * --------------------------------------------------------------
 * `eob.ts` parses 835 ERAs and free-text EOBs into a normalized
 * `ParsedEob`. This file is the *display* layer — view-models
 * tailored to two audiences:
 *
 *   - Patient portal billing tab — emphasizes "what you owe and
 *     why, in plain language", with the AI-generated summary.
 *
 *   - Doctor's chart claims drawer — emphasizes the clinical /
 *     coding view: which CPT lines paid, which were denied, what
 *     CARC/RARC fired, what to do next.
 *
 *  Both views read the SAME underlying ParsedEob so the two
 *  surfaces never disagree about the dollar amounts.
 *
 *  This module is pure (no Prisma / no React). The page-side
 *  components import these view-models and render them.
 */

import type { ParsedEob, EobLine } from "./eob";
import { topPatientRespReasons } from "./eob";
import type { GroupCode, PatientRespBucket } from "./remittance";

// ---------------------------------------------------------------------------
// Patient view-model
// ---------------------------------------------------------------------------

export type PatientResponsibilityCategory =
  | "deductible"
  | "coinsurance"
  | "copay"
  | "non_covered"
  | "other";

export interface PatientEobView {
  payerName: string;
  serviceDate: string;
  /** Big number at the top of the screen. */
  youOweCents: number;
  /** Plain-language summary text the agent generated, OR a
   *  deterministic fallback when no summary was generated. */
  plainLanguageSummary: string;
  /** Three-bucket breakdown for the "Why you owe this" callout. */
  breakdown: Array<{
    category: PatientResponsibilityCategory;
    label: string;
    amountCents: number;
    explanation: string;
  }>;
  /** How insurance handled the bill — used in the "Insurance summary"
   *  card below the hero balance. */
  insuranceSummary: {
    billedCents: number;
    discountedCents: number; // contractual adjustment
    paidByInsuranceCents: number;
    youOweCents: number;
  };
  /** Visible-but-collapsed line items. */
  lineItems: Array<{
    cptCode: string;
    description: string;
    youOweCents: number;
    paidByInsuranceCents: number;
    statusLabel: string;
  }>;
  fromFreeText: boolean;
}

/** Render the EOB as the patient should see it. The summary text
 *  must come from a deterministic prompt+LLM call upstream — this
 *  function chooses a fallback when none is supplied so the page
 *  never breaks on missing AI output. */
export function buildPatientView(args: {
  eob: ParsedEob;
  /** AI-generated plain-language summary; pass undefined to use the
   *  deterministic fallback. */
  aiSummary?: string;
}): PatientEobView {
  const eob = args.eob;
  const summary =
    args.aiSummary?.trim() ||
    fallbackPatientSummary(eob);
  return {
    payerName: eob.payerName,
    serviceDate: eob.paidDate,
    youOweCents: eob.totals.patientRespCents,
    plainLanguageSummary: summary,
    breakdown: buildPatientBreakdown(eob),
    insuranceSummary: {
      billedCents: eob.totals.billedCents,
      discountedCents: eob.totals.contractualAdjustmentCents,
      paidByInsuranceCents: eob.totals.paidCents,
      youOweCents: eob.totals.patientRespCents,
    },
    lineItems: eob.lines.map((line) => ({
      cptCode: line.cptCode,
      description: line.description,
      youOweCents: sumPatientResp(line),
      paidByInsuranceCents: line.paidCents,
      statusLabel: lineStatusLabel(line),
    })),
    fromFreeText: eob.fromFreeText,
  };
}

function buildPatientBreakdown(eob: ParsedEob): PatientEobView["breakdown"] {
  const top = topPatientRespReasons(eob, 5);
  const byBucket = new Map<PatientResponsibilityCategory, { amount: number; carcs: string[] }>();
  for (const r of top) {
    const cat = mapBucketToCategory(r.bucket);
    const cur = byBucket.get(cat) ?? { amount: 0, carcs: [] };
    cur.amount += r.amountCents;
    cur.carcs.push(r.carc);
    byBucket.set(cat, cur);
  }
  return Array.from(byBucket.entries())
    .filter(([, v]) => v.amount > 0)
    .map(([category, v]) => ({
      category,
      label: PATIENT_CATEGORY_LABELS[category],
      amountCents: v.amount,
      explanation: PATIENT_CATEGORY_EXPLANATIONS[category],
    }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

const PATIENT_CATEGORY_LABELS: Record<PatientResponsibilityCategory, string> = {
  deductible: "Deductible",
  coinsurance: "Coinsurance",
  copay: "Copay",
  non_covered: "Not covered by your plan",
  other: "Other",
};

const PATIENT_CATEGORY_EXPLANATIONS: Record<PatientResponsibilityCategory, string> = {
  deductible:
    "You haven't met your yearly deductible yet — once you do, your insurance will cover more of each visit.",
  coinsurance:
    "After your deductible, your plan pays a percentage and you pay the rest. This is your share.",
  copay:
    "A flat fee your plan asks you to pay for this kind of visit, no matter what your deductible is.",
  non_covered:
    "Your plan didn't cover this service. We can help you understand why and what your options are.",
  other:
    "An amount your plan assigned to you. Tap \"Questions?\" if anything looks off and we'll explain.",
};

function mapBucketToCategory(bucket: PatientRespBucket | "other"): PatientResponsibilityCategory {
  switch (bucket) {
    case "deductible":
      return "deductible";
    case "coinsurance":
      return "coinsurance";
    case "copay":
      return "copay";
    case "non_covered":
      return "non_covered";
    case "prior_payer_paid":
    case "other":
    default:
      return "other";
  }
}

function fallbackPatientSummary(eob: ParsedEob): string {
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  if (eob.totals.patientRespCents === 0) {
    return `${eob.payerName} processed your claim and the full balance is covered. You owe nothing for this visit.`;
  }
  return `${eob.payerName} processed your claim from ${eob.paidDate}. They covered ${fmt(eob.totals.paidCents)} and applied ${fmt(eob.totals.contractualAdjustmentCents)} as a plan discount. Your responsibility is ${fmt(eob.totals.patientRespCents)}. Tap any line below for the breakdown — and message billing if anything is unclear.`;
}

function sumPatientResp(line: EobLine): number {
  return Object.values(line.patientRespByBucket).reduce<number>((a, n) => a + (n ?? 0), 0);
}

function lineStatusLabel(line: EobLine): string {
  if (line.paidCents > 0 && sumPatientResp(line) === 0) return "Paid in full";
  if (line.paidCents === 0 && sumPatientResp(line) > 0) return "Your responsibility";
  if (line.paidCents > 0 && sumPatientResp(line) > 0) return "Partially paid";
  return "Adjusted";
}

// ---------------------------------------------------------------------------
// Provider / chart view-model
// ---------------------------------------------------------------------------

export interface ProviderEobView {
  payerName: string;
  payerClaimNumber: string;
  paidDate: string;
  checkOrEftNumber: string | null;
  totals: ParsedEob["totals"];
  lines: Array<{
    cptCode: string;
    description: string;
    billedCents: number;
    allowedCents: number;
    paidCents: number;
    contractualAdjustmentCents: number;
    patientRespCents: number;
    /** All non-zero adjustments for this line; surfaces CARC/RARC for
     *  the denial-triage reviewer. */
    adjustments: Array<{
      groupCode: GroupCode;
      carc: string;
      rarc: string | null;
      amountCents: number;
      groupCodeMeaning: string;
    }>;
    /** Single-glance verdict for the line: paid / denied / adjusted /
     *  partial. */
    verdict: LineVerdict;
  }>;
  /** Top-level alerts the chart drawer surfaces in red. */
  alerts: Array<{ severity: "info" | "warn" | "error"; message: string }>;
  unmatched: ParsedEob["unmatchedLines"];
}

export type LineVerdict = "paid_in_full" | "partial_payment" | "denied" | "adjusted_only";

const GROUP_CODE_MEANING: Record<GroupCode, string> = {
  PR: "Patient responsibility",
  CO: "Contractual obligation",
  OA: "Other adjustment",
  PI: "Payer-initiated reduction",
  CR: "Correction or reversal",
  WO: "Withholding",
};

export function buildProviderView(eob: ParsedEob): ProviderEobView {
  const lines = eob.lines.map((line) => {
    const sumByGroup = (g: GroupCode): number =>
      line.reasonCodes.filter((r) => r.groupCode === g).reduce((s, r) => s + r.amountCents, 0);
    const co = sumByGroup("CO");
    const pr = sumByGroup("PR");
    return {
      cptCode: line.cptCode,
      description: line.description,
      billedCents: line.billedCents,
      allowedCents: line.allowedCents,
      paidCents: line.paidCents,
      contractualAdjustmentCents: co,
      patientRespCents: pr,
      adjustments: line.reasonCodes.map((r) => ({
        groupCode: r.groupCode,
        carc: r.carc,
        rarc: r.rarc ?? null,
        amountCents: r.amountCents,
        groupCodeMeaning: GROUP_CODE_MEANING[r.groupCode],
      })),
      verdict: lineVerdict(line),
    };
  });
  return {
    payerName: eob.payerName,
    payerClaimNumber: eob.payerClaimNumber,
    paidDate: eob.paidDate,
    checkOrEftNumber: eob.checkOrEftNumber,
    totals: eob.totals,
    lines,
    alerts: buildAlerts(eob),
    unmatched: eob.unmatchedLines,
  };
}

function lineVerdict(line: EobLine): LineVerdict {
  if (line.paidCents === line.billedCents && line.paidCents > 0) return "paid_in_full";
  if (line.paidCents > 0 && line.paidCents < line.billedCents) return "partial_payment";
  if (line.paidCents === 0 && line.billedCents > 0) {
    // Distinguish hard denial from contractual zero-allowed.
    const hasPr = line.reasonCodes.some((r) => r.groupCode === "PR" && r.amountCents > 0);
    return hasPr ? "denied" : "adjusted_only";
  }
  return "adjusted_only";
}

function buildAlerts(eob: ParsedEob): ProviderEobView["alerts"] {
  const alerts: ProviderEobView["alerts"] = [];
  if (eob.fromFreeText) {
    alerts.push({
      severity: "warn",
      message: "Parsed from free-text — line items require human review before posting.",
    });
  }
  if (!eob.claimId) {
    alerts.push({
      severity: "warn",
      message: "EOB not yet matched to a claim. Use the payer claim number to match before posting.",
    });
  }
  for (const line of eob.lines) {
    const denied = line.reasonCodes.some(
      (r) => r.groupCode === "CO" && (r.carc === "29" || r.carc === "16" || r.carc === "11"),
    );
    if (denied) {
      alerts.push({
        severity: "error",
        message: `Line ${line.cptCode} denied — ${denialAlertReason(line)}`,
      });
    }
  }
  if (eob.totals.paidCents === 0 && eob.totals.billedCents > 0) {
    alerts.push({
      severity: "error",
      message: "Zero payment on the entire claim — triage as denial.",
    });
  }
  return alerts;
}

function denialAlertReason(line: EobLine): string {
  const top = line.reasonCodes
    .filter((r) => r.groupCode === "CO")
    .sort((a, b) => b.amountCents - a.amountCents)[0];
  if (!top) return "see remit codes";
  return `CARC ${top.carc}${top.rarc ? `/RARC ${top.rarc}` : ""}`;
}

// ---------------------------------------------------------------------------
// Surface picker
// ---------------------------------------------------------------------------

export type EobSurface = "patient_portal" | "provider_chart";

/** When code only knows the surface name, pick the right view-model.
 *  Both surfaces consume the same parsed EOB so we never end up with
 *  the patient and the provider seeing different totals. */
export function buildEobView(args: {
  eob: ParsedEob;
  surface: "patient_portal";
  aiSummary?: string;
}): PatientEobView;
export function buildEobView(args: {
  eob: ParsedEob;
  surface: "provider_chart";
}): ProviderEobView;
export function buildEobView(args: {
  eob: ParsedEob;
  surface: EobSurface;
  aiSummary?: string;
}): PatientEobView | ProviderEobView {
  if (args.surface === "patient_portal") {
    return buildPatientView({ eob: args.eob, aiSummary: args.aiSummary });
  }
  return buildProviderView(args.eob);
}

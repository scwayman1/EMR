/**
 * Secondary claim filing — EMR-219
 * --------------------------------
 * After a primary payer adjudicates a claim, any remaining patient
 * responsibility that's covered by a secondary policy needs to be filed
 * to the secondary payer. The 837P spec encodes this through Loop 2320
 * (claim-level "other payer" info) plus per-line Loop 2430 (line-level
 * adjudication echo) — both of which are populated from the primary's
 * 835 ERA.
 *
 * This module is the pure transform: given a parsed primary 835 claim
 * payment + the original primary 837P input, it returns the additions
 * needed to build a secondary 837P:
 *
 *   - The `secondary` field on `Claim837Input` (Loop 2320 + 2330A/B).
 *   - The `primaryAdjudication` field on each `ServiceLine` (Loop 2430).
 *
 * It's deliberately decoupled from Prisma so the secondary-filing agent
 * can compose it with the existing 837P builder without a DB round-trip
 * on every claim.
 */

import type {
  ClaimAdjustment,
  Claim837Input,
  Payer,
  ServiceLine,
  Subscriber,
} from "./edi/edi-837p";
import type {
  Era835Adjustment,
  Era835ClaimPayment,
  Era835ServiceLine,
} from "./era-parser";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BuildSecondaryArgs {
  /** The primary 837P input that was originally submitted. We reuse most
   *  fields verbatim and only patch in the secondary block + line
   *  adjudications. */
  primaryInput: Claim837Input;
  /** The primary payer's adjudication, parsed from the 835. */
  primaryAdjudication: Era835ClaimPayment;
  /** When the primary 835 was received — required for DTP*573 in Loop 2320. */
  primaryEraDate: Date;
  /** The secondary payer (e.g. Medicaid behind Medicare). */
  secondaryPayer: Payer;
  /** The secondary subscriber + relationship. Often the same person, but
   *  for spousal coverage it's a different member. */
  secondarySubscriber: Subscriber;
}

export interface BuildSecondaryResult {
  /** Full `Claim837Input` ready to feed `build837P`. */
  input: Claim837Input;
  /** Diagnostic findings — empty when every line matched cleanly. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Group-code mapping (835 CARC → 837P CAS group)
// ---------------------------------------------------------------------------
// 835 emits CO/PR/OA/PI/CR/WO. 837P Loop 2320/2430 only accepts CO/PR/OA/PI
// — CR (correction/reversal) and WO (write-off) collapse to OA in the
// secondary submission.

const GROUP_FROM_835: Record<string, ClaimAdjustment["groupCode"]> = {
  CO: "CO",
  PR: "PR",
  OA: "OA",
  PI: "PI",
  CR: "OA",
  WO: "OA",
};

function adjustmentFromEra(a: Era835Adjustment): ClaimAdjustment | null {
  const group = GROUP_FROM_835[a.groupCode.toUpperCase()];
  if (!group) return null;
  return {
    groupCode: group,
    reasonCode: a.carcCode,
    amountCents: a.amountCents,
    units: a.quantity > 1 ? a.quantity : undefined,
  };
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/** Match the primary's service lines to the original 837P service lines.
 *  Strategy: match on (cpt, modifiers) then by sequence as a fallback so
 *  partial-line adjudications (the payer split a line into two) don't
 *  silently drop. */
function matchServiceLine(
  ediLine: ServiceLine,
  eraLines: Era835ServiceLine[],
): Era835ServiceLine | null {
  const exact = eraLines.find(
    (s) =>
      s.cptCode === ediLine.cptCode &&
      s.modifiers.length === ediLine.modifiers.length &&
      s.modifiers.every((m, i) => m === ediLine.modifiers[i]),
  );
  if (exact) return exact;
  // Fall back to CPT-only match (different modifier set on the 835 means the
  // payer remapped the modifier — still the same line).
  return eraLines.find((s) => s.cptCode === ediLine.cptCode) ?? null;
}

export function buildSecondaryClaimInput(args: BuildSecondaryArgs): BuildSecondaryResult {
  const warnings: string[] = [];

  // Map every line, attaching the primary adjudication when we can match it.
  const newLines: ServiceLine[] = args.primaryInput.serviceLines.map((line) => {
    const era = matchServiceLine(line, args.primaryAdjudication.serviceLines);
    if (!era) {
      warnings.push(
        `service line ${line.sequence} (CPT ${line.cptCode}) — no matching 835 SVC; secondary submission requires per-line adjudication`,
      );
      return line;
    }
    const cas = era.adjustments
      .map(adjustmentFromEra)
      .filter((a): a is ClaimAdjustment => a !== null);
    return {
      ...line,
      primaryAdjudication: {
        allowedCents: era.chargeCents - cas
          .filter((c) => c.groupCode === "CO")
          .reduce((a, c) => a + c.amountCents, 0),
        paidCents: era.paidCents,
        cas,
        eraDate: args.primaryEraDate,
      },
    };
  });

  const claimCas = args.primaryAdjudication.claimAdjustments
    .map(adjustmentFromEra)
    .filter((a): a is ClaimAdjustment => a !== null);

  // Roll the claim-level paid total + allowed total. Allowed = total charge
  // minus all CO (contractual) adjustments — the conventional definition
  // payers and clearinghouses both use for AMT*B6.
  const allowedCents =
    args.primaryAdjudication.totalChargeCents -
    claimCas
      .filter((c) => c.groupCode === "CO")
      .reduce((a, c) => a + c.amountCents, 0) -
    sumLineCo(newLines);

  if (args.primaryAdjudication.payerClaimId == null) {
    warnings.push("primary 835 missing payer claim control number (CLP07) — REF*F8 will be blank");
  }

  const secondary: NonNullable<Claim837Input["secondary"]> = {
    primaryPayer: { name: args.primaryInput.payer.name, payerId: args.primaryInput.payer.payerId },
    primarySubscriber: args.primaryInput.subscriber,
    primaryAllowedCents: allowedCents,
    primaryPaidCents: args.primaryAdjudication.totalPaidCents,
    primaryEraDate: args.primaryEraDate,
    primaryCas: claimCas,
    primaryClaimControlNumber: args.primaryAdjudication.payerClaimId ?? "",
  };

  const input: Claim837Input = {
    ...args.primaryInput,
    payer: args.secondaryPayer,
    subscriber: args.secondarySubscriber,
    serviceLines: newLines,
    secondary,
  };

  return { input, warnings };
}

function sumLineCo(lines: ServiceLine[]): number {
  let total = 0;
  for (const l of lines) {
    if (!l.primaryAdjudication) continue;
    for (const c of l.primaryAdjudication.cas) {
      if (c.groupCode === "CO") total += c.amountCents;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Helper: did the patient still owe anything after primary adjudication?
// ---------------------------------------------------------------------------
// Used to gate "does this even need secondary filing" before we burn cycles
// constructing the input. Patient resp on the 835 = sum(PR* CAS amounts).

export function patientResponsibilityCents(era: Era835ClaimPayment): number {
  let total = era.patientRespCents;
  if (total > 0) return total;
  for (const adj of era.claimAdjustments) {
    if (adj.groupCode.toUpperCase() === "PR") total += adj.amountCents;
  }
  for (const line of era.serviceLines) {
    for (const adj of line.adjustments) {
      if (adj.groupCode.toUpperCase() === "PR") total += adj.amountCents;
    }
  }
  return total;
}

/** True when filing to a secondary makes sense — there's a balance the
 *  primary didn't pay AND the primary actually adjudicated (not denied
 *  outright with a reversal status code). */
export function shouldFileSecondary(era: Era835ClaimPayment): boolean {
  if (patientResponsibilityCents(era) <= 0) return false;
  // Status 4 = denied; status 19/20/21 = reversal of prior payment.
  if (["4", "19", "20", "21", "22"].includes(era.claimStatusCode)) return false;
  return true;
}

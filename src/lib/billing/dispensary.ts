/**
 * EMR-145 — Cannabis Dispensary Billing + CMS $500 Reimbursement.
 * --------------------------------------------------------------
 * Pulls together the three things that make dispensary billing different
 * from a normal pro-fee claim:
 *
 *   1. A POS-side line (from the dispensary's actual register) needs to
 *      ride alongside the CMS-billable counseling line. Most CMS payers
 *      won't reimburse the cannabis itself, but they'll pay the
 *      counseling visit (99213 + a cannabis-specific modifier) that
 *      preceded the purchase.
 *   2. The hypothetical $500-per-patient-per-year cannabis reimbursement
 *      rolls up monthly, capped annually. The math lives in
 *      `lib/dispensary/reimbursement.ts`; this module wraps it for the
 *      claim-building path.
 *   3. The dispensary inventory link — every dispensary sale carries a
 *      product ID that the inventory worker decrements. Billing has to
 *      ride that same product reference so the EOB matches what was
 *      actually dispensed.
 *
 * Pure functions. No DB or HTTP. Caller assembles the pieces and writes
 * via Prisma in the action layer.
 */

import {
  calculateMonthlyReimbursement,
  DEFAULT_CAP_CENTS,
  type ExistingReimbursement,
  sumYtdReimbursable,
} from "@/lib/dispensary/reimbursement";

// ---------------------------------------------------------------------------
// CMS counseling code — Dr. Patel spec: 99213 + a cannabis-specific modifier.
// CMS hasn't published an official cannabis-counseling modifier yet, so we
// use the GP modifier slot as a placeholder and tag the ICD-10 with the
// counseling-context code (Z71.89 — Other specified counseling).
// ---------------------------------------------------------------------------

export const CMS_CANNABIS_COUNSELING = {
  cptCode: "99213",
  /** Established-patient office visit, ~20-29 minutes of MDM. */
  cptLabel: "Office or other outpatient visit (established, low MDM)",
  /** Placeholder modifier slot until CMS issues a cannabis-specific one. */
  modifier: "GP",
  modifierLabel: "Cannabis counseling encounter",
  icd10Counseling: "Z71.89",
  icd10CounselingLabel: "Other specified counseling",
  /**
   * Default charge for the counseling line — clinics with a custom fee
   * schedule should override at the claim builder level.
   */
  defaultChargeCents: 12_500,
} as const;

// ---------------------------------------------------------------------------
// POS integration shape — what the dispensary register hands us. We keep
// it as a flat type because the in-store POS vendors (Dutchie, Treez,
// BLAZE, Flowhub, Greenbits) all converge on roughly this surface; the
// adapter layer normalizes their per-vendor JSON into this shape.
// ---------------------------------------------------------------------------

export type PosVendor =
  | "dutchie"
  | "treez"
  | "blaze"
  | "flowhub"
  | "greenbits"
  | "manual";

export interface DispensaryPosLineInput {
  productId: string;
  productName: string;
  brand: string | null;
  /** Total quantity sold on the line. */
  quantity: number;
  /** Per-unit retail price in cents. */
  unitPriceCents: number;
  /** True when this SKU is a flower/edible/concentrate (i.e. taxable). */
  taxable: boolean;
}

export interface DispensaryPosTransactionInput {
  vendor: PosVendor;
  /** The vendor's own transaction ID. Used for reconciliation. */
  vendorTxnId: string;
  patientId: string;
  /** ISO timestamp the sale rang up. */
  occurredAt: string;
  lines: DispensaryPosLineInput[];
  /** State/local cannabis tax in cents (POS already computed it). */
  taxCents: number;
  /** Dispensary-applied discount in cents. */
  discountCents: number;
}

export interface NormalizedPosTransaction {
  vendor: PosVendor;
  vendorTxnId: string;
  patientId: string;
  occurredAt: string;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  /** Product-id keys, with units sold + revenue, for the inventory link. */
  productLinks: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenueCents: number;
  }>;
}

/**
 * Stub POS adapter: takes a vendor-normalized transaction and rolls it up
 * into the totals we need to post into the patient ledger and to drop a
 * decrement onto each linked product. Real per-vendor parsers (Dutchie,
 * Treez, etc.) live behind `lib/integrations/pos/<vendor>` and call into
 * this normalizer as their final step.
 */
export function normalizePosTransaction(
  input: DispensaryPosTransactionInput,
): NormalizedPosTransaction {
  const subtotal = input.lines.reduce(
    (sum, l) => sum + l.unitPriceCents * l.quantity,
    0,
  );
  const total = subtotal + input.taxCents - input.discountCents;
  const links = input.lines.map((l) => ({
    productId: l.productId,
    productName: l.productName,
    quantitySold: l.quantity,
    revenueCents: l.unitPriceCents * l.quantity,
  }));
  return {
    vendor: input.vendor,
    vendorTxnId: input.vendorTxnId,
    patientId: input.patientId,
    occurredAt: input.occurredAt,
    subtotalCents: subtotal,
    taxCents: input.taxCents,
    discountCents: input.discountCents,
    totalCents: total,
    productLinks: links,
  };
}

// ---------------------------------------------------------------------------
// Counseling-line claim builder — pairs a 99213 + cannabis modifier with the
// associated POS transaction so the AR ledger can show "counseling claim →
// sale receipt" as a single billing event.
// ---------------------------------------------------------------------------

export interface CounselingClaimInput {
  patientId: string;
  providerId: string;
  encounterId: string;
  serviceDate: string;
  /** Override the default charge if the org has a custom fee schedule. */
  chargeCentsOverride?: number;
  /** Optional ICD-10 codes for the encounter (e.g. M79.18 chronic pain). */
  additionalIcd10?: string[];
  /** POS receipt that pairs with this counseling encounter, if any. */
  pairedPosTxnId?: string;
}

export interface CounselingClaimDraft {
  patientId: string;
  providerId: string;
  encounterId: string;
  serviceDate: string;
  cptCodes: Array<{
    code: string;
    label: string;
    modifier: string;
    chargeAmountCents: number;
  }>;
  icd10Codes: string[];
  billedAmountCents: number;
  pairedPosTxnId: string | null;
}

export function buildCounselingClaim(
  input: CounselingClaimInput,
): CounselingClaimDraft {
  const charge = input.chargeCentsOverride ?? CMS_CANNABIS_COUNSELING.defaultChargeCents;
  const icd10 = [
    CMS_CANNABIS_COUNSELING.icd10Counseling,
    ...(input.additionalIcd10 ?? []),
  ];
  return {
    patientId: input.patientId,
    providerId: input.providerId,
    encounterId: input.encounterId,
    serviceDate: input.serviceDate,
    cptCodes: [
      {
        code: CMS_CANNABIS_COUNSELING.cptCode,
        label: CMS_CANNABIS_COUNSELING.cptLabel,
        modifier: CMS_CANNABIS_COUNSELING.modifier,
        chargeAmountCents: charge,
      },
    ],
    icd10Codes: icd10,
    billedAmountCents: charge,
    pairedPosTxnId: input.pairedPosTxnId ?? null,
  };
}

// ---------------------------------------------------------------------------
// $500-per-patient reimbursement tracker — wraps the existing math from
// `lib/dispensary/reimbursement.ts` with a richer view that includes the
// POS spend the reimbursement is documenting.
// ---------------------------------------------------------------------------

export interface ReimbursementTrackerInput {
  /** Patient's monthly cannabis spend rolled up from POS receipts. */
  documentedSpendCents: number;
  /** All prior reimbursements on file for the patient (any status). */
  priorReimbursements: ExistingReimbursement[];
  /** The month we're computing the new reimbursement for. */
  serviceMonth: Date;
  capCents?: number;
}

export interface ReimbursementTrackerOutput {
  documentedSpendCents: number;
  reimbursableCents: number;
  capCents: number;
  ytdReimbursedCents: number;
  remainingCapCents: number;
  cappedByAnnualLimit: boolean;
  /** Human-readable reason the cap was hit, when applicable. */
  capReason: string | null;
}

/**
 * Compute the dollar amount we can claim this month against the $500 cap,
 * given the patient's documented spend and YTD reimbursements on file.
 */
export function trackReimbursementForMonth(
  input: ReimbursementTrackerInput,
): ReimbursementTrackerOutput {
  const cap = input.capCents ?? DEFAULT_CAP_CENTS;
  const ytd = sumYtdReimbursable(input.priorReimbursements, input.serviceMonth);
  const calc = calculateMonthlyReimbursement({
    documentedSpendCents: input.documentedSpendCents,
    ytdReimbursableCents: ytd,
    capCents: cap,
  });

  let capReason: string | null = null;
  if (calc.cappedByAnnualLimit) {
    const remainingDollars = (cap - ytd) / 100;
    capReason = `Annual $${(cap / 100).toFixed(0)} cap reached — only $${remainingDollars.toFixed(2)} remained before this month.`;
  }

  return {
    documentedSpendCents: calc.documentedSpendCents,
    reimbursableCents: calc.reimbursableCents,
    capCents: cap,
    ytdReimbursedCents: ytd,
    remainingCapCents: calc.remainingCapCents,
    cappedByAnnualLimit: calc.cappedByAnnualLimit,
    capReason,
  };
}

// ---------------------------------------------------------------------------
// Inventory link — given a normalized POS transaction, produce the list of
// inventory decrements the warehouse worker needs to apply. Pure: no DB
// access. The caller wraps this in a Prisma `update({ inventoryCount: { decrement } })`.
// ---------------------------------------------------------------------------

export interface InventoryDecrement {
  productId: string;
  decrementBy: number;
  /** Vendor-side transaction ID — written to AuditLog.metadata for audit. */
  sourceVendorTxnId: string;
}

export function inventoryDecrementsFor(
  txn: NormalizedPosTransaction,
): InventoryDecrement[] {
  return txn.productLinks.map((link) => ({
    productId: link.productId,
    decrementBy: link.quantitySold,
    sourceVendorTxnId: txn.vendorTxnId,
  }));
}

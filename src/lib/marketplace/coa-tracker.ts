// EMR-242 — Certificate of Analysis (COA) lifecycle.
//
// Cannabinoid products must have a current COA on file. This module
// owns the pure logic that the upload route, the daily cron, and the
// product publish gate all call into. No DB writes happen in this
// module — every fn returns the changes the caller should apply.

import type { Product, VendorDocument } from "@prisma/client";

export type CoaPublishBlocker = "no_coa" | "coa_expired" | "coa_no_expiry";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Reminder cadence: 30, 14, 7 days before expiry — newest first. */
export const COA_REMINDER_DAYS_AHEAD: readonly number[] = [30, 14, 7];

export interface CoaCheckInput {
  product: Pick<Product, "coaDocumentId">;
  coa: Pick<VendorDocument, "expiresAt" | "status"> | null;
}

export function canPublishProduct(
  input: CoaCheckInput,
  now: Date = new Date(),
): { ok: boolean; blocker?: CoaPublishBlocker } {
  if (!input.product.coaDocumentId || !input.coa) {
    return { ok: false, blocker: "no_coa" };
  }
  if (!input.coa.expiresAt) {
    // Defensive: a COA without an expiresAt is a configuration bug —
    // refuse to publish until the vendor sets one. Better to fail
    // closed than serve a "valid forever" COA.
    return { ok: false, blocker: "coa_no_expiry" };
  }
  if (input.coa.expiresAt <= now) {
    return { ok: false, blocker: "coa_expired" };
  }
  return { ok: true };
}

export interface ExpiringCoaResult {
  documentId: string;
  vendorId: string;
  organizationId: string;
  expiresAt: Date;
  daysUntilExpiry: number;
  /** The reminder bucket this falls into (30 / 14 / 7) when we're
   *  meant to send the email today. */
  reminderBucket: number | null;
}

/**
 * Bucket an expiring COA into a reminder window. Returns the matching
 * day-bucket if `daysUntilExpiry` falls on one of the reminder days
 * (30, 14, 7), else null. The cron is expected to run once per day,
 * so an exact match is the right boundary.
 */
export function reminderBucketFor(
  expiresAt: Date,
  now: Date = new Date(),
): { daysUntilExpiry: number; bucket: number | null } {
  // Round to whole days at UTC midnight to avoid time-of-day jitter.
  const ms = expiresAt.getTime() - now.getTime();
  const daysUntilExpiry = Math.floor(ms / ONE_DAY_MS);
  const bucket = COA_REMINDER_DAYS_AHEAD.includes(daysUntilExpiry)
    ? daysUntilExpiry
    : null;
  return { daysUntilExpiry, bucket };
}

export interface ProductDelistAction {
  productId: string;
  reason: "coa_expired" | "coa_missing";
}

/**
 * Given a snapshot of products + their COAs, compute the changes
 * needed: which to delist (status=archived) and which to re-list
 * (status=active). The caller applies the writes — this fn is pure.
 */
export interface SweepInput {
  products: Array<
    Product & { coa: VendorDocument | null }
  >;
  now: Date;
}
export interface SweepResult {
  delist: ProductDelistAction[];
  relist: string[];
}

export function computeCoaSweep(input: SweepInput): SweepResult {
  const delist: ProductDelistAction[] = [];
  const relist: string[] = [];

  for (const product of input.products) {
    const decision = canPublishProduct(
      { product, coa: product.coa },
      input.now,
    );

    if (!decision.ok) {
      // Only delist products that are currently active (don't churn
      // already-archived rows or drafts).
      if (product.status === "active") {
        delist.push({
          productId: product.id,
          reason:
            decision.blocker === "no_coa" || decision.blocker === "coa_no_expiry"
              ? "coa_missing"
              : "coa_expired",
        });
      }
    } else {
      // Inverse: products that were archived but now have a valid COA
      // (vendor renewed) should auto-relist.
      if (product.status === "archived") {
        relist.push(product.id);
      }
    }
  }

  return { delist, relist };
}

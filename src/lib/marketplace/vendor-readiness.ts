// EMR-241 — vendor go-live readiness check.
//
// Returns the structured list of blockers preventing a vendor from
// transitioning to status=`active`. Onboarding wizard (EMR-240) and
// the admin-side toggle both call this. Today the only blocker we
// enforce here is the W-9; insurance + COA join as their own tickets
// land. A vendor with `blockers: []` is safe to flip live.

import type { Vendor, VendorDocument } from "@prisma/client";

export type GoLiveBlocker =
  | "w9_missing"
  | "w9_pending_review"
  | "w9_rejected"
  | "shippable_states_empty"
  | "founding_partner_expired_no_replacement_rate";

export interface GoLiveReadiness {
  ok: boolean;
  blockers: GoLiveBlocker[];
}

interface VendorWithDocuments extends Vendor {
  documents: VendorDocument[];
}

export function canVendorGoLive(vendor: VendorWithDocuments): GoLiveReadiness {
  const blockers: GoLiveBlocker[] = [];

  const w9 = vendor.documents.find((d) => d.documentType === "w9");
  if (!w9 || w9.status === "missing" || !w9.fileUrl) {
    blockers.push("w9_missing");
  } else if (w9.status === "submitted") {
    blockers.push("w9_pending_review");
  } else if (w9.status === "rejected") {
    blockers.push("w9_rejected");
  }

  if (!vendor.shippableStates || vendor.shippableStates.length === 0) {
    blockers.push("shippable_states_empty");
  }

  // A founding-partner-only vendor whose lock has expired must have
  // had a replacement rate written before going live (the auto-tier
  // logic in resolveTakeRate will fall through to "standard" 15% but
  // we don't want a vendor surprised — onboarding/admin must confirm).
  if (
    vendor.foundingPartnerFlag &&
    vendor.foundingPartnerExpiresAt &&
    vendor.foundingPartnerExpiresAt < new Date() &&
    // Take rate at the founding-partner default (10%) means no
    // replacement rate was ever set — flag for review.
    vendor.takeRatePct === 0.1
  ) {
    blockers.push("founding_partner_expired_no_replacement_rate");
  }

  return { ok: blockers.length === 0, blockers };
}

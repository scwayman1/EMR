// EMR-125 — Volunteer & Donation Module (Constitutional Article VII).
//
// This module is the donation-side and impact-dashboard companion to
// `src/lib/domain/volunteer.ts` (which already owns opportunity filtering,
// hour logging, and the certificate primitive). Things that live here:
//
//   • Donation portal (one-time + recurring schedule math)
//   • Tax receipt generation (501(c)(3) statement, deductible amount)
//   • Impact dashboard aggregator (hours + dollars → community impact)
//
// The two files compose: a patient page imports filtering + progress from
// `domain/volunteer` and donation + receipts from `community/volunteer`.

import {
  type VolunteerHour,
  generateCertificate,
  attestationHashSync,
} from "@/lib/domain/volunteer";

// ---------------------------------------------------------------------------
// Donation primitives.
// ---------------------------------------------------------------------------

export type DonationFrequency = "one_time" | "monthly" | "quarterly" | "annually";

export type DonationStatus = "scheduled" | "succeeded" | "failed" | "refunded";

export interface Donation {
  id: string;
  userId: string;
  charityId: string;
  charityName: string;
  amountCents: number;
  currency: "USD";
  frequency: DonationFrequency;
  /** When the donation was made (or first scheduled). ISO 8601. */
  donatedAt: string;
  /** For recurring schedules: the next scheduled charge. */
  nextScheduledAt?: string;
  status: DonationStatus;
  /** Patient-supplied note for the receipt. */
  memo?: string;
  /**
   * `true` when this donation came in lieu of a Leafjourney member
   * discount (we donate the discount equivalent on the patient's behalf).
   */
  inLieuOfDiscount?: boolean;
}

export interface DonationInput {
  userId: string;
  charityId: string;
  charityName: string;
  amountCents: number;
  frequency: DonationFrequency;
  memo?: string;
  inLieuOfDiscount?: boolean;
  now?: Date;
}

const FREQUENCY_DAYS: Record<DonationFrequency, number> = {
  one_time: 0,
  monthly: 30,
  quarterly: 91,
  annually: 365,
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function createDonation(input: DonationInput): Donation {
  if (input.amountCents <= 0) {
    throw new Error("amountCents must be positive");
  }
  const now = (input.now ?? new Date()).toISOString();
  const id =
    "don-" +
    attestationHashSync(`${input.userId}|${input.charityId}|${input.amountCents}|${now}`).slice(0, 12);
  return {
    id,
    userId: input.userId,
    charityId: input.charityId,
    charityName: input.charityName,
    amountCents: input.amountCents,
    currency: "USD",
    frequency: input.frequency,
    donatedAt: now,
    nextScheduledAt:
      input.frequency === "one_time" ? undefined : addDays(now, FREQUENCY_DAYS[input.frequency]),
    status: input.frequency === "one_time" ? "succeeded" : "scheduled",
    memo: input.memo,
    inLieuOfDiscount: input.inLieuOfDiscount,
  };
}

/**
 * Advance a recurring donation's next-charge timestamp after a successful
 * billing cycle. Idempotent: passing a one-time donation returns it
 * unchanged.
 */
export function advanceRecurring(d: Donation): Donation {
  if (d.frequency === "one_time" || !d.nextScheduledAt) return d;
  return {
    ...d,
    donatedAt: d.nextScheduledAt,
    nextScheduledAt: addDays(d.nextScheduledAt, FREQUENCY_DAYS[d.frequency]),
    status: "succeeded",
  };
}

/**
 * Project the *remaining* dollars for a recurring donation across the next
 * `windowDays` calendar window. Useful for the "your annual giving" bar.
 */
export function projectFutureDonations(d: Donation, windowDays: number, asOf: Date = new Date()): number {
  if (d.frequency === "one_time") return 0;
  const stride = FREQUENCY_DAYS[d.frequency];
  if (!stride) return 0;
  const start = new Date(d.nextScheduledAt ?? d.donatedAt).getTime();
  const end = asOf.getTime() + windowDays * 86_400_000;
  if (start > end) return 0;
  const charges = Math.max(0, Math.floor((end - start) / (stride * 86_400_000)) + 1);
  return charges * d.amountCents;
}

// ---------------------------------------------------------------------------
// Tax receipts. We hash the canonical fields so receipts are immutable
// and verifiable: the IRS letter generator can reprint a receipt later
// and prove it matches what we issued.
// ---------------------------------------------------------------------------

export interface TaxReceipt {
  id: string;
  userId: string;
  taxYear: number;
  totalDeductibleCents: number;
  donationCount: number;
  charities: Array<{ charityId: string; charityName: string; amountCents: number }>;
  ein: string;
  organizationName: string;
  /** Required IRS attestation: "no goods or services were exchanged". */
  goodsOrServicesStatement: string;
  issuedAt: string;
  attestationHash: string;
}

export const LEAFJOURNEY_EIN = "00-0000000";
export const LEAFJOURNEY_LEGAL_NAME = "Leafjourney Charitable Foundation";
export const IRS_GOODS_OR_SERVICES_STATEMENT =
  "No goods or services were provided in exchange for this contribution. Leafjourney Charitable Foundation is a tax-exempt 501(c)(3) organization.";

export function generateTaxReceipt(input: {
  userId: string;
  donations: Donation[];
  taxYear: number;
  now?: Date;
}): TaxReceipt {
  const succeeded = input.donations.filter((d) => d.status === "succeeded");
  // Group succeeded donations made within the tax year.
  const yearDonations = succeeded.filter((d) => new Date(d.donatedAt).getUTCFullYear() === input.taxYear);
  const byCharity = new Map<string, { charityId: string; charityName: string; amountCents: number }>();
  for (const d of yearDonations) {
    const cur = byCharity.get(d.charityId);
    if (cur) cur.amountCents += d.amountCents;
    else
      byCharity.set(d.charityId, {
        charityId: d.charityId,
        charityName: d.charityName,
        amountCents: d.amountCents,
      });
  }
  const charities = Array.from(byCharity.values()).sort((a, b) => b.amountCents - a.amountCents);
  const totalDeductibleCents = charities.reduce((s, c) => s + c.amountCents, 0);
  const issuedAt = (input.now ?? new Date()).toISOString();
  const canonical = [
    input.userId,
    input.taxYear.toString(),
    totalDeductibleCents.toString(),
    charities.map((c) => `${c.charityId}:${c.amountCents}`).join("|"),
    issuedAt,
  ].join("::");
  const hash = attestationHashSync(canonical);
  return {
    id: `rcpt-${input.taxYear}-${hash.slice(0, 10)}`,
    userId: input.userId,
    taxYear: input.taxYear,
    totalDeductibleCents,
    donationCount: yearDonations.length,
    charities,
    ein: LEAFJOURNEY_EIN,
    organizationName: LEAFJOURNEY_LEGAL_NAME,
    goodsOrServicesStatement: IRS_GOODS_OR_SERVICES_STATEMENT,
    issuedAt,
    attestationHash: hash,
  };
}

// ---------------------------------------------------------------------------
// Impact dashboard — combines hours + donations into a single member-facing
// summary that the volunteer page renders.
// ---------------------------------------------------------------------------

/**
 * Independent Sector's published value of a volunteer hour ($31.80 for
 * 2024). Expressed in cents so all arithmetic stays integer.
 *
 * Source: https://independentsector.org/value-of-volunteer-time/
 */
export const VOLUNTEER_HOUR_VALUE_CENTS = 3180;

export interface ImpactSnapshot {
  totalHours: number;
  totalHoursValueCents: number;
  totalDonatedCents: number;
  combinedImpactCents: number;
  charityCount: number;
  /** Year-to-date breakdown; ISO year. */
  year: number;
}

export function buildImpactSnapshot(input: {
  hours: VolunteerHour[];
  donations: Donation[];
  asOf?: Date;
}): ImpactSnapshot {
  const asOf = input.asOf ?? new Date();
  const year = asOf.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1)).getTime();

  const totalHours = input.hours
    .filter((h) => new Date(h.occurredAt).getTime() >= yearStart)
    .reduce((s, h) => s + h.hours, 0);

  const totalDonatedCents = input.donations
    .filter((d) => d.status === "succeeded" && new Date(d.donatedAt).getTime() >= yearStart)
    .reduce((s, d) => s + d.amountCents, 0);

  const charities = new Set<string>();
  for (const d of input.donations) charities.add(d.charityId);
  for (const h of input.hours) if (h.donatedToCharityId) charities.add(h.donatedToCharityId);

  const totalHoursValueCents = Math.round(totalHours * VOLUNTEER_HOUR_VALUE_CENTS);
  return {
    totalHours,
    totalHoursValueCents,
    totalDonatedCents,
    combinedImpactCents: totalHoursValueCents + totalDonatedCents,
    charityCount: charities.size,
    year,
  };
}

// ---------------------------------------------------------------------------
// Re-export: the page imports certificate generation from one place.
// ---------------------------------------------------------------------------

export { generateCertificate };

// EMR-315 — Vendor tax document data layer.
//
// The vendor portal needs to surface per-year tax documents (1099-K,
// W-9 echo, monthly settlement reports). This module centralizes the
// status logic so both the vendor-facing page and the operator-facing
// status counter agree on what "ready" means.
//
// Document availability is a function of:
//   - tax year (1099-Ks issue after Jan 31 of the following year)
//   - vendor onboarding status (W-9 must be on file for 1099 issuance)
//   - federal threshold ($600 from 2024 onward — see IRS notice)

import "server-only";

export type TaxDocKind =
  | "1099_k"
  | "w9_on_file"
  | "annual_summary"
  | "monthly_settlement";

export type TaxDocStatus =
  | "available"
  | "pending"
  | "ineligible"
  | "missing_prerequisite";

export interface VendorTaxDocument {
  id: string;
  kind: TaxDocKind;
  taxYear: number;
  /** Coarse period label for monthly statements: "2026-03". */
  periodLabel?: string;
  status: TaxDocStatus;
  /** ISO date when the document becomes available; null if already available. */
  availableAt: string | null;
  /** Storage key for download once `available`; null otherwise. */
  storageKey: string | null;
  /** Human-readable hint shown in the UI when status != "available". */
  hint?: string;
}

export interface VendorTaxProfile {
  vendorId: string;
  hasW9OnFile: boolean;
  /** YTD gross marketplace volume in cents. */
  ytdVolumeCents: number;
  /** Onboarding completion year. */
  onboardedYear: number;
}

const FEDERAL_1099K_THRESHOLD_CENTS = 600 * 100;

/**
 * Cutover date for 1099-K availability. The IRS requires issuance by
 * Jan 31 of the year after the tax year; we publish on Feb 1 to give
 * ops a one-day buffer for last-minute corrections.
 */
function nineteenkAvailableAt(taxYear: number): Date {
  return new Date(Date.UTC(taxYear + 1, 1, 1));
}

export function listTaxDocuments(
  profile: VendorTaxProfile,
  now: Date = new Date(),
): VendorTaxDocument[] {
  const docs: VendorTaxDocument[] = [];

  // W-9 echo: vendor's own copy of what they uploaded during onboarding.
  docs.push({
    id: `w9-${profile.vendorId}`,
    kind: "w9_on_file",
    taxYear: profile.onboardedYear,
    status: profile.hasW9OnFile ? "available" : "missing_prerequisite",
    availableAt: profile.hasW9OnFile ? null : null,
    storageKey: profile.hasW9OnFile ? `vendor-tax/${profile.vendorId}/w9.pdf` : null,
    hint: profile.hasW9OnFile
      ? undefined
      : "Upload your W-9 in Settings to enable 1099 issuance.",
  });

  // 1099-K for the current and prior tax year.
  const currentYear = now.getUTCFullYear();
  for (const year of [currentYear, currentYear - 1]) {
    if (year < profile.onboardedYear) continue;

    if (!profile.hasW9OnFile) {
      docs.push({
        id: `1099k-${profile.vendorId}-${year}`,
        kind: "1099_k",
        taxYear: year,
        status: "missing_prerequisite",
        availableAt: null,
        storageKey: null,
        hint: "1099-K issuance is blocked until W-9 is on file.",
      });
      continue;
    }

    if (profile.ytdVolumeCents < FEDERAL_1099K_THRESHOLD_CENTS && year === currentYear) {
      docs.push({
        id: `1099k-${profile.vendorId}-${year}`,
        kind: "1099_k",
        taxYear: year,
        status: "ineligible",
        availableAt: null,
        storageKey: null,
        hint: "Volume below the $600 federal threshold for this tax year.",
      });
      continue;
    }

    const availableAt = nineteenkAvailableAt(year);
    if (now >= availableAt) {
      docs.push({
        id: `1099k-${profile.vendorId}-${year}`,
        kind: "1099_k",
        taxYear: year,
        status: "available",
        availableAt: null,
        storageKey: `vendor-tax/${profile.vendorId}/1099k-${year}.pdf`,
      });
    } else {
      docs.push({
        id: `1099k-${profile.vendorId}-${year}`,
        kind: "1099_k",
        taxYear: year,
        status: "pending",
        availableAt: availableAt.toISOString(),
        storageKey: null,
        hint: `1099-K issues on ${availableAt.toISOString().slice(0, 10)}.`,
      });
    }
  }

  // Annual summary for the prior year (always available once the year ends).
  const priorYear = currentYear - 1;
  if (priorYear >= profile.onboardedYear) {
    docs.push({
      id: `annual-${profile.vendorId}-${priorYear}`,
      kind: "annual_summary",
      taxYear: priorYear,
      status: "available",
      availableAt: null,
      storageKey: `vendor-tax/${profile.vendorId}/annual-${priorYear}.pdf`,
    });
  }

  // Monthly settlement statements for the trailing 3 months.
  for (let i = 1; i <= 3; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    docs.push({
      id: `monthly-${profile.vendorId}-${period}`,
      kind: "monthly_settlement",
      taxYear: d.getUTCFullYear(),
      periodLabel: period,
      status: "available",
      availableAt: null,
      storageKey: `vendor-tax/${profile.vendorId}/monthly-${period}.pdf`,
    });
  }

  return docs;
}

/**
 * Demo profile so the vendor portal page renders without DB plumbing.
 * The real implementation hydrates this from the Vendor + VendorPayout
 * tables.
 */
export function demoVendorTaxProfile(vendorId: string): VendorTaxProfile {
  return {
    vendorId,
    hasW9OnFile: true,
    ytdVolumeCents: 28_400 * 100,
    onboardedYear: 2024,
  };
}

// EMR-315 — Employer/employee payroll tax documents (W-2 family).
//
// The vendor portal must generate "all tax documents — including 1099 and
// W2 for employees and employers." The marketplace-side 1099-K / W-9 logic
// already lives in `vendor-tax.ts`. This module adds the payroll side a
// vendor needs once they have employees: W-2 (employee wage statement),
// W-3 (employer transmittal to the SSA), and Form 941 (quarterly employer
// return). Kept separate so the marketplace tax page is untouched and the
// new vendor portal can compose both.

import "server-only";

import type { TaxDocStatus } from "@/lib/marketplace/vendor-tax";

export type PayrollDocKind =
  | "w2_employee" // wage statement issued to each employee
  | "w3_transmittal" // employer summary transmitted to the SSA
  | "form_941"; // employer quarterly federal tax return

export interface VendorPayrollProfile {
  vendorId: string;
  /** Headcount on payroll for the reporting year. */
  employeeCount: number;
  /** First year the vendor ran payroll through us. */
  payrollStartYear: number;
  /** Employer Identification Number on file — required to issue W-2/W-3. */
  hasEinOnFile: boolean;
}

export interface VendorPayrollDocument {
  id: string;
  kind: PayrollDocKind;
  taxYear: number;
  /** "Employee" copies vs employer filings, for grouping in the UI. */
  audience: "employee" | "employer";
  /** Quarter label for 941s: "Q1". */
  periodLabel?: string;
  /** How many statements this row represents (e.g. one W-2 per employee). */
  documentCount: number;
  status: TaxDocStatus;
  availableAt: string | null;
  storageKey: string | null;
  hint?: string;
}

/**
 * W-2s and W-3 must be furnished by Jan 31 of the year after the tax year.
 * We publish on Feb 1 to leave ops a one-day correction buffer (matching
 * the 1099-K cutover in vendor-tax.ts).
 */
function w2AvailableAt(taxYear: number): Date {
  return new Date(Date.UTC(taxYear + 1, 1, 1));
}

export function listPayrollTaxDocuments(
  profile: VendorPayrollProfile,
  now: Date = new Date(),
): VendorPayrollDocument[] {
  const docs: VendorPayrollDocument[] = [];
  const currentYear = now.getUTCFullYear();

  // W-2 + W-3 for the current and prior tax year.
  for (const year of [currentYear, currentYear - 1]) {
    if (year < profile.payrollStartYear) continue;

    const prereqMissing = !profile.hasEinOnFile || profile.employeeCount === 0;
    const baseHint = !profile.hasEinOnFile
      ? "Add your EIN in Settings to enable W-2 / W-3 issuance."
      : profile.employeeCount === 0
        ? "No employees on payroll for this year — no W-2s to issue."
        : undefined;

    const availableAt = w2AvailableAt(year);
    let status: TaxDocStatus;
    let available = false;
    if (prereqMissing) {
      status = profile.employeeCount === 0 ? "ineligible" : "missing_prerequisite";
    } else if (now >= availableAt) {
      status = "available";
      available = true;
    } else {
      status = "pending";
    }

    docs.push({
      id: `w2-${profile.vendorId}-${year}`,
      kind: "w2_employee",
      taxYear: year,
      audience: "employee",
      documentCount: profile.employeeCount,
      status,
      availableAt: available || prereqMissing ? null : availableAt.toISOString(),
      storageKey: available ? `vendor-tax/${profile.vendorId}/w2-${year}.zip` : null,
      hint:
        baseHint ??
        (status === "pending" ? `W-2s issue on ${availableAt.toISOString().slice(0, 10)}.` : undefined),
    });

    docs.push({
      id: `w3-${profile.vendorId}-${year}`,
      kind: "w3_transmittal",
      taxYear: year,
      audience: "employer",
      documentCount: 1,
      status,
      availableAt: available || prereqMissing ? null : availableAt.toISOString(),
      storageKey: available ? `vendor-tax/${profile.vendorId}/w3-${year}.pdf` : null,
      hint:
        baseHint ??
        (status === "pending" ? `W-3 transmittal files on ${availableAt.toISOString().slice(0, 10)}.` : undefined),
    });
  }

  // Form 941 — quarterly employer return for the trailing 4 quarters.
  if (profile.hasEinOnFile && profile.employeeCount > 0) {
    for (let q = 1; q <= 4; q++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - q * 3, 1));
      const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
      docs.push({
        id: `941-${profile.vendorId}-${d.getUTCFullYear()}-q${quarter}`,
        kind: "form_941",
        taxYear: d.getUTCFullYear(),
        audience: "employer",
        periodLabel: `Q${quarter}`,
        documentCount: 1,
        status: "available",
        availableAt: null,
        storageKey: `vendor-tax/${profile.vendorId}/941-${d.getUTCFullYear()}-q${quarter}.pdf`,
      });
    }
  }

  return docs;
}

/** Demo payroll profile so the vendor portal renders without DB plumbing. */
export function demoVendorPayrollProfile(vendorId: string): VendorPayrollProfile {
  return {
    vendorId,
    employeeCount: 7,
    payrollStartYear: 2024,
    hasEinOnFile: true,
  };
}

export const PAYROLL_DOC_LABELS: Record<PayrollDocKind, string> = {
  w2_employee: "W-2 (employee wage statements)",
  w3_transmittal: "W-3 (employer transmittal)",
  form_941: "Form 941 (quarterly federal return)",
};

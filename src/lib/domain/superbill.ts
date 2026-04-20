// Superbill Generation — EMR-177
// Printable superbill/encounter form from encounter data.

export interface SuperbillData {
  // Practice
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  practiceNpi: string;
  practiceTaxId: string;

  // Provider
  providerName: string;
  providerNpi: string;
  providerCredentials: string;

  // Patient
  patientName: string;
  patientDob: string;
  patientAddress: string;
  patientPhone: string;
  patientId: string;
  insuranceName?: string;
  insuranceId?: string;
  groupNumber?: string;

  // Visit
  dateOfService: string;
  placeOfService: string;
  encounterType: string;
  referringProvider?: string;
  priorAuthNumber?: string;

  // Diagnoses
  diagnoses: { code: string; description: string }[];

  // Procedures
  procedures: {
    cptCode: string;
    description: string;
    modifier?: string;
    units: number;
    fee: number;
    // Optional fields used by validateSuperbill (EMR-ticket: superbill validation)
    serviceDate?: string;
    diagnosisPointers?: number[];
  }[];

  // Optional EIN (separate from practiceTaxId) — used by validateSuperbill
  taxId?: string;

  // Totals
  totalCharges: number;
  copayCollected?: number;
  amountDue?: number;

  // Signature
  providerSignature?: boolean;
  signatureDate?: string;
}

// ── Common CPT codes for cannabis medicine ──────────────

export const CANNABIS_CPT_CODES = [
  { code: "99201", description: "New patient, problem focused", fee: 75 },
  { code: "99202", description: "New patient, expanded problem", fee: 110 },
  { code: "99203", description: "New patient, detailed", fee: 165 },
  { code: "99204", description: "New patient, comprehensive", fee: 250 },
  { code: "99205", description: "New patient, comprehensive/complex", fee: 325 },
  { code: "99211", description: "Established patient, minimal", fee: 35 },
  { code: "99212", description: "Established patient, problem focused", fee: 65 },
  { code: "99213", description: "Established patient, expanded", fee: 100 },
  { code: "99214", description: "Established patient, detailed", fee: 150 },
  { code: "99215", description: "Established patient, comprehensive", fee: 215 },
  { code: "99441", description: "Telephone E/M, 5-10 min", fee: 55 },
  { code: "99442", description: "Telephone E/M, 11-20 min", fee: 95 },
  { code: "99443", description: "Telephone E/M, 21-30 min", fee: 130 },
  { code: "99421", description: "Online digital E/M, 5-10 min", fee: 50 },
  { code: "99422", description: "Online digital E/M, 11-20 min", fee: 90 },
  { code: "99381", description: "Preventive visit, new patient", fee: 185 },
  { code: "96127", description: "Brief emotional/behavioral assessment", fee: 15 },
  { code: "99497", description: "Advance care planning, 30 min", fee: 95 },
] as const;

/**
 * Format a superbill total as currency.
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate total charges from procedures.
 */
export function calculateTotal(procedures: { fee: number; units: number }[]): number {
  return procedures.reduce((sum, p) => sum + p.fee * p.units, 0);
}

// ── Validation ──────────────────────────────────────────

export interface SuperbillValidationError {
  field: string;
  code: string;
  message: string;
}

/**
 * Validate a superbill for required fields and coherent line items.
 * Returns an array of errors. Empty array means the bill is valid.
 *
 * Note: the exported interface in this module is `SuperbillData`. The parameter
 * type is named `Superbill` in this helper to match the public API contract.
 */
export type Superbill = SuperbillData;

export function validateSuperbill(bill: Superbill): SuperbillValidationError[] {
  const errors: SuperbillValidationError[] = [];

  // Provider NPI
  if (!bill.providerNpi || bill.providerNpi.trim() === "") {
    errors.push({
      field: "providerNpi",
      code: "missing_provider_npi",
      message: "Provider NPI is required.",
    });
  }

  // Tax ID (EIN) — check the optional `taxId` first, then fall back to `practiceTaxId`.
  const taxId = bill.taxId ?? bill.practiceTaxId;
  if (!taxId || taxId.trim() === "") {
    errors.push({
      field: "taxId",
      code: "missing_tax_id",
      message: "Tax ID (EIN) is required.",
    });
  }

  // Line items (procedures)
  if (!bill.procedures || bill.procedures.length === 0) {
    errors.push({
      field: "procedures",
      code: "no_line_items",
      message: "At least one line item is required.",
    });
  }

  const diagnosisCount = bill.diagnoses?.length ?? 0;
  const now = Date.now();

  bill.procedures?.forEach((line, idx) => {
    // Diagnosis pointer range check
    if (line.diagnosisPointers && line.diagnosisPointers.length > 0) {
      for (const pointer of line.diagnosisPointers) {
        if (pointer < 0 || pointer >= diagnosisCount) {
          errors.push({
            field: `procedures[${idx}].diagnosisPointers`,
            code: "diagnosis_pointer_out_of_range",
            message: `Line item ${idx} references diagnosis index ${pointer}, which does not exist.`,
          });
        }
      }
    }

    // Future service date
    if (line.serviceDate) {
      const ts = Date.parse(line.serviceDate);
      if (!Number.isNaN(ts) && ts > now) {
        errors.push({
          field: `procedures[${idx}].serviceDate`,
          code: "future_service_date",
          message: `Line item ${idx} has a service date in the future.`,
        });
      }
    }

    // Negative charge
    if (typeof line.fee === "number" && line.fee < 0) {
      errors.push({
        field: `procedures[${idx}].fee`,
        code: "negative_amount",
        message: `Line item ${idx} has a negative charge.`,
      });
    }
  });

  return errors;
}

import { describe, expect, it } from "vitest";
import {
  validateSuperbill,
  type Superbill,
  type SuperbillValidationError,
} from "./superbill";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function baseBill(overrides: Partial<Superbill> = {}): Superbill {
  return {
    practiceName: "Leafjourney Clinic",
    practiceAddress: "123 Hemp Ln",
    practicePhone: "555-555-5555",
    practiceNpi: "1111111111",
    practiceTaxId: "12-3456789",
    providerName: "Dr. Patel",
    providerNpi: "2222222222",
    providerCredentials: "MD",
    patientName: "Jane Doe",
    patientDob: "1990-01-01",
    patientAddress: "456 Terpene Rd",
    patientPhone: "555-111-2222",
    patientId: "PT-1",
    dateOfService: "2026-01-15",
    placeOfService: "11",
    encounterType: "office",
    diagnoses: [
      { code: "F41.1", description: "Generalized anxiety" },
      { code: "G47.00", description: "Insomnia" },
    ],
    procedures: [
      {
        cptCode: "99213",
        description: "Established patient, expanded",
        units: 1,
        fee: 100,
        serviceDate: "2026-01-15",
        diagnosisPointers: [0, 1],
      },
    ],
    totalCharges: 100,
    ...overrides,
  };
}

function codes(errors: SuperbillValidationError[]): string[] {
  return errors.map((e) => e.code);
}

// ─────────────────────────────────────────────────────────────────────────────
// validateSuperbill
// ─────────────────────────────────────────────────────────────────────────────

describe("validateSuperbill", () => {
  it("returns an empty array for a valid bill", () => {
    expect(validateSuperbill(baseBill())).toEqual([]);
  });

  it("flags missing_provider_npi when provider NPI is empty", () => {
    const errors = validateSuperbill(baseBill({ providerNpi: "" }));
    expect(codes(errors)).toContain("missing_provider_npi");
  });

  it("flags missing_provider_npi when provider NPI is whitespace only", () => {
    const errors = validateSuperbill(baseBill({ providerNpi: "   " }));
    expect(codes(errors)).toContain("missing_provider_npi");
  });

  it("flags missing_tax_id when both taxId and practiceTaxId are empty", () => {
    const errors = validateSuperbill(
      baseBill({ taxId: "", practiceTaxId: "" }),
    );
    expect(codes(errors)).toContain("missing_tax_id");
  });

  it("accepts bill when taxId is set even if practiceTaxId is empty", () => {
    const errors = validateSuperbill(
      baseBill({ taxId: "98-7654321", practiceTaxId: "" }),
    );
    expect(codes(errors)).not.toContain("missing_tax_id");
  });

  it("flags no_line_items when procedures array is empty", () => {
    const errors = validateSuperbill(baseBill({ procedures: [] }));
    expect(codes(errors)).toContain("no_line_items");
  });

  it("flags diagnosis_pointer_out_of_range when pointer exceeds diagnosis count", () => {
    const errors = validateSuperbill(
      baseBill({
        diagnoses: [{ code: "F41.1", description: "Anxiety" }],
        procedures: [
          {
            cptCode: "99213",
            description: "Visit",
            units: 1,
            fee: 100,
            diagnosisPointers: [5],
          },
        ],
      }),
    );
    expect(codes(errors)).toContain("diagnosis_pointer_out_of_range");
  });

  it("flags future_service_date when service date is in the future", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
      .toISOString()
      .slice(0, 10);
    const errors = validateSuperbill(
      baseBill({
        procedures: [
          {
            cptCode: "99213",
            description: "Visit",
            units: 1,
            fee: 100,
            serviceDate: futureDate,
            diagnosisPointers: [0],
          },
        ],
      }),
    );
    expect(codes(errors)).toContain("future_service_date");
  });

  it("flags negative_amount when a charge is negative", () => {
    const errors = validateSuperbill(
      baseBill({
        procedures: [
          {
            cptCode: "99213",
            description: "Visit",
            units: 1,
            fee: -50,
            diagnosisPointers: [0],
          },
        ],
      }),
    );
    expect(codes(errors)).toContain("negative_amount");
  });

  it("reports every error code at once for an all-errors bill", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      .toISOString()
      .slice(0, 10);

    // Bill with an empty procedures array cannot also trigger the per-line
    // errors, so we use a procedures array with a single bad line to surface
    // diagnosis pointer / future date / negative amount, and separately assert
    // no_line_items with a second bill.
    const badLineBill = validateSuperbill(
      baseBill({
        providerNpi: "",
        taxId: "",
        practiceTaxId: "",
        diagnoses: [],
        procedures: [
          {
            cptCode: "99213",
            description: "Visit",
            units: 1,
            fee: -10,
            serviceDate: futureDate,
            diagnosisPointers: [0],
          },
        ],
      }),
    );
    const emptyLinesBill = validateSuperbill(
      baseBill({
        providerNpi: "",
        taxId: "",
        practiceTaxId: "",
        procedures: [],
      }),
    );

    const allCodes = new Set([...codes(badLineBill), ...codes(emptyLinesBill)]);
    expect(allCodes).toEqual(
      new Set([
        "missing_provider_npi",
        "missing_tax_id",
        "no_line_items",
        "diagnosis_pointer_out_of_range",
        "future_service_date",
        "negative_amount",
      ]),
    );
  });
});

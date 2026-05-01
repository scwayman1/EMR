import { describe, expect, it } from "vitest";
import {
  buildSecondaryClaimInput,
  patientResponsibilityCents,
  shouldFileSecondary,
} from "./secondary-claim";
import { build837P, type Claim837Input } from "./edi/edi-837p";
import { validateSnip1to5 } from "./edi/snip-validator";
import type { Era835ClaimPayment } from "./era-parser";

const FIXED = new Date(Date.UTC(2026, 3, 28, 13, 30));
const ERA_DATE = new Date(Date.UTC(2026, 3, 15));

function basePrimary(): Claim837Input {
  return {
    submitter: { name: "GREEN PATH HEALTH", id: "GREENPATH", contactName: "BILLING", contactPhone: "5555550100" },
    receiver: { name: "AETNA", id: "60054" },
    billingProvider: {
      organizationName: "GREEN PATH HEALTH PC",
      npi: "1234567893",
      taxId: "123456789",
      taxonomyCode: "207RI0008X",
      address: { line1: "1 MAIN ST", city: "BOSTON", state: "MA", postalCode: "02110" },
      payToAddress: null,
    },
    subscriber: {
      memberId: "M-PRIMARY",
      firstName: "JANE",
      lastName: "DOE",
      dateOfBirth: new Date(Date.UTC(1985, 0, 15)),
      gender: "F",
      address: { line1: "12 ELM ST", city: "BOSTON", state: "MA", postalCode: "02115" },
      relationshipToPatient: "18",
      insuranceType: "MB",
    },
    patient: null,
    payer: { name: "MEDICARE", payerId: "MEDICARE" },
    rendering: { npi: "1932456783", firstName: "ANITA", lastName: "PATEL", taxonomyCode: "207RI0008X" },
    claim: {
      patientControlNumber: "CLM0001",
      totalChargeCents: 15000,
      placeOfService: "11",
      frequencyCode: "1",
      diagnoses: ["F12.20"],
      serviceDate: new Date(Date.UTC(2026, 3, 1)),
    },
    serviceLines: [
      {
        sequence: 1,
        cptCode: "99213",
        modifiers: ["25"],
        units: 1,
        chargeCents: 15000,
        diagnosisPointers: [1],
        serviceDate: new Date(Date.UTC(2026, 3, 1)),
        placeOfService: "11",
      },
    ],
  };
}

function baseEra(): Era835ClaimPayment {
  return {
    claimControlNumber: "CLM0001",
    payerClaimId: "MEDICARE-9876",
    claimStatusCode: "1",
    totalChargeCents: 15000,
    totalPaidCents: 9600,
    patientRespCents: 2400,
    claimAdjustments: [],
    serviceLines: [
      {
        cptCode: "99213",
        modifiers: ["25"],
        chargeCents: 15000,
        paidCents: 9600,
        units: 1,
        adjustments: [
          { groupCode: "CO", carcCode: "45", amountCents: 3000, quantity: 1 },
          { groupCode: "PR", carcCode: "1", amountCents: 2400, quantity: 1 },
        ],
      },
    ],
  };
}

describe("buildSecondaryClaimInput", () => {
  it("attaches primaryAdjudication to every matched line", () => {
    const r = buildSecondaryClaimInput({
      primaryInput: basePrimary(),
      primaryAdjudication: baseEra(),
      primaryEraDate: ERA_DATE,
      secondaryPayer: { name: "AETNA", payerId: "60054" },
      secondarySubscriber: { ...basePrimary().subscriber, memberId: "AET-1", insuranceType: "CI" },
    });
    expect(r.warnings).toEqual([]);
    expect(r.input.serviceLines[0].primaryAdjudication).toBeDefined();
    expect(r.input.serviceLines[0].primaryAdjudication?.paidCents).toBe(9600);
    expect(r.input.serviceLines[0].primaryAdjudication?.cas).toEqual([
      { groupCode: "CO", reasonCode: "45", amountCents: 3000 },
      { groupCode: "PR", reasonCode: "1", amountCents: 2400 },
    ]);
  });

  it("produces a build837P-compatible secondary input that passes SNIP", () => {
    const r = buildSecondaryClaimInput({
      primaryInput: basePrimary(),
      primaryAdjudication: baseEra(),
      primaryEraDate: ERA_DATE,
      secondaryPayer: { name: "AETNA", payerId: "60054" },
      secondarySubscriber: { ...basePrimary().subscriber, memberId: "AET-1", insuranceType: "CI" },
    });
    const built = build837P(r.input, {
      isaControlNumber: 1,
      gsControlNumber: 1,
      stControlNumber: "0001",
      date: FIXED,
    });
    const report = validateSnip1to5(built.payload);
    expect(report.findings).toEqual([]);
    expect(report.passed).toBe(true);
    expect(built.payload).toContain("CAS*CO*45*30.00");
    expect(built.payload).toContain("CAS*PR*1*24.00");
    expect(built.payload).toContain("AMT*D*96.00");
    expect(built.payload).toContain("REF*F8*MEDICARE-9876");
  });

  it("warns when ERA has no matching service line", () => {
    const era = baseEra();
    era.serviceLines[0].cptCode = "99214"; // doesn't match the 99213 we billed
    const r = buildSecondaryClaimInput({
      primaryInput: basePrimary(),
      primaryAdjudication: era,
      primaryEraDate: ERA_DATE,
      secondaryPayer: { name: "AETNA", payerId: "60054" },
      secondarySubscriber: { ...basePrimary().subscriber, memberId: "AET-1", insuranceType: "CI" },
    });
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.input.serviceLines[0].primaryAdjudication).toBeUndefined();
  });

  it("collapses CR/WO 835 group codes into OA per X12 5010 IG", () => {
    const era = baseEra();
    era.claimAdjustments = [
      { groupCode: "WO", carcCode: "23", amountCents: 100, quantity: 1 },
      { groupCode: "CR", carcCode: "94", amountCents: 50, quantity: 1 },
    ];
    const r = buildSecondaryClaimInput({
      primaryInput: basePrimary(),
      primaryAdjudication: era,
      primaryEraDate: ERA_DATE,
      secondaryPayer: { name: "AETNA", payerId: "60054" },
      secondarySubscriber: { ...basePrimary().subscriber, memberId: "AET-1", insuranceType: "CI" },
    });
    expect(r.input.secondary?.primaryCas.map((c) => c.groupCode)).toEqual(["OA", "OA"]);
  });
});

describe("shouldFileSecondary", () => {
  it("true when there's patient responsibility on a paid claim", () => {
    expect(shouldFileSecondary(baseEra())).toBe(true);
  });
  it("false when claim was denied", () => {
    const era = baseEra();
    era.claimStatusCode = "4";
    expect(shouldFileSecondary(era)).toBe(false);
  });
  it("false when there's no patient balance", () => {
    const era = baseEra();
    era.patientRespCents = 0;
    era.serviceLines[0].adjustments = era.serviceLines[0].adjustments.filter(
      (a) => a.groupCode !== "PR",
    );
    expect(shouldFileSecondary(era)).toBe(false);
  });
});

describe("patientResponsibilityCents", () => {
  it("returns CLP05 directly when present", () => {
    expect(patientResponsibilityCents(baseEra())).toBe(2400);
  });
  it("falls back to summing PR adjustments when CLP05 is 0", () => {
    const era = baseEra();
    era.patientRespCents = 0;
    expect(patientResponsibilityCents(era)).toBe(2400);
  });
});

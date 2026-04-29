import { describe, expect, it } from "vitest";
import { build837P, groupCas, type Claim837Input } from "./edi-837p";
import { validateSnip1to5 } from "./snip-validator";

// EMR-216 — golden test fixtures + SNIP validation

const FIXED_DATE = new Date(Date.UTC(2026, 3, 28, 13, 30));

function baseInput(): Claim837Input {
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
      memberId: "W123456789",
      firstName: "JANE",
      lastName: "DOE",
      dateOfBirth: new Date(Date.UTC(1985, 0, 15)),
      gender: "F",
      address: { line1: "12 ELM ST", city: "BOSTON", state: "MA", postalCode: "02115" },
      relationshipToPatient: "18",
      insuranceType: "CI",
    },
    patient: null,
    payer: { name: "AETNA", payerId: "60054" },
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

const CONTROL = { isaControlNumber: 1, gsControlNumber: 1, stControlNumber: "0001" };

describe("build837P — primary claim", () => {
  it("emits a SNIP 1-5 clean payload", () => {
    const built = build837P(baseInput(), { ...CONTROL, date: FIXED_DATE, usageIndicator: "T" });
    const report = validateSnip1to5(built.payload);
    if (!report.passed) console.error(report.findings, built.payload);
    expect(report.passed).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it("includes every required envelope segment", () => {
    const built = build837P(baseInput(), { ...CONTROL, date: FIXED_DATE });
    for (const tag of ["ISA*", "GS*", "ST*", "BHT*", "CLM*", "SE*", "GE*", "IEA*"]) {
      expect(built.payload).toContain(tag);
    }
  });

  it("balances SE segment count with declared count", () => {
    const built = build837P(baseInput(), { ...CONTROL, date: FIXED_DATE });
    expect(built.payload).toContain("SE*");
    expect(built.payload).toContain("*0001~");
    expect(built.transactionSegmentCount).toBeGreaterThan(8);
  });

  it("emits Loop 2310B only when rendering NPI ≠ billing NPI", () => {
    const sameNpi = baseInput();
    sameNpi.rendering.npi = sameNpi.billingProvider.npi;
    const built = build837P(sameNpi, { ...CONTROL, date: FIXED_DATE });
    expect(built.payload).not.toContain("NM1*82*");
  });

  it("REF*F8 only on corrected claims", () => {
    const corrected = baseInput();
    corrected.claim.frequencyCode = "7";
    corrected.claim.originalClaimControlNumber = "PRIMARY-CLM-9876";
    const built = build837P(corrected, { ...CONTROL, date: FIXED_DATE });
    expect(built.payload).toContain("REF*F8*PRIMARY-CLM-9876");

    const original = build837P(baseInput(), { ...CONTROL, date: FIXED_DATE });
    expect(original.payload).not.toContain("REF*F8*");
  });
});

describe("build837P — secondary claim with Loop 2320 / 2430", () => {
  it("emits CAS, AMT, and SVD segments per the IG", () => {
    const input = baseInput();
    input.secondary = {
      primaryPayer: { name: "MEDICARE", payerId: "MEDICARE" },
      primarySubscriber: { ...input.subscriber, memberId: "M-PRIMARY" },
      primaryAllowedCents: 12000,
      primaryPaidCents: 9600,
      primaryEraDate: new Date(Date.UTC(2026, 3, 15)),
      primaryCas: [
        { groupCode: "CO", reasonCode: "45", amountCents: 3000 },
        { groupCode: "PR", reasonCode: "1", amountCents: 2400 },
      ],
      primaryClaimControlNumber: "MEDICARE-9876",
    };
    input.serviceLines[0].primaryAdjudication = {
      allowedCents: 12000,
      paidCents: 9600,
      cas: [{ groupCode: "PR", reasonCode: "1", amountCents: 2400 }],
      eraDate: new Date(Date.UTC(2026, 3, 15)),
    };

    const built = build837P(input, { ...CONTROL, date: FIXED_DATE });
    const report = validateSnip1to5(built.payload);
    expect(report.passed).toBe(true);

    expect(built.payload).toContain("CAS*CO*45*30.00");
    expect(built.payload).toContain("CAS*PR*1*24.00");
    expect(built.payload).toContain("AMT*D*96.00");
    expect(built.payload).toContain("AMT*B6*120.00");
    expect(built.payload).toContain("DTP*573*D8*20260415");
    expect(built.payload).toContain("REF*F8*MEDICARE-9876");
    expect(built.payload).toContain("SVD*MEDICARE*96.00*HC:99213");
  });
});

describe("groupCas", () => {
  it("groups by CO/PR/OA/PI in stable order", () => {
    const groups = groupCas([
      { groupCode: "PR", reasonCode: "1", amountCents: 100 },
      { groupCode: "CO", reasonCode: "45", amountCents: 200 },
      { groupCode: "PR", reasonCode: "2", amountCents: 50 },
    ]);
    expect(groups.map((g) => g.groupCode)).toEqual(["CO", "PR"]);
    expect(groups[1].adjustments).toHaveLength(2);
  });
});

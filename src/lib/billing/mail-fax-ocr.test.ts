import { describe, expect, it } from "vitest";
import {
  crossCheckCoverage,
  extractInsuranceFromOcr,
  summarizeCrossCheck,
  type CoverageOnFile,
} from "./mail-fax-ocr";

// EMR-172 — Mail/Fax OCR + insurance cross-check

describe("extractInsuranceFromOcr", () => {
  it("extracts payer + member id + group from a typical insurance card scan", () => {
    const ocr = `
      AETNA HEALTHCARE
      Member ID: W123456789
      Group #: 0042-ABC
      Plan Type: PPO
      Effective: 01/01/2026
    `;
    const { documentType, extracted } = extractInsuranceFromOcr(ocr);
    expect(documentType).toBe("insurance-card");
    expect(extracted.payerName).toBe("Aetna");
    expect(extracted.memberId).toBe("W123456789");
    expect(extracted.groupNumber).toBe("0042-ABC");
    expect(extracted.planType).toBe("PPO");
  });

  it("detects EOB document type", () => {
    const ocr = "Blue Cross Blue Shield\nExplanation of Benefits\nMember ID: ABC12345";
    const { documentType, extracted } = extractInsuranceFromOcr(ocr);
    expect(documentType).toBe("eob");
    expect(extracted.payerName).toBe("Blue Cross Blue Shield");
  });

  it("extracts Rx BIN/PCN when present", () => {
    const ocr = "United Healthcare\nRxBIN: 610502  RxPCN: ADV";
    const { extracted } = extractInsuranceFromOcr(ocr);
    expect(extracted.rxBin).toBe("610502");
    expect(extracted.rxPcn).toBe("ADV");
  });

  it("returns nulls when fields are missing", () => {
    const { extracted } = extractInsuranceFromOcr("Generic letter, no payer info");
    expect(extracted.payerName).toBeNull();
    expect(extracted.memberId).toBeNull();
    expect(extracted.groupNumber).toBeNull();
  });
});

describe("crossCheckCoverage", () => {
  const aetnaOnFile: CoverageOnFile[] = [
    { payerName: "Aetna", memberId: "W123456789", groupNumber: "0042-ABC" },
  ];

  it("flags exact match when scanned values agree with on-file", () => {
    const ocr = "AETNA\nMember ID: W123456789\nGroup #: 0042-ABC";
    const result = crossCheckCoverage(ocr, aetnaOnFile);
    expect(result.isExactMatch).toBe(true);
    expect(result.mismatches).toHaveLength(0);
    expect(result.confidence).toBe("high");
  });

  it("flags member id mismatch when only one digit changes", () => {
    const ocr = "AETNA\nMember ID: W123456788\nGroup #: 0042-ABC";
    const result = crossCheckCoverage(ocr, aetnaOnFile);
    expect(result.isExactMatch).toBe(false);
    expect(result.mismatches.map((m) => m.field)).toContain("memberId");
  });

  it("flags new coverage when payer is not on file", () => {
    const ocr = "Cigna\nMember ID: C-555-001";
    const result = crossCheckCoverage(ocr, aetnaOnFile);
    expect(result.isNewCoverage).toBe(true);
    expect(result.isExactMatch).toBe(false);
  });

  it("returns low confidence when too few fields are extractable", () => {
    const result = crossCheckCoverage("nondescript letter", aetnaOnFile);
    expect(result.confidence).toBe("low");
  });

  it("ignores dash differences when comparing group numbers", () => {
    // Scanned without dash, on-file with dash — normalizeForCompare
    // strips both so the two should be equivalent.
    const ocr = "AETNA\nMember ID: W123456789\nGroup #: 0042ABC";
    const result = crossCheckCoverage(ocr, aetnaOnFile);
    expect(result.mismatches.find((m) => m.field === "groupNumber")).toBeUndefined();
  });
});

describe("summarizeCrossCheck", () => {
  it("returns positive copy when match is exact", () => {
    const result = crossCheckCoverage(
      "AETNA\nMember ID: W123456789\nGroup #: 0042-ABC",
      [{ payerName: "Aetna", memberId: "W123456789", groupNumber: "0042-ABC" }]
    );
    expect(summarizeCrossCheck(result)).toMatch(/match/i);
  });

  it("identifies new coverage in the summary", () => {
    const result = crossCheckCoverage("Cigna\nMember ID: C-12345", []);
    expect(summarizeCrossCheck(result)).toMatch(/new coverage/i);
  });
});

import { describe, expect, it } from "vitest";
import { classifyClaimStatus, parseAndSummarize } from "./parser-835";

const SAMPLE_835 = [
  "ISA*00*          *00*          *ZZ*PAYER          *ZZ*GREENPATH      *260415*1330*^*00501*000000001*0*P*:~",
  "GS*HP*PAYER*GREENPATH*20260415*1330*1*X*005010X221A1~",
  "ST*835*0001~",
  "BPR*I*200.00*C*ACH*CCP*01*123456789*DA*987654321*1234567890**01*123456789*DA*987654321*20260415~",
  "TRN*1*EFT-9999*1234567890~",
  "N1*PR*MEDICARE~",
  "N1*PE*GREEN PATH HEALTH PC*XX*1234567893~",
  "CLP*CLM0001*1*150.00*200.00*0*MB*MEDICARE-9876*11*1~",
  "SVC*HC:99213*150.00*200.00**1~",
  "CAS*CO*45*-50.00~",
  "PLB*1234567893*20260415*WO:CKNO123*-25.00~",
  "SE*9*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

describe("parseAndSummarize", () => {
  it("classifies and totals a paid claim", () => {
    const r = parseAndSummarize(SAMPLE_835);
    expect(r.summary.totalClaims).toBe(1);
    expect(r.summary.paid).toBe(1);
    expect(r.summary.totalPaidCents).toBe(20000);
    expect(r.era.payerName).toBe("MEDICARE");
    expect(r.era.checkNumber).toBe("EFT-9999");
  });
});

describe("classifyClaimStatus", () => {
  function claim(code: string, paid = 100, charge = 100) {
    return {
      claimControlNumber: "1",
      payerClaimId: null,
      claimStatusCode: code,
      totalChargeCents: charge,
      totalPaidCents: paid,
      patientRespCents: 0,
      claimAdjustments: [],
      serviceLines: [],
    };
  }
  it("status 1 = paid", () => {
    expect(classifyClaimStatus(claim("1"))).toBe("paid");
  });
  it("status 4 = denied", () => {
    expect(classifyClaimStatus(claim("4"))).toBe("denied");
  });
  it("status 22 = reversal", () => {
    expect(classifyClaimStatus(claim("22"))).toBe("reversal");
  });
  it("unknown status with partial payment falls back to partial", () => {
    expect(classifyClaimStatus(claim("99", 50, 100))).toBe("partial");
  });
});

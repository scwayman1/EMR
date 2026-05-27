import { describe, expect, it } from "vitest";
import {
  hashEraPayload,
  parseEra835,
  parseJsonEra,
  reconcileEraTotals,
  tokenizeSegments,
  Era835ParseError,
} from "./era-parser";

// Minimal CMS-style 835 fixture — one payer, one check, two service lines
// on a single claim. Pipe-delimited segments, "*" element separator.
const MINIMAL_835 = [
  "ISA*00*          *00*          *ZZ*PAYER          *ZZ*PROVIDER       *060309*0900*U*00401*000000001*0*P*:~",
  "GS*HP*PAYER*PROVIDER*20060309*0900*1*X*004010X091A1~",
  "ST*835*1234~",
  "BPR*I*150.00*C*ACH*CTX*01*999999992*DA*123456*1234567890**01*999988880*DA*98765*20060310~",
  "TRN*1*EFT12345*1234567890~",
  "DTM*405*20060310~",
  "N1*PR*BLUE CROSS BLUE SHIELD~",
  "N3*PO BOX 100~",
  "N4*ANYWHERE*PA*17109~",
  "N1*PE*LEAFJOURNEY HEALTH*XX*1234567890~",
  "CLP*CLM-001*1*200.00*150.00*40.00*12*PCN-001~",
  "SVC*HC:99214*100.00*80.00**1~",
  "CAS*CO*45*20.00~",
  "CAS*PR*1*20.00~",
  "SVC*HC:36415*100.00*70.00**1~",
  "CAS*CO*45*10.00~",
  "CAS*PR*2*20.00~",
  "PLB*1234567890*20061231*WO:ckno1234*-25.00~",
  "SE*16*1234~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

describe("tokenizeSegments", () => {
  it("splits on the auto-detected segment delimiter", () => {
    const segs = tokenizeSegments(MINIMAL_835);
    expect(segs.length).toBeGreaterThan(15);
    expect(segs[0][0]).toBe("ISA");
    expect(segs.find((s) => s[0] === "BPR")?.[2]).toBe("150.00");
  });

  it("handles newline-delimited 835 (CMS sample format)", () => {
    const lf = "ST*835*1\nBPR*I*100.00*C*ACH*CTX*01*X*DA*1*X**01*Y*DA*2*20240101\nTRN*1*ABC*X\nSE*3*1";
    const segs = tokenizeSegments(lf);
    expect(segs.map((s) => s[0])).toEqual(["ST", "BPR", "TRN", "SE"]);
  });
});

describe("parseEra835", () => {
  it("parses a minimal 835 into a structured payload", () => {
    const era = parseEra835(MINIMAL_835);
    expect(era.payerName).toBe("BLUE CROSS BLUE SHIELD");
    expect(era.checkNumber).toBe("EFT12345");
    expect(era.totalPaymentCents).toBe(15000);
    expect(era.paymentMethod).toBe("ach");
    expect(era.claimPayments).toHaveLength(1);
  });

  it("captures every adjustment under each service line", () => {
    const era = parseEra835(MINIMAL_835);
    const claim = era.claimPayments[0];
    expect(claim.claimControlNumber).toBe("CLM-001");
    expect(claim.totalChargeCents).toBe(20000);
    expect(claim.totalPaidCents).toBe(15000);
    expect(claim.serviceLines).toHaveLength(2);
    const [line1, line2] = claim.serviceLines;
    expect(line1.cptCode).toBe("99214");
    expect(line1.adjustments).toEqual([
      { groupCode: "CO", carcCode: "45", amountCents: 2000, quantity: 1 },
      { groupCode: "PR", carcCode: "1", amountCents: 2000, quantity: 1 },
    ]);
    expect(line2.cptCode).toBe("36415");
  });

  it("captures PLB provider-level adjustments", () => {
    const era = parseEra835(MINIMAL_835);
    expect(era.plbAdjustments).toHaveLength(1);
    expect(era.plbAdjustments[0]).toEqual({
      reasonCode: "WO",
      reference: "ckno1234",
      amountCents: -2500,
    });
  });

  it("flips the sign on reversal status codes (19/20/21/22)", () => {
    const reversal = MINIMAL_835.replace("CLP*CLM-001*1*", "CLP*CLM-001*22*");
    const era = parseEra835(reversal);
    expect(era.claimPayments[0].totalPaidCents).toBeLessThan(0);
  });

  it("throws Era835ParseError when TRN trace is missing", () => {
    const broken = MINIMAL_835.replace("TRN*1*EFT12345*1234567890~", "");
    expect(() => parseEra835(broken)).toThrow(Era835ParseError);
  });

  it("throws on empty payload", () => {
    expect(() => parseEra835("")).toThrow(Era835ParseError);
  });
});

describe("hashEraPayload", () => {
  it("produces stable hashes ignoring whitespace differences", () => {
    const a = "ST*835*1~BPR*I*100*C*ACH*~TRN*1*ABC*1~SE*3*1~";
    const b = "ST*835*1~\nBPR*I*100*C*ACH*~\n  TRN*1*ABC*1~\nSE*3*1~";
    expect(hashEraPayload(a)).toBe(hashEraPayload(b));
  });

  it("produces different hashes for different content", () => {
    const a = "ST*835*1~TRN*1*ABC*1~";
    const b = "ST*835*1~TRN*1*XYZ*1~";
    expect(hashEraPayload(a)).not.toBe(hashEraPayload(b));
  });
});

describe("parseJsonEra", () => {
  it("normalizes a commercial-gateway JSON envelope to the same shape", () => {
    const era = parseJsonEra({
      payer: { name: "Aetna", id: "60054" },
      payee: { name: "Practice", npi: "1234567890" },
      trace: "TRACE-9",
      check_date: "2026-04-15",
      payment_method: "ACH",
      total_amount: 250.0,
      claims: [
        {
          claim_control: "CLM-2",
          status_code: "1",
          charge: 300,
          paid: 250,
          patient_resp: 50,
          adjustments: [{ group: "PR", carc: "2", amount: 50 }],
          services: [{ cpt: "99213", charge: 150, paid: 125, units: 1 }],
        },
      ],
      plb: [{ reason: "L6", amount: 5, reference: "INT" }],
    });
    expect(era.payerName).toBe("Aetna");
    expect(era.totalPaymentCents).toBe(25000);
    expect(era.claimPayments[0].patientRespCents).toBe(5000);
    expect(era.plbAdjustments[0]).toEqual({ reasonCode: "L6", reference: "INT", amountCents: 500 });
  });

  it("throws when required fields are missing", () => {
    expect(() => parseJsonEra({ trace: "x" } as unknown)).toThrow(Era835ParseError);
  });
});

describe("reconcileEraTotals", () => {
  it("balances when claim_sum - PLB_sum == BPR within tolerance", () => {
    const result = reconcileEraTotals({
      payerName: "X",
      payerId: null,
      payeeName: "Y",
      payeeNpi: null,
      checkNumber: "1",
      checkDate: new Date(),
      paymentMethod: "ach",
      totalPaymentCents: 15000,
      claimPayments: [
        {
          claimControlNumber: "1",
          payerClaimId: null,
          claimStatusCode: "1",
          totalChargeCents: 20000,
          totalPaidCents: 17500,
          patientRespCents: 0,
          claimAdjustments: [],
          serviceLines: [],
        },
      ],
      plbAdjustments: [{ reasonCode: "WO", amountCents: 2500, reference: null }],
    });
    expect(result.balanced).toBe(true);
  });

  it("flags variance with a human-readable message", () => {
    const result = reconcileEraTotals({
      payerName: "X",
      payerId: null,
      payeeName: "Y",
      payeeNpi: null,
      checkNumber: "1",
      checkDate: new Date(),
      paymentMethod: "ach",
      totalPaymentCents: 10000,
      claimPayments: [
        {
          claimControlNumber: "1",
          payerClaimId: null,
          claimStatusCode: "1",
          totalChargeCents: 20000,
          totalPaidCents: 12500,
          patientRespCents: 0,
          claimAdjustments: [],
          serviceLines: [],
        },
      ],
      plbAdjustments: [],
    });
    expect(result.balanced).toBe(false);
    if (!result.balanced) {
      expect(result.varianceCents).toBe(-2500);
      expect(result.message).toContain("do not balance");
    }
  });
});

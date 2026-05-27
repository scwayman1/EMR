import { describe, expect, it } from "vitest";
import { detectClaimUnderpayments, summarizeUnderpayments } from "./allowables";
import type { ContractLite } from "./allowables";

const CONTRACT: ContractLite = {
  id: "ct-1",
  payerId: "AETNA",
  payerName: "Aetna",
  effectiveStart: new Date(Date.UTC(2026, 0, 1)),
  effectiveEnd: null,
  active: true,
  rates: [
    { cptCode: "99213", modifier: null, allowedCents: 10000 },
    { cptCode: "99213", modifier: "GT", allowedCents: 8500 }, // telehealth
  ],
};

describe("detectClaimUnderpayments", () => {
  it("flags lines paid below 95% of contract", () => {
    const r = detectClaimUnderpayments({
      contracts: [CONTRACT],
      payerId: "AETNA",
      serviceDate: new Date(Date.UTC(2026, 3, 1)),
      lines: [{ cptCode: "99213", allowedCents: 9000 }], // < 95% of 100
    });
    expect(r.contractId).toBe("ct-1");
    expect(r.underpaidLineCount).toBe(1);
    expect(r.totalShortfallCents).toBe(1000);
  });

  it("uses modifier-specific rate when present", () => {
    const r = detectClaimUnderpayments({
      contracts: [CONTRACT],
      payerId: "AETNA",
      serviceDate: new Date(Date.UTC(2026, 3, 1)),
      lines: [{ cptCode: "99213", modifiers: ["GT"], allowedCents: 8400 }],
    });
    expect(r.lineFindings[0].contractRateCents).toBe(8500);
    expect(r.lineFindings[0].underpaid).toBe(false); // 8400/8500 = 98.8%
  });

  it("returns no findings when no contract matches", () => {
    const r = detectClaimUnderpayments({
      contracts: [],
      payerId: "AETNA",
      serviceDate: new Date(Date.UTC(2026, 3, 1)),
      lines: [{ cptCode: "99213", allowedCents: 1 }],
    });
    expect(r.contractId).toBeNull();
    expect(r.underpaidLineCount).toBe(0);
  });
});

describe("summarizeUnderpayments", () => {
  it("rolls up by payer, sorted by shortfall", () => {
    const summary = summarizeUnderpayments([
      {
        payerId: "AETNA",
        payerName: "Aetna",
        report: {
          contractId: "ct-1",
          lineFindings: [],
          totalShortfallCents: 500,
          underpaidLineCount: 1,
        },
      },
      {
        payerId: "BCBS",
        payerName: "BCBS",
        report: {
          contractId: "ct-2",
          lineFindings: [],
          totalShortfallCents: 1500,
          underpaidLineCount: 2,
        },
      },
      {
        payerId: "BCBS",
        payerName: "BCBS",
        report: {
          contractId: "ct-2",
          lineFindings: [],
          totalShortfallCents: 0,
          underpaidLineCount: 0,
        },
      },
    ]);
    expect(summary.totalClaims).toBe(3);
    expect(summary.underpaidClaims).toBe(2);
    expect(summary.totalShortfallCents).toBe(2000);
    expect(summary.byPayer[0].payerId).toBe("BCBS");
    expect(summary.byPayer[0].shortfallCents).toBe(1500);
  });
});

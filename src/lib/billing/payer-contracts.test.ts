import { describe, expect, it } from "vitest";
import {
  evaluateUnderpayment,
  findEffectiveContract,
  lookupContractRate,
  parseContractCsv,
  type ContractLite,
} from "./payer-contracts";

const day = (d: string) => new Date(d);

const aetnaOld: ContractLite = {
  id: "c1",
  payerId: "60054",
  payerName: "Aetna",
  effectiveStart: day("2025-01-01"),
  effectiveEnd: day("2025-12-31"),
  active: true,
  rates: [
    { cptCode: "99214", modifier: null, allowedCents: 13000 },
  ],
};
const aetnaNew: ContractLite = {
  id: "c2",
  payerId: "60054",
  payerName: "Aetna",
  effectiveStart: day("2026-01-01"),
  effectiveEnd: null,
  active: true,
  rates: [
    { cptCode: "99214", modifier: null, allowedCents: 14000 },
    { cptCode: "99214", modifier: "95", allowedCents: 11500 },
    { cptCode: "36415", modifier: null, allowedCents: 800 },
  ],
};
const inactiveBcbs: ContractLite = {
  id: "c3",
  payerId: "00100",
  payerName: "BCBS",
  effectiveStart: day("2024-01-01"),
  effectiveEnd: null,
  active: false,
  rates: [{ cptCode: "99214", modifier: null, allowedCents: 12000 }],
};
const all = [aetnaOld, aetnaNew, inactiveBcbs];

describe("findEffectiveContract", () => {
  it("picks the contract whose effective window covers the DOS", () => {
    const c = findEffectiveContract(all, "60054", day("2025-06-01"));
    expect(c?.id).toBe("c1");
  });

  it("prefers the latest effectiveStart when multiple contracts cover the DOS", () => {
    const c = findEffectiveContract(all, "60054", day("2026-03-01"));
    expect(c?.id).toBe("c2");
  });

  it("returns null when no contract covers the DOS", () => {
    expect(findEffectiveContract(all, "60054", day("2024-12-31"))).toBeNull();
  });

  it("ignores inactive contracts even if dates would otherwise match", () => {
    expect(findEffectiveContract(all, "00100", day("2025-06-01"))).toBeNull();
  });
});

describe("lookupContractRate", () => {
  it("matches modifier-specific rates first when billed with that modifier", () => {
    const r = lookupContractRate(aetnaNew, "99214", ["95"]);
    expect(r?.allowedCents).toBe(11500);
  });

  it("falls back to the base rate when modifier-specific not on file", () => {
    const r = lookupContractRate(aetnaNew, "99214", ["GT"]);
    expect(r?.allowedCents).toBe(14000);
  });

  it("returns null for CPTs not in the contract", () => {
    expect(lookupContractRate(aetnaNew, "99999", [])).toBeNull();
  });
});

describe("evaluateUnderpayment", () => {
  it("flags allowed amounts under the 95% threshold", () => {
    const r = evaluateUnderpayment({
      contract: aetnaNew,
      cptCode: "99214",
      allowedCents: 12000, // contract is 14000; 95% = 13300
    });
    expect(r.underpaid).toBe(true);
    expect(r.shortfallCents).toBe(2000);
  });

  it("does not flag when within threshold", () => {
    const r = evaluateUnderpayment({
      contract: aetnaNew,
      cptCode: "99214",
      allowedCents: 13500,
    });
    expect(r.underpaid).toBe(false);
    expect(r.shortfallCents).toBe(0);
  });

  it("returns no-contract reason when contract is null", () => {
    const r = evaluateUnderpayment({
      contract: null,
      cptCode: "99214",
      allowedCents: 10000,
    });
    expect(r.underpaid).toBe(false);
    expect(r.contractRateCents).toBeNull();
    expect(r.reason).toContain("no contract");
  });

  it("returns no-rate reason when CPT not on file", () => {
    const r = evaluateUnderpayment({
      contract: aetnaNew,
      cptCode: "99999",
      allowedCents: 10000,
    });
    expect(r.underpaid).toBe(false);
    expect(r.reason).toContain("no contract rate");
  });

  it("respects custom thresholds", () => {
    const r = evaluateUnderpayment({
      contract: aetnaNew,
      cptCode: "99214",
      allowedCents: 13500,
      threshold: 1.0, // require full rate
    });
    expect(r.underpaid).toBe(true);
  });
});

describe("parseContractCsv", () => {
  it("parses a header-prefixed CSV", () => {
    const csv =
      "cpt_code,modifier,allowed_amount,notes\n" +
      "99214,,130.00,Office visit lvl 4\n" +
      "99214,95,115.00,Telehealth\n" +
      "36415,,8.00,Venipuncture\n";
    const r = parseContractCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.rates).toHaveLength(3);
    expect(r.rates[0]).toEqual({ cptCode: "99214", modifier: null, allowedCents: 13000 });
    expect(r.rates[1]).toEqual({ cptCode: "99214", modifier: "95", allowedCents: 11500 });
  });

  it("ignores blank and comment lines", () => {
    const csv = "# 2026 Aetna contract\n\ncpt_code,modifier,allowed_amount\n99214,,100.00\n";
    const r = parseContractCsv(csv);
    expect(r.rates).toHaveLength(1);
  });

  it("reports invalid rows without aborting", () => {
    const csv = "cpt_code,modifier,allowed_amount\n9999,,10.00\n99214,,bad\n99213,,50.00\n";
    const r = parseContractCsv(csv);
    expect(r.rates).toHaveLength(1);
    expect(r.errors).toHaveLength(2);
  });
});

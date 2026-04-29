import { describe, expect, it } from "vitest";
import {
  matchDeposit,
  parseBai2,
  parseBankCsv,
  parseOfx,
  type MatchCandidate,
} from "./lockbox";

const day = (d: string) => new Date(d);

describe("parseBankCsv", () => {
  it("parses a header-mapped CSV with date + amount", () => {
    const csv =
      "Date,Description,Amount,Reference\n" +
      "2026-04-15,LOCKBOX DEPOSIT,1500.00,DEP-001\n" +
      "2026-04-15,Wire incoming,750.50,DEP-002\n" +
      "2026-04-16,Branch deposit,200.00,DEP-003\n";
    const r = parseBankCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toMatchObject({
      bankReference: "DEP-001",
      amountCents: 150000,
      source: "lockbox",
    });
    expect(r.rows[1].source).toBe("wire");
    expect(r.rows[2].source).toBe("branch");
  });

  it("skips negative amounts (debits) and reports unparseable rows", () => {
    const csv = "Date,Amount\n2026-04-15,-50.00\n2026-04-15,oops\n2026-04-15,100\n";
    const r = parseBankCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].amountCents).toBe(10000);
    expect(r.errors.some((e) => e.message.includes("invalid amount"))).toBe(true);
  });

  it("synthesizes a bankReference when none provided", () => {
    const csv = "Date,Amount\n2026-04-15,100.00\n";
    const r = parseBankCsv(csv);
    expect(r.rows[0].bankReference).toMatch(/^20260415-10000-\d+$/);
  });
});

describe("parseBai2", () => {
  it("extracts deposit credits (1xx type codes) with the group date", () => {
    const bai2 =
      "01,SENDER,RECEIVER,260415,0900,FILE001,,,,2/\n" +
      "02,RECEIVER,SENDER,1,260415,,USD,2/\n" +
      "03,12345,USD,010,1500000,,/\n" +
      "16,115,150000,Z,LOCKBOX001,,LB DEPOSIT/\n" +
      "16,195,250000,Z,WIRE001,,INCOMING WIRE/\n" +
      "49,400000,3/\n" +
      "98,400000,1,4/\n" +
      "99,400000,1,6/\n";
    const r = parseBai2(bai2);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    const lockbox = r.rows.find((d) => d.bankReference === "LOCKBOX001");
    expect(lockbox?.amountCents).toBe(150000);
    expect(lockbox?.source).toBe("lockbox");
    expect(r.rows[1].source).toBe("wire");
  });

  it("ignores debit type codes (4xx)", () => {
    const bai2 =
      "02,RECEIVER,SENDER,1,260415,,USD,2/\n" +
      "16,475,50000,Z,WITHDRAWAL/\n" +
      "16,115,1000,Z,DEP/\n";
    const r = parseBai2(bai2);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].amountCents).toBe(1000);
  });
});

describe("parseOfx", () => {
  it("extracts CREDIT STMTTRN blocks", () => {
    const ofx = `
      <STMTTRN>
        <TRNTYPE>CREDIT
        <DTPOSTED>20260415120000
        <TRNAMT>500.00
        <FITID>OFX001
        <MEMO>LOCKBOX
      </STMTTRN>
      <STMTTRN>
        <TRNTYPE>DEBIT
        <DTPOSTED>20260415120000
        <TRNAMT>-50.00
        <FITID>OFX002
        <MEMO>FEE
      </STMTTRN>
      <STMTTRN>
        <TRNTYPE>DEP
        <DTPOSTED>20260416120000
        <TRNAMT>250
        <FITID>OFX003
      </STMTTRN>`;
    const r = parseOfx(ofx);
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].bankReference).toBe("OFX001");
    expect(r.rows[0].source).toBe("lockbox");
    expect(r.rows[1].bankReference).toBe("OFX003");
  });
});

describe("matchDeposit", () => {
  const candidates: MatchCandidate[] = [
    { kind: "era", id: "era1", amountCents: 50000, expectedDate: day("2026-04-14"), label: "Aetna ERA $500" },
    { kind: "era", id: "era2", amountCents: 30000, expectedDate: day("2026-04-15"), label: "BCBS ERA $300" },
    { kind: "payment", id: "pay1", amountCents: 7500, expectedDate: day("2026-04-15"), label: "Patient $75" },
    { kind: "payment", id: "pay2", amountCents: 15000, expectedDate: day("2026-04-13"), label: "Patient $150" },
  ];

  it("exact match wins outright when one candidate equals the deposit", () => {
    const out = matchDeposit({ amountCents: 50000, depositDate: day("2026-04-15") }, candidates);
    expect(out.status).toBe("matched");
    expect(out.assignments).toHaveLength(1);
    expect(out.assignments[0].candidate.id).toBe("era1");
    expect(out.varianceCents).toBe(0);
  });

  it("greedy multi-piece fill when no single exact match", () => {
    const out = matchDeposit({ amountCents: 37500, depositDate: day("2026-04-15") }, candidates);
    expect(out.status).toBe("matched");
    const ids = out.assignments.map((a) => a.candidate.id).sort();
    expect(ids).toEqual(["era2", "pay1"]);
    expect(out.matchedCents).toBe(37500);
  });

  it("partial match when greedy can't fill within tolerance", () => {
    const out = matchDeposit({ amountCents: 100000, depositDate: day("2026-04-15") }, candidates);
    expect(out.status).toBe("partially_matched");
    expect(out.varianceCents).toBeGreaterThan(0);
  });

  it("unmatched when no candidates fall in the date window", () => {
    const out = matchDeposit({ amountCents: 50000, depositDate: day("2026-05-30") }, candidates);
    expect(out.status).toBe("unmatched");
    expect(out.assignments).toHaveLength(0);
  });

  it("respects a custom date window", () => {
    const out = matchDeposit(
      { amountCents: 30000, depositDate: day("2026-04-15") },
      candidates,
      { dateWindowDays: 0 },
    );
    expect(out.status).toBe("matched");
    expect(out.assignments[0].candidate.id).toBe("era2");
  });

  it("absorbs sub-tolerance variance into a clean match", () => {
    const out = matchDeposit({ amountCents: 50001, depositDate: day("2026-04-15") }, candidates, {
      toleranceCents: 2,
    });
    expect(out.status).toBe("matched");
    expect(out.assignments[0].candidate.id).toBe("era1");
  });
});

import { describe, expect, it } from "vitest";
import {
  parseCmsDate,
  parseCsv,
  parseMueRow,
  parseNcciRow,
  quarterFromDate,
  quarterToStartDate,
} from "./ncci-mue";

// EMR-222 — pure parser tests (no DB)

describe("quarter helpers", () => {
  it("quarterFromDate", () => {
    expect(quarterFromDate(new Date(Date.UTC(2026, 0, 1)))).toBe("2026Q1");
    expect(quarterFromDate(new Date(Date.UTC(2026, 3, 1)))).toBe("2026Q2");
    expect(quarterFromDate(new Date(Date.UTC(2026, 11, 31)))).toBe("2026Q4");
  });

  it("quarterToStartDate round-trips", () => {
    expect(quarterToStartDate("2026Q3").toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("rejects bad quarter strings", () => {
    expect(() => quarterToStartDate("2026Q5")).toThrow();
  });
});

describe("parseCsv", () => {
  it("handles quoted commas", () => {
    expect(parseCsv('a,b,"c,d"\n1,2,3\n')).toEqual([
      ["a", "b", "c,d"],
      ["1", "2", "3"],
    ]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    expect(parseCsv('a,"b ""c"" d"\n')).toEqual([["a", 'b "c" d']]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseCmsDate", () => {
  it("parses MM/DD/YYYY as UTC", () => {
    const out = parseCmsDate("4/1/2026");
    expect(out?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
  it("returns null on blank or asterisk", () => {
    expect(parseCmsDate("")).toBeNull();
    expect(parseCmsDate("*")).toBeNull();
    expect(parseCmsDate(null)).toBeNull();
  });
});

describe("parseNcciRow", () => {
  const headers = ["Column 1", "Column 2", "Effective Date", "Deletion Date", "Modifier", "Rationale"];
  it("maps fields by header position", () => {
    const out = parseNcciRow(headers, ["99213", "99406", "1/1/2026", "*", "1", "Bundling"]);
    expect(out.column1Code).toBe("99213");
    expect(out.column2Code).toBe("99406");
    expect(out.modifierIndicator).toBe(1);
    expect(out.deletionDate).toBeNull();
    expect(out.rationale).toBe("Bundling");
  });

  it("throws on missing required codes", () => {
    expect(() => parseNcciRow(headers, ["", "", "1/1/2026", "*", "1", ""])).toThrow();
  });
});

describe("parseMueRow", () => {
  const headers = ["HCPCS Code", "MUE Value", "Adjudication", "Rationale", "Effective Date"];
  it("maps fields by header position", () => {
    const out = parseMueRow(headers, ["99213", "1", "1", "Service line", "1/1/2026"]);
    expect(out.hcpcsCode).toBe("99213");
    expect(out.mueValue).toBe(1);
    expect(out.adjudication).toBe(1);
  });
  it("throws on missing units", () => {
    expect(() => parseMueRow(headers, ["99213", "0", "1", "", "1/1/2026"])).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  buildGe,
  buildGs,
  buildIea,
  buildIsa,
  buildSe,
  buildSt,
  formatAmount,
  formatD8,
  padLeftZero,
  padRight,
  sanitizeX12,
  segment,
} from "./x12";

describe("sanitizeX12", () => {
  it("strips control characters", () => {
    expect(sanitizeX12("hello\nworld")).toBe("hello world");
    expect(sanitizeX12("a\tb\rc")).toBe("a b c");
  });
  it("strips delimiter characters that would corrupt segments", () => {
    expect(sanitizeX12("a*b:c~d^e")).toBe("abcde");
  });
});

describe("padding helpers", () => {
  it("padRight", () => {
    expect(padRight("ABC", 5)).toBe("ABC  ");
    expect(padRight("ABCDEF", 4)).toBe("ABCD");
  });
  it("padLeftZero", () => {
    expect(padLeftZero(12, 5)).toBe("00012");
    expect(padLeftZero(123456, 4)).toBe("3456");
  });
});

describe("formatD8 / formatAmount", () => {
  it("formats dates as YYYYMMDD UTC", () => {
    expect(formatD8(new Date(Date.UTC(2026, 0, 5)))).toBe("20260105");
  });
  it("formats cents to dollars with 2 decimals", () => {
    expect(formatAmount(12345)).toBe("123.45");
    expect(formatAmount(0)).toBe("0.00");
    expect(formatAmount(-500)).toBe("-5.00");
    expect(formatAmount(7)).toBe("0.07");
  });
});

describe("segment()", () => {
  it("emits a basic segment with element separators", () => {
    expect(segment("NM1", ["IL", "1", "Doe", "Jane"])).toBe("NM1*IL*1*Doe*Jane~");
  });

  it("trims trailing empty elements (delimiter compression)", () => {
    expect(segment("NM1", ["IL", "1", "Doe", null, null])).toBe("NM1*IL*1*Doe~");
  });

  it("handles composite (sub-element) elements", () => {
    expect(
      segment("CLM", [
        "ACME001",
        "150.00",
        null,
        null,
        { sub: ["11", "B", "1"] },
        "Y",
      ]),
    ).toBe("CLM*ACME001*150.00***11:B:1*Y~");
  });

  it("trims trailing empty sub-elements", () => {
    expect(segment("HI", [{ sub: ["ABK", "F12.2", null] }])).toBe("HI*ABK:F12.2~");
  });
});

describe("envelope builders", () => {
  it("ISA produces a fixed-position header", () => {
    const isa = buildIsa({
      authQualifier: "00",
      senderId: "GREENPATH",
      receiverId: "AVAILITY",
      date: new Date(Date.UTC(2026, 3, 28, 13, 30)),
      controlNumber: 1,
      usageIndicator: "T",
    });
    expect(isa.startsWith("ISA*00*")).toBe(true);
    expect(isa.endsWith(":~")).toBe(true);
    expect(isa).toContain("ZZ*GREENPATH      *");
    expect(isa).toContain("ZZ*AVAILITY       *");
    expect(isa).toContain("*000000001*");
  });

  it("GS / GE / ST / SE / IEA round-trip", () => {
    const gs = buildGs({
      functionalId: "HC",
      senderCode: "GREENPATH",
      receiverCode: "AVAILITY",
      date: new Date(Date.UTC(2026, 3, 28, 13, 30)),
      controlNumber: 1,
      versionCode: "005010X222A1",
    });
    expect(gs).toBe("GS*HC*GREENPATH*AVAILITY*20260428*1330*1*X*005010X222A1~");

    expect(buildSt("837", "0001", "005010X222A1")).toBe("ST*837*0001*005010X222A1~");
    expect(buildSe(8, "0001")).toBe("SE*8*0001~");
    expect(buildGe(1, 1)).toBe("GE*1*1~");
    expect(buildIea(7, 1)).toBe("IEA*1*000000007~");
  });
});

import { describe, expect, it } from "vitest";
import { validateSnip1to5 } from "./snip-validator";

// EMR-216 — focused failure cases for each SNIP level

// CLM05 is the 5th data element after the segment id; its composite
// (POS:facility:freq) sits at parts[5] when the segment is split by "*".
// That requires 5 stars between "CLM" and the composite (CLM01..CLM04
// are empty here). Don't drift from that — the SNIP validator parses by
// position.
const ENVELOPE = "ISA*00*          *00*          *ZZ*X              *ZZ*Y              *260428*1330*^*00501*000000001*0*T*:~GS*HC*X*Y*20260428*1330*1*X*005010X222A1~ST*837*0001*005010X222A1~BHT*0019*00*1*20260428*1330*CH~CLM*1*100.00***11:B:1*Y*A*Y*Y~SE*4*0001~GE*1*1~IEA*1*000000001~";

describe("SNIP-1 integrity", () => {
  it("flags missing ISA leader", () => {
    const out = validateSnip1to5("GS*HC*X*Y*20260428*1330*1*X*005010X222A1~");
    expect(out.passed).toBe(false);
    expect(out.findings.some((f) => f.level === 1)).toBe(true);
  });

  it("flags unbalanced ISA/IEA", () => {
    const out = validateSnip1to5(ENVELOPE.replace("IEA*1*000000001~", ""));
    expect(out.findings.some((f) => f.level === 1 && /Unbalanced/.test(f.message))).toBe(true);
  });
});

describe("SNIP-2 required segments", () => {
  it("flags missing CLM", () => {
    const stripped = ENVELOPE.replace(/CLM\*[^~]*~/, "");
    const out = validateSnip1to5(stripped);
    expect(out.findings.some((f) => f.level === 2 && f.segment === "CLM")).toBe(true);
  });
});

describe("SNIP-3 balancing", () => {
  it("flags SE count mismatch", () => {
    const broken = ENVELOPE.replace("SE*4*0001~", "SE*99*0001~");
    const out = validateSnip1to5(broken);
    expect(out.findings.some((f) => f.level === 3)).toBe(true);
  });
});

describe("SNIP-4 situational", () => {
  it("flags REF*F8 on a frequency-1 claim", () => {
    const broken = ENVELOPE.replace("CLM*1*100.00***11:B:1*Y*A*Y*Y~", "CLM*1*100.00***11:B:1*Y*A*Y*Y~REF*F8*PRIOR-CLM~");
    const out = validateSnip1to5(broken);
    expect(out.findings.some((f) => f.level === 4 && f.segment === "REF*F8")).toBe(true);
  });
});

describe("SNIP-5 code sets", () => {
  it("flags an invalid place-of-service", () => {
    const broken = ENVELOPE.replace("11:B:1", "ZZ:B:1");
    const out = validateSnip1to5(broken);
    expect(out.findings.some((f) => f.level === 5 && /place-of-service/.test(f.message))).toBe(true);
  });
  it("flags an invalid claim frequency", () => {
    const broken = ENVELOPE.replace("11:B:1", "11:B:5");
    const out = validateSnip1to5(broken);
    expect(out.findings.some((f) => f.level === 5 && /frequency/.test(f.message))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { EligibilityClient } from "./eligibility-client";

const client = new EligibilityClient();

describe("EligibilityClient — cannabis dx flagging (regression for H-1)", () => {
  it("flags an F12 cannabis ICD on a 99214 request even though the service code is not cannabis-specific", async () => {
    const r = await client.checkEligibility({
      patientId: "p1",
      providerNpi: "1234567893",
      payerId: "medicare",
      serviceCode: "99214",
      diagnosisCodes: ["G89.4", "F12.20"],
    });
    expect(r.flags.cannabisDiagnosis).toBe(true);
    expect(r.flags.payerExcludesCannabis).toBe(true);
    expect(r.warnings.some((w) => /cannabis/i.test(w) && /Medicare/i.test(w))).toBe(true);
  });

  it("downgrades the warning when the payer covers cannabis with PA (Aetna)", async () => {
    const r = await client.checkEligibility({
      patientId: "p1",
      providerNpi: "1234567893",
      payerId: "aetna",
      serviceCode: "99214",
      diagnosisCodes: ["F12.20"],
    });
    expect(r.flags.cannabisDiagnosis).toBe(true);
    expect(r.flags.payerExcludesCannabis).toBe(false);
    expect(r.warnings.some((w) => /prior authorization/i.test(w))).toBe(true);
  });

  it("returns no cannabis warnings on a plain pain claim with no cannabis dx", async () => {
    const r = await client.checkEligibility({
      patientId: "p1",
      providerNpi: "1234567893",
      payerId: "aetna",
      serviceCode: "99213",
      diagnosisCodes: ["M54.50"],
    });
    expect(r.flags.cannabisDiagnosis).toBe(false);
    expect(r.flags.cannabisServiceCode).toBe(false);
    expect(r.warnings).toHaveLength(0);
  });

  it("keeps the legacy CPT-driven warning for S0339 even with no dx supplied", async () => {
    const r = await client.checkEligibility({
      patientId: "p1",
      providerNpi: "1234567893",
      payerId: "aetna",
      serviceCode: "S0339",
    });
    expect(r.flags.cannabisServiceCode).toBe(true);
    expect(r.warnings.some((w) => /non-covered/i.test(w))).toBe(true);
    expect(r.coverageDetails.copayAmount).toBe(0);
  });

  it("flags Z79.891 (long-term cannabis use) as a cannabis dx", async () => {
    const r = await client.checkEligibility({
      patientId: "p1",
      providerNpi: "1234567893",
      payerId: "tricare",
      serviceCode: "99214",
      diagnosisCodes: ["Z79.891"],
    });
    expect(r.flags.cannabisDiagnosis).toBe(true);
    expect(r.flags.payerExcludesCannabis).toBe(true); // TRICARE excludes
  });
});

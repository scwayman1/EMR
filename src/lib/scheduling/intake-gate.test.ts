import { describe, expect, it } from "vitest";

import { evaluateIntakeGate, type IntakeGateInput } from "./intake-gate";

const NOW = new Date("2026-06-01T12:00:00.000Z");

// A fully-satisfied, in-person new-patient gate input. Override per test.
function passingInput(overrides: Partial<IntakeGateInput> = {}): IntakeGateInput {
  return {
    visitType: "new_patient",
    treatmentPhase: "intake",
    isVirtual: false,
    patient: {
      dateOfBirth: new Date("1985-04-12T00:00:00.000Z"),
      addressLine1: "1 Main St",
      state: "CA",
      allergiesScreenedAt: new Date("2026-05-02T00:00:00.000Z"),
      cannabisHistory: { priorUse: "occasional" },
      presentingConcerns: "Chronic lower back pain for 6 months",
      intakeAnswers: { done: true },
      ageVerifiedAt: new Date("2026-05-01T00:00:00.000Z"),
    },
    consent: {
      visitConsentSignedAt: new Date("2026-05-10T00:00:00.000Z"),
      telehealthConsentSignedAt: null,
    },
    insurance: { coverageVerified: true, selfPayAttested: false },
    outcomeLogsSinceLastVisit: 0,
    ...overrides,
  };
}

function consentReq(input: IntakeGateInput) {
  return evaluateIntakeGate(input, NOW).requirements.find((r) => r.id === "consent")!;
}

describe("evaluateIntakeGate — consent freshness", () => {
  it("treats a signed consent as valid forever when no max-age window is set (legacy behaviour)", () => {
    const input = passingInput({
      consent: {
        visitConsentSignedAt: new Date("2022-01-01T00:00:00.000Z"), // 4+ years old
        telehealthConsentSignedAt: null,
      },
    });
    expect(consentReq(input).satisfied).toBe(true);
    expect(evaluateIntakeGate(input, NOW).allowConfirm).toBe(true);
  });

  it("accepts a consent signed within the freshness window", () => {
    const input = passingInput({
      consent: {
        visitConsentSignedAt: new Date("2026-05-10T00:00:00.000Z"), // ~22 days before NOW
        telehealthConsentSignedAt: null,
        visitConsentMaxAgeDays: 365,
      },
    });
    expect(consentReq(input).satisfied).toBe(true);
  });

  it("rejects a consent signed outside the freshness window and blocks confirmation", () => {
    const input = passingInput({
      consent: {
        visitConsentSignedAt: new Date("2024-01-01T00:00:00.000Z"), // ~880 days before NOW
        telehealthConsentSignedAt: null,
        visitConsentMaxAgeDays: 365,
      },
    });
    expect(consentReq(input).satisfied).toBe(false);
    const result = evaluateIntakeGate(input, NOW);
    expect(result.allowConfirm).toBe(false);
    expect(result.blockReason).toContain("consent");
  });

  it("for a virtual visit, a stale telehealth consent blocks even when the visit consent is fresh", () => {
    const input = passingInput({
      isVirtual: true,
      consent: {
        visitConsentSignedAt: new Date("2026-05-10T00:00:00.000Z"),
        telehealthConsentSignedAt: new Date("2025-01-01T00:00:00.000Z"), // stale
        visitConsentMaxAgeDays: 365,
        telehealthConsentMaxAgeDays: 30,
      },
    });
    expect(consentReq(input).satisfied).toBe(false);
  });

  it("treats a future-dated signature (clock skew) as fresh rather than failing the patient", () => {
    const input = passingInput({
      consent: {
        visitConsentSignedAt: new Date("2026-06-05T00:00:00.000Z"), // after NOW
        telehealthConsentSignedAt: null,
        visitConsentMaxAgeDays: 365,
      },
    });
    expect(consentReq(input).satisfied).toBe(true);
  });

  it("still fails when there is no signature at all, regardless of window", () => {
    const input = passingInput({
      consent: {
        visitConsentSignedAt: null,
        telehealthConsentSignedAt: null,
        visitConsentMaxAgeDays: 365,
      },
    });
    expect(consentReq(input).satisfied).toBe(false);
  });
});

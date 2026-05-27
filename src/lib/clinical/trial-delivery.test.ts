import { describe, expect, it } from "vitest";
import {
  aiSummary,
  buildDeliveryPayload,
  checkEligibility,
  chooseChannels,
  type PatientFacts,
  type TrialRecord,
} from "./trial-delivery";

const TRIAL: TrialRecord = {
  nct: "NCT05012345",
  title: "THC:CBD for chronic neuropathic pain",
  phase: "Phase III",
  status: "Recruiting",
  sponsor: "University of Colorado Health",
  conditions: ["chronic pain", "neuropathic pain"],
  interventions: ["THC:CBD 1:1 sublingual spray", "placebo"],
  minimumAge: 18,
  maximumAge: 75,
  sex: "any",
  inclusions: ["chronic neuropathic pain", "prior conventional therapy"],
  exclusions: ["history of psychosis", "active substance use disorder"],
  url: "https://clinicaltrials.gov/ct2/show/NCT05012345",
};

const PATIENT: PatientFacts = {
  patientId: "p_demo_1",
  firstName: "Lena",
  age: 52,
  sex: "female",
  conditions: ["chronic neuropathic pain", "hypertension"],
  currentMeds: ["gabapentin", "lisinopril"],
  readingBand: "grade_8",
  optInChannels: ["portal", "email"],
};

describe("checkEligibility", () => {
  it("flags out-of-band age as ineligible", () => {
    const result = checkEligibility({ ...PATIENT, age: 15 }, TRIAL);
    expect(result.verdict).toBe("ineligible");
    expect(result.score).toBe(0);
  });

  it("flags sex restriction as ineligible", () => {
    const result = checkEligibility(
      { ...PATIENT, sex: "male" },
      { ...TRIAL, sex: "female" },
    );
    expect(result.verdict).toBe("ineligible");
  });

  it("rates condition-overlapping patients as eligible / likely", () => {
    const result = checkEligibility(PATIENT, TRIAL);
    expect(["eligible", "likely_eligible", "unknown"]).toContain(result.verdict);
    expect(result.score).toBeGreaterThan(0);
  });

  it("drops the verdict when the patient hits an exclusion", () => {
    const result = checkEligibility(
      { ...PATIENT, conditions: [...PATIENT.conditions, "history of psychosis"] },
      TRIAL,
    );
    expect(["likely_ineligible", "unknown"]).toContain(result.verdict);
    expect(result.reasons.some((r) => r.includes("exclusion"))).toBe(true);
  });
});

describe("aiSummary", () => {
  it("respects the grade_6 short style", () => {
    const check = checkEligibility(PATIENT, TRIAL);
    const text = aiSummary(
      { ...PATIENT, readingBand: "grade_6" },
      TRIAL,
      check,
    );
    expect(text.split("\n").length).toBeLessThan(text.length);
    expect(text).toContain("Hi Lena");
  });

  it("inlines the trial URL", () => {
    const check = checkEligibility(PATIENT, TRIAL);
    const text = aiSummary(PATIENT, TRIAL, check);
    expect(text).toContain(TRIAL.url);
  });
});

describe("buildDeliveryPayload", () => {
  const check = checkEligibility(PATIENT, TRIAL);

  it("limits SMS to 320 chars", () => {
    const sms = buildDeliveryPayload("sms", PATIENT, TRIAL, check);
    expect(sms.body.length).toBeLessThanOrEqual(320);
    expect(sms.subject).toBe("");
  });

  it("includes a subject in email payloads", () => {
    const email = buildDeliveryPayload("email", PATIENT, TRIAL, check);
    expect(email.subject.length).toBeGreaterThan(0);
    expect(email.body).toContain(TRIAL.url);
  });

  it("audit note records the verdict and channel", () => {
    const portal = buildDeliveryPayload("portal", PATIENT, TRIAL, check);
    expect(portal.auditNote).toContain("portal");
    expect(portal.auditNote).toContain(check.verdict);
  });
});

describe("chooseChannels", () => {
  it("defaults to portal-only when no opt-ins are on file", () => {
    expect(chooseChannels({ ...PATIENT, optInChannels: [] })).toEqual(["portal"]);
  });
  it("returns the recorded opt-ins otherwise", () => {
    expect(chooseChannels(PATIENT)).toEqual(["portal", "email"]);
  });
});

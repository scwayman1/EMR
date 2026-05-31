import { describe, expect, it } from "vitest";

import {
  DEFAULT_ASSESSMENT_POLICY,
  evaluateAssessmentPolicy,
  outstandingAssessments,
  type AssessmentContext,
  type AssessmentPolicy,
} from "./assessment-rules";

const NOW = new Date("2026-06-01T12:00:00.000Z");

// An illustrative policy for tests only — NOT the shipped default (which is empty).
const POLICY: AssessmentPolicy = [
  { concern: "depression", assessmentSlug: "phq-9", assessmentLabel: "PHQ-9", freshnessDays: 30, requirement: "required" },
  { concern: "anxiety", assessmentSlug: "gad-7", assessmentLabel: "GAD-7", freshnessDays: 30, requirement: "required" },
  { concern: "chronic_pain", assessmentSlug: "pain-scale", assessmentLabel: "Pain Scale", freshnessDays: 30, requirement: "recommended" },
];

function ctx(overrides: Partial<AssessmentContext> = {}): AssessmentContext {
  return {
    indicatedConcerns: [],
    latestByAssessment: {},
    ...overrides,
  };
}

describe("evaluateAssessmentPolicy", () => {
  it("ships inert: the default empty policy yields no findings", () => {
    expect(
      evaluateAssessmentPolicy(DEFAULT_ASSESSMENT_POLICY, ctx({ indicatedConcerns: ["depression"] }), NOW),
    ).toEqual([]);
  });

  it("only evaluates rules whose concern is indicated for the patient", () => {
    const findings = evaluateAssessmentPolicy(POLICY, ctx({ indicatedConcerns: ["anxiety"] }), NOW);
    expect(findings).toHaveLength(1);
    expect(findings[0].assessmentSlug).toBe("gad-7");
  });

  it("flags an indicated assessment that was never taken as missing", () => {
    const [f] = evaluateAssessmentPolicy(POLICY, ctx({ indicatedConcerns: ["depression"] }), NOW);
    expect(f.status).toBe("missing");
    expect(f.ageDays).toBeNull();
  });

  it("flags a submission older than the freshness window as stale", () => {
    const [f] = evaluateAssessmentPolicy(
      POLICY,
      ctx({
        indicatedConcerns: ["depression"],
        latestByAssessment: { "phq-9": new Date("2026-01-01T00:00:00.000Z") }, // ~150 days
      }),
      NOW,
    );
    expect(f.status).toBe("stale");
    expect(f.ageDays).toBeGreaterThan(30);
  });

  it("treats a submission within the window as fresh", () => {
    const [f] = evaluateAssessmentPolicy(
      POLICY,
      ctx({
        indicatedConcerns: ["depression"],
        latestByAssessment: { "phq-9": new Date("2026-05-20T00:00:00.000Z") }, // ~12 days
      }),
      NOW,
    );
    expect(f.status).toBe("fresh");
  });

  it("honors a Tier-3 not_applicable / skip override", () => {
    const [f] = evaluateAssessmentPolicy(
      POLICY,
      ctx({ indicatedConcerns: ["depression"], overrides: { "phq-9": "not_applicable" } }),
      NOW,
    );
    expect(f.status).toBe("not_applicable");
  });

  it("lets a Tier-3 require override bump a recommended rule to required", () => {
    const [f] = evaluateAssessmentPolicy(
      POLICY,
      ctx({ indicatedConcerns: ["chronic_pain"], overrides: { "pain-scale": "require" } }),
      NOW,
    );
    expect(f.requirement).toBe("required");
  });

  it("clamps a future-dated submission (clock skew) to fresh, age 0", () => {
    const [f] = evaluateAssessmentPolicy(
      POLICY,
      ctx({
        indicatedConcerns: ["depression"],
        latestByAssessment: { "phq-9": new Date("2026-06-10T00:00:00.000Z") }, // after NOW
      }),
      NOW,
    );
    expect(f.status).toBe("fresh");
    expect(f.ageDays).toBe(0);
  });
});

describe("outstandingAssessments", () => {
  it("returns only missing/stale findings (fresh + not_applicable filtered out)", () => {
    const findings = evaluateAssessmentPolicy(
      POLICY,
      ctx({
        indicatedConcerns: ["depression", "anxiety", "chronic_pain"],
        latestByAssessment: {
          "phq-9": new Date("2026-01-01T00:00:00.000Z"), // stale
          "gad-7": new Date("2026-05-25T00:00:00.000Z"), // fresh
          // pain-scale: missing
        },
      }),
      NOW,
    );
    const outstanding = outstandingAssessments(findings).map((f) => f.assessmentSlug).sort();
    expect(outstanding).toEqual(["pain-scale", "phq-9"]);
  });
});

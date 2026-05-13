import { describe, expect, it } from "vitest";
import {
  allocate,
  balanceChiSquare,
  interimAnalysis,
  summarizeRetention,
  unblind,
  type RandomizableSubject,
  type StudySpec,
  type Withdrawal,
} from "./double-blind";

const SUBJECTS: RandomizableSubject[] = [
  { patientId: "p1", ageBand: "60-74", sex: "female", primaryCondition: "chronic_pain" },
  { patientId: "p2", ageBand: "60-74", sex: "male", primaryCondition: "chronic_pain" },
  { patientId: "p3", ageBand: "45-59", sex: "female", primaryCondition: "anxiety" },
  { patientId: "p4", ageBand: "45-59", sex: "male", primaryCondition: "anxiety" },
  { patientId: "p5", ageBand: "60-74", sex: "female", primaryCondition: "chronic_pain" },
  { patientId: "p6", ageBand: "60-74", sex: "male", primaryCondition: "chronic_pain" },
  { patientId: "p7", ageBand: "45-59", sex: "female", primaryCondition: "anxiety" },
  { patientId: "p8", ageBand: "45-59", sex: "male", primaryCondition: "anxiety" },
];

const SPEC: StudySpec = {
  studyId: "demo_study",
  arms: [{ name: "treatment" }, { name: "control" }],
  seed: "test_seed_2026__16chars",
  stratifyBy: ["ageBand", "sex"],
  blockSize: 4,
};

describe("allocate", () => {
  it("is deterministic given the same seed (arm + code stable)", () => {
    const plan1 = allocate(SUBJECTS, SPEC);
    const plan2 = allocate(SUBJECTS, SPEC);
    const strip = (p: typeof plan1) =>
      p.allocations.map(({ enrolledAt, ...rest }) => rest);
    expect(strip(plan1)).toEqual(strip(plan2));
  });

  it("keeps arm balance within one block size", () => {
    const plan = allocate(SUBJECTS, SPEC);
    const diff = Math.abs(
      (plan.balance.treatment ?? 0) - (plan.balance.control ?? 0),
    );
    // Permuted-block randomization within strata can drift up to one
    // block size when strata are small. Block size for this spec is 4.
    expect(diff).toBeLessThanOrEqual(4);
  });

  it("emits unique blinding codes per patient", () => {
    const plan = allocate(SUBJECTS, SPEC);
    const codes = plan.allocations.map((a) => a.blindingCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("unblind", () => {
  it("returns the matching allocation", () => {
    const plan = allocate(SUBJECTS, SPEC);
    const code = plan.allocations[0].blindingCode;
    expect(unblind(code, plan.allocations)?.patientId).toBe(
      plan.allocations[0].patientId,
    );
  });

  it("returns null on unknown codes", () => {
    const plan = allocate(SUBJECTS, SPEC);
    expect(unblind("DEADBEEF", plan.allocations)).toBeNull();
  });
});

describe("balanceChiSquare", () => {
  it("returns ~0 for an even split", () => {
    const plan = allocate(SUBJECTS, SPEC);
    expect(balanceChiSquare(plan)).toBeLessThan(1);
  });
});

describe("summarizeRetention", () => {
  const plan = allocate(SUBJECTS, SPEC);

  it("counts active and withdrawn per arm", () => {
    const withdrawals: Withdrawal[] = [
      {
        patientId: plan.allocations[0].patientId,
        withdrawnAt: "2026-04-01",
        reason: "lost_to_followup",
      },
    ];
    const summary = summarizeRetention(plan, withdrawals);
    const totalActive = Object.values(summary.active).reduce((a, b) => a + b, 0);
    const totalWithdrawn = Object.values(summary.withdrawn).reduce(
      (a, b) => a + b,
      0,
    );
    expect(totalActive + totalWithdrawn).toBe(SUBJECTS.length);
    expect(totalWithdrawn).toBe(1);
  });

  it("ignores withdrawals for unknown patients", () => {
    const summary = summarizeRetention(plan, [
      { patientId: "ghost", withdrawnAt: "2026-04-01", reason: "other" },
    ]);
    expect(
      Object.values(summary.withdrawn).reduce((a, b) => a + b, 0),
    ).toBe(0);
  });

  it("flags differential dropout when retention gap exceeds threshold", () => {
    const treatmentPatients = plan.allocations
      .filter((a) => a.arm === "treatment")
      .map((a) => a.patientId);
    const withdrawals: Withdrawal[] = treatmentPatients
      .slice(0, treatmentPatients.length)
      .map((id) => ({
        patientId: id,
        withdrawnAt: "2026-04-01",
        reason: "adverse_event",
      }));
    const summary = summarizeRetention(plan, withdrawals, {
      differentialThreshold: 0.1,
    });
    expect(summary.differentialDropout).toBe(true);
  });
});

describe("interimAnalysis", () => {
  it("recommends continue when within boundaries", () => {
    const decision = interimAnalysis("treatment", "control", {
      observedPerArm: { treatment: 40, control: 40 },
      successesPerArm: { treatment: 24, control: 20 },
      saesPerArm: { treatment: 1, control: 1 },
      efficacyBoundary: 0.2,
      futilityBoundary: 0.05,
      safetyBoundary: 0.1,
    });
    expect(decision.recommendation).toBe("continue");
    expect(decision.dsmbReviewRequired).toBe(false);
  });

  it("stops for safety when SAE rate exceeds the boundary", () => {
    const decision = interimAnalysis("treatment", "control", {
      observedPerArm: { treatment: 40, control: 40 },
      successesPerArm: { treatment: 20, control: 20 },
      saesPerArm: { treatment: 8, control: 1 },
      efficacyBoundary: 0.2,
      futilityBoundary: 0.05,
      safetyBoundary: 0.1,
    });
    expect(decision.recommendation).toBe("stop_for_safety");
    expect(decision.dsmbReviewRequired).toBe(true);
  });

  it("stops for efficacy when treatment beats control by ≥ boundary", () => {
    const decision = interimAnalysis("treatment", "control", {
      observedPerArm: { treatment: 40, control: 40 },
      successesPerArm: { treatment: 36, control: 12 },
      saesPerArm: { treatment: 0, control: 0 },
      efficacyBoundary: 0.2,
      futilityBoundary: 0.05,
      safetyBoundary: 0.1,
    });
    expect(decision.recommendation).toBe("stop_for_efficacy");
  });

  it("stops for futility when treatment is below the futility boundary", () => {
    const decision = interimAnalysis("treatment", "control", {
      observedPerArm: { treatment: 40, control: 40 },
      successesPerArm: { treatment: 18, control: 20 },
      saesPerArm: { treatment: 0, control: 0 },
      efficacyBoundary: 0.2,
      futilityBoundary: 0.05,
      safetyBoundary: 0.1,
    });
    expect(decision.recommendation).toBe("stop_for_futility");
  });
});

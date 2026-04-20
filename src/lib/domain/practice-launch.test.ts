import { describe, expect, it } from "vitest";
import {
  LAUNCH_STEPS,
  EMPTY_LAUNCH_STATE,
  getLaunchProgress,
  getLaunchStep,
  getNextStepId,
  type OrgLaunchState,
} from "./practice-launch";

const FULL_STATE: OrgLaunchState = {
  hasOrgProfile: true,
  clinicianCount: 3,
  payerCount: 2,
  intakeFormCount: 1,
  billingRuleCount: 5,
  goLiveAt: new Date("2026-04-20"),
};

describe("LAUNCH_STEPS", () => {
  it("contains exactly the six canonical steps in order", () => {
    expect(LAUNCH_STEPS.map((s) => s.id)).toEqual([
      "org_profile",
      "clinicians",
      "payer_config",
      "intake_forms",
      "billing_rules",
      "go_live",
    ]);
  });

  it("every step has a title and description", () => {
    for (const step of LAUNCH_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });
});

describe("getLaunchProgress", () => {
  it("on an empty state, currentStep is org_profile and percent is 0", () => {
    const progress = getLaunchProgress(EMPTY_LAUNCH_STATE);
    expect(progress.currentStep).toBe("org_profile");
    expect(progress.percentComplete).toBe(0);
    expect(progress.nextAction).toBe("Practice profile");
  });

  it("advances currentStep as earlier steps complete", () => {
    const progress = getLaunchProgress({
      ...EMPTY_LAUNCH_STATE,
      hasOrgProfile: true,
    });
    expect(progress.currentStep).toBe("clinicians");
    // 1 of 6 steps done → 17%
    expect(progress.percentComplete).toBe(17);
  });

  it("treats a later step as current if an earlier step is missing", () => {
    // Even though billing rules are set, org_profile is still blank
    // — currentStep must point at the earliest gap.
    const progress = getLaunchProgress({
      ...EMPTY_LAUNCH_STATE,
      billingRuleCount: 10,
    });
    expect(progress.currentStep).toBe("org_profile");
  });

  it("reports fully launched when every step is complete", () => {
    const progress = getLaunchProgress(FULL_STATE);
    expect(progress.currentStep).toBeNull();
    expect(progress.percentComplete).toBe(100);
    expect(progress.nextAction).toBe("All set");
  });

  it("percentComplete rounds to the nearest integer", () => {
    // 2 of 6 done → 33.33% → 33
    expect(
      getLaunchProgress({
        ...EMPTY_LAUNCH_STATE,
        hasOrgProfile: true,
        clinicianCount: 1,
      }).percentComplete,
    ).toBe(33);
    // 5 of 6 done → 83.33% → 83
    expect(
      getLaunchProgress({
        ...FULL_STATE,
        goLiveAt: null,
      }).percentComplete,
    ).toBe(83);
  });

  it("nextAction matches the title of the current step", () => {
    const progress = getLaunchProgress({
      ...EMPTY_LAUNCH_STATE,
      hasOrgProfile: true,
      clinicianCount: 2,
    });
    expect(progress.currentStep).toBe("payer_config");
    expect(progress.nextAction).toBe("Configure payers");
  });
});

describe("step completion predicates", () => {
  it("clinicians requires at least one clinician", () => {
    const step = LAUNCH_STEPS.find((s) => s.id === "clinicians")!;
    expect(step.isComplete({ ...EMPTY_LAUNCH_STATE, clinicianCount: 0 })).toBe(false);
    expect(step.isComplete({ ...EMPTY_LAUNCH_STATE, clinicianCount: 1 })).toBe(true);
  });

  it("go_live completes only when goLiveAt is set", () => {
    const step = LAUNCH_STEPS.find((s) => s.id === "go_live")!;
    expect(step.isComplete(EMPTY_LAUNCH_STATE)).toBe(false);
    expect(step.isComplete({ ...EMPTY_LAUNCH_STATE, goLiveAt: new Date() })).toBe(true);
  });
});

describe("getLaunchStep / getNextStepId", () => {
  it("getLaunchStep returns the matching step by id", () => {
    expect(getLaunchStep("intake_forms")?.title).toBe("Publish intake forms");
    expect(getLaunchStep("does_not_exist")).toBeUndefined();
  });

  it("getNextStepId walks the sequence forward and stops at the end", () => {
    expect(getNextStepId("org_profile")).toBe("clinicians");
    expect(getNextStepId("billing_rules")).toBe("go_live");
    expect(getNextStepId("go_live")).toBeNull();
  });
});

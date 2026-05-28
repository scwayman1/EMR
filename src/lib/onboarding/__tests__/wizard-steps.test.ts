import { describe, expect, it } from "vitest";
import { WIZARD_STEPS } from "../wizard-steps";
import type { PracticeConfiguration, WizardStepId } from "../wizard-types";

describe("Onboarding Wizard Steps Reachability", () => {
  function getCompletedSet(draft: Partial<PracticeConfiguration>): Set<WizardStepId> {
    const completed = new Set<WizardStepId>();
    for (const step of WIZARD_STEPS) {
      if (step.isComplete(draft)) {
        completed.add(step.id);
      }
    }
    return completed;
  }

  it("should only allow Step 1 (org-and-practice) to be reachable on a fresh draft", () => {
    const draft: Partial<PracticeConfiguration> = {};
    const completed = getCompletedSet(draft);

    expect(WIZARD_STEPS[0].id).toBe("org-and-practice");
    expect(WIZARD_STEPS[0].isReachable(draft, completed)).toBe(true);

    // All downstream steps must be unreachable
    for (let i = 1; i < WIZARD_STEPS.length; i++) {
      expect(WIZARD_STEPS[i].isReachable(draft, completed)).toBe(false);
    }
  });

  it("should make Step 2 reachable once Step 1 is complete", () => {
    const draft: Partial<PracticeConfiguration> = {
      organizationId: "org-123",
      practiceId: "practice-456",
    };
    const completed = getCompletedSet(draft);

    expect(completed.has("org-and-practice")).toBe(true);
    expect(WIZARD_STEPS[1].id).toBe("select-specialty");
    expect(WIZARD_STEPS[1].isReachable(draft, completed)).toBe(true);

    // Step 3 should still be unreachable because Step 2 is not complete
    expect(WIZARD_STEPS[2].id).toBe("select-care-model");
    expect(WIZARD_STEPS[2].isReachable(draft, completed)).toBe(false);
  });

  it("should make Step 3 reachable once Step 2 is complete", () => {
    const draft: Partial<PracticeConfiguration> = {
      organizationId: "org-123",
      practiceId: "practice-456",
      selectedSpecialty: "pain-management",
    };
    const completed = getCompletedSet(draft);

    expect(completed.has("org-and-practice")).toBe(true);
    expect(completed.has("select-specialty")).toBe(true);

    expect(WIZARD_STEPS[2].id).toBe("select-care-model");
    expect(WIZARD_STEPS[2].isReachable(draft, completed)).toBe(true);

    // Step 4 and 5 should still be unreachable because Step 3 (careModel) is not complete
    expect(WIZARD_STEPS[3].id).toBe("enable-modalities");
    expect(WIZARD_STEPS[3].isReachable(draft, completed)).toBe(false);
    expect(WIZARD_STEPS[4].id).toBe("disable-modalities");
    expect(WIZARD_STEPS[4].isReachable(draft, completed)).toBe(false);
  });

  it("should make Step 4 and 5 reachable once Step 3 is complete", () => {
    const draft: Partial<PracticeConfiguration> = {
      organizationId: "org-123",
      practiceId: "practice-456",
      selectedSpecialty: "pain-management",
      careModel: "longitudinal-primary-care",
    };
    const completed = getCompletedSet(draft);

    expect(completed.has("select-care-model")).toBe(true);

    expect(WIZARD_STEPS[3].id).toBe("enable-modalities");
    expect(WIZARD_STEPS[3].isReachable(draft, completed)).toBe(true);

    expect(WIZARD_STEPS[4].id).toBe("disable-modalities");
    expect(WIZARD_STEPS[4].isReachable(draft, completed)).toBe(true);

    // Step 6 (apply-workflows) is NOT reachable because Step 4 (enable-modalities) is incomplete
    expect(WIZARD_STEPS[5].id).toBe("apply-workflows");
    expect(WIZARD_STEPS[5].isReachable(draft, completed)).toBe(false);
  });

  it("should make Step 6 reachable once Step 4 is complete", () => {
    const draft: Partial<PracticeConfiguration> = {
      organizationId: "org-123",
      practiceId: "practice-456",
      selectedSpecialty: "pain-management",
      careModel: "longitudinal-primary-care",
      enabledModalities: ["telehealth"],
    };
    const completed = getCompletedSet(draft);

    expect(completed.has("enable-modalities")).toBe(true);
    expect(completed.has("disable-modalities")).toBe(true); // Step 5 is always complete

    expect(WIZARD_STEPS[5].id).toBe("apply-workflows");
    expect(WIZARD_STEPS[5].isReachable(draft, completed)).toBe(true);
  });
});

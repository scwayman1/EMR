// EMR-312 — Catalog invariants. The ≥42 CME-hour threshold is the
// regulatory bar this curriculum must clear. CI fails if a future
// edit drops total hours below it.

import { describe, it, expect } from "vitest";
import {
  totalCatalogHours,
  awardedCmeCredits,
  applyLessonEvent,
  emptyLearnerProgress,
} from "./cme";
import { CURRICULUM_MODULES } from "./catalog";

describe("EMR-312 curriculum catalog", () => {
  it("clears the ≥42 CME-hour bar", () => {
    expect(totalCatalogHours()).toBeGreaterThanOrEqual(42);
  });

  it("module ids and lesson ids are unique", () => {
    const moduleIds = CURRICULUM_MODULES.map((m) => m.id);
    expect(new Set(moduleIds).size).toBe(moduleIds.length);

    const lessonIds = CURRICULUM_MODULES.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
  });
});

describe("EMR-312 CME credit accounting", () => {
  it("awards no credit for an unstarted learner", () => {
    expect(awardedCmeCredits(emptyLearnerProgress("u1"))).toBe(0);
  });

  it("awards credit when assessment threshold is met", () => {
    let progress = emptyLearnerProgress("u1");
    progress = applyLessonEvent(progress, "foundations.ecs.assess", "completed", {
      assessmentScore: 0.9,
    });
    // 20 min lesson, no other completions → 0 full credits, but minutes captured.
    // Bring in a longer lesson without an assessment.
    progress = applyLessonEvent(progress, "foundations.ecs.intro", "completed");
    expect(awardedCmeCredits(progress)).toBeGreaterThanOrEqual(1);
  });

  it("withholds credit when assessment score is below threshold", () => {
    let progress = emptyLearnerProgress("u1");
    progress = applyLessonEvent(progress, "foundations.ecs.assess", "completed", {
      assessmentScore: 0.5,
    });
    // Assessment failed → its 20 minutes do not count. No other completions.
    expect(awardedCmeCredits(progress)).toBe(0);
  });
});

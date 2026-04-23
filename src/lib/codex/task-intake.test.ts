import { describe, expect, it } from "vitest";

import { buildExecutionPlan } from "./task-intake";

describe("buildExecutionPlan", () => {
  it("routes repository Q&A to local with no approval", () => {
    const plan = buildExecutionPlan({
      title: "Explain claim routing",
      description: "Help me understand where claim denials are generated in the codebase.",
      kind: "ask",
      requiresRepositoryWrite: false,
      estimatedChangedFiles: 0,
      requiresInternet: false,
      longRunning: false,
      triggerType: "manual",
      allowBackgroundRun: false,
    });

    expect(plan.surface).toBe("local");
    expect(plan.approval).toBe("none");
    expect(plan.suggestedParallelism).toBe(1);
  });

  it("routes complex code work to cloud with execution approval", () => {
    const plan = buildExecutionPlan({
      title: "Refactor medication timeline",
      description: "Split timeline renderer and write tests for edge cases in dosage transitions.",
      kind: "code",
      requiresRepositoryWrite: true,
      estimatedChangedFiles: 11,
      requiresInternet: false,
      longRunning: true,
      triggerType: "manual",
      allowBackgroundRun: false,
    });

    expect(plan.surface).toBe("cloud");
    expect(plan.approval).toBe("before_execute");
    expect(plan.requiresIsolation).toBe(true);
    expect(plan.suggestedParallelism).toBeGreaterThan(1);
  });

  it("routes scheduled tasks to automation", () => {
    const plan = buildExecutionPlan({
      title: "Nightly flaky test triage",
      description: "Inspect failing tests every night and open drafts with hypotheses.",
      kind: "automate",
      requiresRepositoryWrite: true,
      estimatedChangedFiles: 8,
      requiresInternet: true,
      longRunning: true,
      triggerType: "schedule",
      allowBackgroundRun: true,
    });

    expect(plan.surface).toBe("automation");
    expect(plan.approval).toBe("before_merge");
    expect(plan.suggestedParallelism).toBeGreaterThanOrEqual(2);
  });

  it("respects explicit surface requests when valid", () => {
    const plan = buildExecutionPlan({
      title: "Local hotfix",
      description: "Apply a one-line fix and run a focused test command only.",
      kind: "code",
      requiresRepositoryWrite: true,
      estimatedChangedFiles: 1,
      longRunning: false,
      requiresInternet: false,
      triggerType: "manual",
      allowBackgroundRun: false,
      requestedSurface: "local",
    });

    expect(plan.surface).toBe("local");
    expect(plan.reasoning.join(" ")).toContain("Requested surface accepted");
  });

  it("downgrades invalid automation request without background permission", () => {
    const plan = buildExecutionPlan({
      title: "One-off scripting",
      description: "Run this one-time script manually right now.",
      kind: "code",
      requiresRepositoryWrite: true,
      estimatedChangedFiles: 2,
      longRunning: false,
      requiresInternet: false,
      triggerType: "manual",
      allowBackgroundRun: false,
      requestedSurface: "automation",
    });

    expect(plan.surface).not.toBe("automation");
    expect(plan.reasoning.join(" ")).toContain("downgraded");
  });
});

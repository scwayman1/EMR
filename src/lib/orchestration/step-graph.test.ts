import { describe, expect, it } from "vitest";
import { StepExecutionGraph } from "./step-graph";
import type { AgentStep } from "./types";

describe("StepExecutionGraph", () => {
  it("executes dependent steps in topological order", () => {
    const graph = new StepExecutionGraph([
      { id: "a", name: "A" },
      { id: "b", name: "B", dependsOn: ["a"] },
      { id: "c", name: "C", dependsOn: ["b"] },
    ]);

    expect(graph.takeReadyBatch().map((s) => s.id)).toEqual(["a"]);
    graph.markCompleted("a");

    expect(graph.takeReadyBatch().map((s) => s.id)).toEqual(["b"]);
    graph.markCompleted("b");

    expect(graph.takeReadyBatch().map((s) => s.id)).toEqual(["c"]);
    graph.markCompleted("c");

    expect(graph.completedCount).toBe(3);
    expect(graph.totalSteps).toBe(3);
  });

  it("supports dynamic steps added after a parent completes", () => {
    const graph = new StepExecutionGraph([{ id: "root", name: "Root" }]);

    expect(graph.takeReadyBatch().map((s) => s.id)).toEqual(["root"]);
    graph.markCompleted("root");

    graph.addSteps([
      { id: "child-1", name: "Child 1", dependsOn: ["root"] },
      { id: "child-2", name: "Child 2", dependsOn: ["child-1"] },
    ]);

    expect(graph.takeReadyBatch().map((s) => s.id)).toEqual(["child-1"]);
    graph.markCompleted("child-1");
    expect(graph.takeReadyBatch().map((s) => s.id)).toEqual(["child-2"]);
  });

  it("throws on duplicate step ids", () => {
    expect(
      () =>
        new StepExecutionGraph([
          { id: "dup", name: "One" },
          { id: "dup", name: "Two" },
        ]),
    ).toThrow(/Duplicate step id: dup/);
  });

  it("throws when dependencies reference unknown steps", () => {
    expect(
      () =>
        new StepExecutionGraph([
          { id: "a", name: "A", dependsOn: ["missing"] },
        ]),
    ).toThrow(/depends on unknown step/);
  });

  it("surfaces blocked step ids for deadlock diagnostics", () => {
    const steps: AgentStep[] = [
      { id: "a", name: "A", dependsOn: ["b"] },
      { id: "b", name: "B", dependsOn: ["a"] },
    ];

    const graph = new StepExecutionGraph(steps);

    expect(graph.takeReadyBatch()).toEqual([]);
    expect(graph.findBlockedStepIds()).toEqual(expect.arrayContaining(["a", "b"]));
  });
});

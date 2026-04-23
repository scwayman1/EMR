import type { AgentStep } from "./types";

interface StepNode {
  step: AgentStep;
  unresolvedDeps: number;
  dependents: Set<string>;
}

/**
 * Efficient dependency scheduler for V3 multi-step agent plans.
 *
 * Guarantees:
 * - step IDs are unique
 * - all dependencies reference known steps
 * - dependency updates are O(out-degree) on completion
 */
export class StepExecutionGraph {
  private readonly nodes = new Map<string, StepNode>();
  private readonly readyQueue: string[] = [];
  private readonly completed = new Set<string>();

  constructor(initialSteps: AgentStep[]) {
    this.addSteps(initialSteps);
  }

  addSteps(steps: AgentStep[]): void {
    // Register new nodes first so intra-batch dependencies can resolve.
    for (const step of steps) {
      if (this.nodes.has(step.id)) {
        throw new Error(`Duplicate step id: ${step.id}`);
      }
      this.nodes.set(step.id, {
        step,
        unresolvedDeps: 0,
        dependents: new Set<string>(),
      });
    }

    // Wire dependency edges.
    for (const step of steps) {
      const node = this.nodes.get(step.id);
      if (!node) continue;

      const deps = step.dependsOn ?? [];
      let unresolved = 0;

      for (const depId of deps) {
        const depNode = this.nodes.get(depId);
        if (!depNode) {
          throw new Error(`Step ${step.id} depends on unknown step ${depId}`);
        }
        if (!this.completed.has(depId)) {
          unresolved++;
        }
        depNode.dependents.add(step.id);
      }

      node.unresolvedDeps = unresolved;
      if (unresolved === 0 && !this.completed.has(step.id)) {
        this.readyQueue.push(step.id);
      }
    }
  }

  takeReadyBatch(): AgentStep[] {
    const batch: AgentStep[] = [];

    while (this.readyQueue.length > 0) {
      const id = this.readyQueue.shift();
      if (!id || this.completed.has(id)) continue;
      const node = this.nodes.get(id);
      if (!node || node.unresolvedDeps > 0) continue;
      batch.push(node.step);
    }

    return batch;
  }

  markCompleted(stepId: string): void {
    if (this.completed.has(stepId)) {
      throw new Error(`Step already completed: ${stepId}`);
    }

    const node = this.nodes.get(stepId);
    if (!node) {
      throw new Error(`Unknown completed step: ${stepId}`);
    }

    this.completed.add(stepId);

    for (const dependentId of node.dependents) {
      const dependent = this.nodes.get(dependentId);
      if (!dependent || this.completed.has(dependentId)) continue;
      dependent.unresolvedDeps = Math.max(0, dependent.unresolvedDeps - 1);
      if (dependent.unresolvedDeps === 0) {
        this.readyQueue.push(dependentId);
      }
    }
  }

  get totalSteps(): number {
    return this.nodes.size;
  }

  get completedCount(): number {
    return this.completed.size;
  }

  findBlockedStepIds(limit = 10): string[] {
    const blocked: string[] = [];
    for (const [id, node] of this.nodes.entries()) {
      if (this.completed.has(id)) continue;
      if (node.unresolvedDeps > 0) {
        blocked.push(id);
      }
      if (blocked.length >= limit) break;
    }
    return blocked;
  }
}

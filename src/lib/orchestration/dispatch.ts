import { prisma } from "@/lib/db/prisma";
import { matchWorkflows } from "./workflows";
import type { DomainEvent } from "./events";

/**
 * Dispatch a domain event: find matching workflows and enqueue one AgentJob
 * per step. This is the ONLY supported way to invoke the agent harness.
 */
export async function dispatch(event: DomainEvent): Promise<string[]> {
  const matches = matchWorkflows(event);
  if (matches.length === 0) return [];

  const organizationId =
    "organizationId" in event && typeof (event as any).organizationId === "string"
      ? (event as any).organizationId
      : null;

  const jobs = await Promise.all(
    matches.map(({ workflow, step }) =>
      prisma.agentJob.create({
        data: {
          organizationId: organizationId ?? undefined,
          workflowName: workflow.name,
          agentName: step.agent,
          eventName: event.name,
          input: step.input(event) as any,
          requiresApproval: !!step.requiresApproval,
        },
        select: { id: true },
      })
    )
  );

  return jobs.map((j) => j.id);
}

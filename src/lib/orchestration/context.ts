import { prisma } from "@/lib/db/prisma";
import { dispatch } from "./dispatch";
import { resolveModelClient } from "./model-client";
import type { AgentContext, AgentLogEntry, AllowedAction } from "./types";
import type { DomainEvent } from "./events";

interface CreateContextArgs {
  jobId: string;
  organizationId: string | null;
  allowed: AllowedAction[];
  agentName: string;
  agentVersion: string;
}

/**
 * Build a scoped context for an agent run. The context is the ONLY way an
 * agent touches the outside world — logs, emits, capability checks, model calls.
 */
export function createAgentContext(args: CreateContextArgs): {
  ctx: AgentContext;
  drainLogs(): AgentLogEntry[];
} {
  const logs: AgentLogEntry[] = [];
  const allowedSet = new Set(args.allowed);

  const ctx: AgentContext = {
    jobId: args.jobId,
    organizationId: args.organizationId,
    log(level, message, data) {
      logs.push({ at: new Date().toISOString(), level, message, data });
    },
    async emit(event: DomainEvent) {
      await dispatch(event);
    },
    assertCan(action: AllowedAction) {
      if (!allowedSet.has(action)) {
        throw new Error(`Agent ${args.agentName}@${args.agentVersion} not permitted to ${action}`);
      }
    },
    model: resolveModelClient(),
  };

  return {
    ctx,
    drainLogs: () => logs,
  };
}

/**
 * Write an audit log row with an agent actor.
 */
export async function writeAgentAudit(
  agentName: string,
  agentVersion: string,
  organizationId: string | null,
  action: string,
  subject: { type: string; id: string } | null,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      organizationId: organizationId ?? undefined,
      actorAgent: `agent:${agentName}@${agentVersion}`,
      action,
      subjectType: subject?.type,
      subjectId: subject?.id,
      metadata: metadata as any,
    },
  });
}

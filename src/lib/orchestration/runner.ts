import type { AgentJob } from "@prisma/client";
import { createAgentContext } from "./context";
import { agentRegistry } from "@/lib/agents";
import {
  claimNextJob,
  markFailed,
  markNeedsApproval,
  markRunning,
  markSucceeded,
} from "./queue";

/**
 * Execute a single claimed job end-to-end: resolve the agent, build a
 * context, run it, and write the result + logs back.
 */
export async function runJob(job: AgentJob, workerId: string): Promise<void> {
  const agent = (agentRegistry as Record<string, any>)[job.agentName];
  if (!agent) {
    await markFailed(job.id, `Unknown agent: ${job.agentName}`, [], false);
    return;
  }

  await markRunning(job.id);

  const { ctx, drainLogs } = createAgentContext({
    jobId: job.id,
    organizationId: job.organizationId,
    allowed: agent.allowedActions,
    agentName: agent.name,
    agentVersion: agent.version,
  });

  try {
    const input = agent.inputSchema.parse(job.input);
    ctx.log("info", `Running ${agent.name}@${agent.version}`, { workerId });

    const output = await agent.run(input, ctx);
    agent.outputSchema.parse(output);

    ctx.log("info", "Run succeeded");

    if (agent.requiresApproval || job.requiresApproval) {
      await markNeedsApproval(job.id, output, drainLogs());
    } else {
      await markSucceeded(job.id, output, drainLogs());
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.log("error", message);
    const retry = !isDeterministic(err);
    await markFailed(job.id, message, drainLogs(), retry);
  }
}

function isDeterministic(err: unknown): boolean {
  if (err instanceof Error) {
    return /ZodError|validation|UNAUTHORIZED|FORBIDDEN|not permitted|Unknown agent/i.test(err.message);
  }
  return false;
}

/**
 * Poll-and-run loop. Used by the standalone worker and by the in-process
 * dev runner. Returns the number of jobs executed in this tick.
 */
export async function runTick(workerId: string, batchSize = 5): Promise<number> {
  let ran = 0;
  for (let i = 0; i < batchSize; i++) {
    const job = await claimNextJob(workerId);
    if (!job) break;
    await runJob(job, workerId);
    ran++;
  }
  return ran;
}

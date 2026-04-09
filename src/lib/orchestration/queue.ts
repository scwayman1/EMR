import { prisma } from "@/lib/db/prisma";
import { AgentJobStatus, Prisma } from "@prisma/client";

/**
 * Claim the next runnable job using Postgres row locking. Returns null if
 * nothing is available. The worker loops on this, running each claimed job.
 *
 * Uses `SELECT ... FOR UPDATE SKIP LOCKED` so multiple workers can run in
 * parallel without colliding.
 */
export async function claimNextJob(workerId: string) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ id: string }>
    >(Prisma.sql`
      SELECT id FROM "AgentJob"
      WHERE status = 'pending'
        AND "runAfter" <= NOW()
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

    if (rows.length === 0) return null;

    const job = await tx.agentJob.update({
      where: { id: rows[0].id },
      data: {
        status: AgentJobStatus.claimed,
        claimedAt: new Date(),
        claimedBy: workerId,
        attempts: { increment: 1 },
      },
    });

    return job;
  });
}

export async function markRunning(jobId: string) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: { status: AgentJobStatus.running, startedAt: new Date() },
  });
}

export async function markSucceeded(jobId: string, output: unknown, logs: unknown[]) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: {
      status: AgentJobStatus.succeeded,
      output: output as any,
      logs: logs as any,
      completedAt: new Date(),
    },
  });
}

export async function markNeedsApproval(jobId: string, output: unknown, logs: unknown[]) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: {
      status: AgentJobStatus.needs_approval,
      output: output as any,
      logs: logs as any,
      approvalRequiredAt: new Date(),
    },
  });
}

export async function markFailed(jobId: string, error: string, logs: unknown[], retry: boolean) {
  const job = await prisma.agentJob.findUniqueOrThrow({ where: { id: jobId } });
  const canRetry = retry && job.attempts < job.maxAttempts;

  await prisma.agentJob.update({
    where: { id: jobId },
    data: {
      status: canRetry ? AgentJobStatus.pending : AgentJobStatus.failed,
      lastError: error,
      logs: logs as any,
      runAfter: canRetry ? new Date(Date.now() + backoffMs(job.attempts)) : job.runAfter,
      completedAt: canRetry ? null : new Date(),
    },
  });
}

function backoffMs(attempts: number): number {
  // Exponential backoff: 5s, 20s, 80s, ...
  return Math.min(5000 * Math.pow(4, attempts), 5 * 60 * 1000);
}

export async function approveJob(jobId: string, userId: string) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: {
      status: AgentJobStatus.succeeded,
      approvedById: userId,
      approvedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

export async function rejectJob(jobId: string, userId: string, reason: string) {
  await prisma.agentJob.update({
    where: { id: jobId },
    data: {
      status: AgentJobStatus.cancelled,
      approvedById: userId,
      approvedAt: new Date(),
      lastError: `Rejected: ${reason}`,
      completedAt: new Date(),
    },
  });
}

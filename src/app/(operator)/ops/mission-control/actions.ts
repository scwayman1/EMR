"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { approveJob, rejectJob } from "@/lib/orchestration/queue";
import { prisma } from "@/lib/db/prisma";

export async function approveJobAction(jobId: string) {
  const user = await requireUser();
  await approveJob(jobId, user.id);
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "agent.job.approved",
      subjectType: "AgentJob",
      subjectId: jobId,
      organizationId: user.organizationId ?? undefined,
    },
  });
  revalidatePath("/ops/mission-control");
  revalidatePath("/ops");
}

export async function rejectJobAction(jobId: string) {
  const user = await requireUser();
  await rejectJob(jobId, user.id, "Rejected in Mission Control");
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "agent.job.rejected",
      subjectType: "AgentJob",
      subjectId: jobId,
      organizationId: user.organizationId ?? undefined,
    },
  });
  revalidatePath("/ops/mission-control");
  revalidatePath("/ops");
}

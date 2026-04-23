"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function markStepCompleteAction(step: string) {
  const user = await requireUser();
  if (!user.organizationId) return;

  const status = await prisma.practiceLaunchStatus.findUnique({
    where: { organizationId: user.organizationId },
  });

  if (!status) return;

  const currentSteps = (status.nextSteps ?? []) as string[];
  const updatedSteps = currentSteps.filter((s) => s !== step);

  await prisma.practiceLaunchStatus.update({
    where: { organizationId: user.organizationId },
    data: { nextSteps: updatedSteps },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "launch.step.completed",
      subjectType: "PracticeLaunchStatus",
      subjectId: status.id,
      organizationId: user.organizationId,
      metadata: { step },
    },
  });

  revalidatePath("/ops/launch");
  revalidatePath("/ops");
}

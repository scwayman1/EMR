"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export async function clockInAction() {
  const user = await requireUser();
  if (!user.organizationId) throw new Error("NO_ORG");

  // Refuse to open a second open entry for the same user.
  const existing = await prisma.timeEntry.findFirst({
    where: { userId: user.id, status: "open" },
  });
  if (existing) {
    revalidatePath("/ops/timeclock");
    return;
  }

  await prisma.timeEntry.create({
    data: {
      organizationId: user.organizationId,
      userId: user.id,
      status: "open",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      organizationId: user.organizationId,
      action: "timeclock.in",
      subjectType: "TimeEntry",
      subjectId: user.id,
    },
  });

  revalidatePath("/ops/timeclock");
}

export async function clockOutAction(entryId: string) {
  const user = await requireUser();
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== user.id || entry.status !== "open") return;

  const clockOutAt = new Date();
  const minutesWorked = Math.max(
    0,
    Math.round((clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000),
  );

  await prisma.timeEntry.update({
    where: { id: entryId },
    data: { clockOutAt, minutesWorked, status: "closed" },
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      organizationId: entry.organizationId,
      action: "timeclock.out",
      subjectType: "TimeEntry",
      subjectId: entryId,
      metadata: { minutesWorked },
    },
  });

  revalidatePath("/ops/timeclock");
}

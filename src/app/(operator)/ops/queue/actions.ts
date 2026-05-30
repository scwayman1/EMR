"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { advanceVisitState, type VisitSpineStatus } from "@/lib/domain/visit-state";

const QUEUE_STATE_ROLES = new Set([
  "front_office",
  "back_office",
  "operator",
  "practice_owner",
  "practice_admin",
  "system",
]);

const TransitionSchema = z.object({
  encounterId: z.string().min(1),
  target: z.enum([
    "checked_in",
    "info_incomplete",
    "ready",
    "rooming",
    "roomed",
    "wrap_up",
    "cancelled",
    "no_show",
  ]),
});

export async function moveQueueEncounter(payload: z.infer<typeof TransitionSchema>) {
  const user = await requireUser();
  if (!user.organizationId) return { ok: false, error: "Missing organization." };
  if (!user.roles.some((role) => QUEUE_STATE_ROLES.has(role))) {
    return { ok: false, error: "Forbidden." };
  }

  const parsed = TransitionSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Invalid queue transition." };

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: parsed.data.encounterId,
      organizationId: user.organizationId,
    },
  });
  if (!encounter) return { ok: false, error: "Encounter not found." };

  if (encounter.status === parsed.data.target) {
    revalidatePath("/ops/queue");
    return { ok: true };
  }

  const next = advanceVisitState(
    encounter,
    parsed.data.target as VisitSpineStatus,
  );
  if (!next.ok) return next;

  await prisma.encounter.update({
    where: { id: encounter.id },
    data: next.data as any,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: encounter.organizationId,
      actorUserId: user.id,
      action: "encounter.visit_state.updated",
      subjectType: "Encounter",
      subjectId: encounter.id,
      metadata: { from: encounter.status, to: parsed.data.target },
    },
  });

  revalidatePath("/ops/queue");
  return { ok: true };
}

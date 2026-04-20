"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Server action: update the current value on a treatment goal.
 *
 * Org-scoped — the caller must be authenticated, and the goal's
 * organizationId must match one of the caller's memberships. If the new
 * value reaches the target, the goal is stamped as completed.
 */

export type UpdateGoalProgressResult =
  | { ok: true; completed: boolean; currentValue: number }
  | { ok: false; error: string };

const inputSchema = z.object({
  goalId: z.string().min(1),
  currentValue: z.coerce.number().finite(),
});

export async function updateGoalProgress(
  goalId: string,
  currentValue: number
): Promise<UpdateGoalProgressResult> {
  const parsed = inputSchema.safeParse({ goalId, currentValue });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  // Load the caller's org memberships so we can authorize against them.
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  const orgIds = new Set(memberships.map((m) => m.organizationId));
  if (orgIds.size === 0) {
    return { ok: false, error: "No organization access." };
  }

  const goal = await prisma.treatmentGoal.findUnique({
    where: { id: parsed.data.goalId },
    select: {
      id: true,
      organizationId: true,
      targetValue: true,
      completedAt: true,
    },
  });
  if (!goal) return { ok: false, error: "Goal not found." };

  if (!orgIds.has(goal.organizationId)) {
    // Don't leak existence — same error as missing goal.
    return { ok: false, error: "Goal not found." };
  }

  // Clamp at zero — the domain helper rejects negatives too.
  const nextValue = Math.max(0, parsed.data.currentValue);
  const reachedTarget = goal.targetValue > 0 && nextValue >= goal.targetValue;

  const updated = await prisma.treatmentGoal.update({
    where: { id: goal.id },
    data: {
      currentValue: nextValue,
      // Only stamp completedAt the first time we cross the line.
      completedAt:
        reachedTarget && !goal.completedAt ? new Date() : goal.completedAt,
    },
    select: {
      currentValue: true,
      completedAt: true,
    },
  });

  revalidatePath("/portal/goals");

  return {
    ok: true,
    completed: !!updated.completedAt,
    currentValue: updated.currentValue,
  };
}

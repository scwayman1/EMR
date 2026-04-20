"use server";

// Shared server action for the Practice Launch wizard.
// Persists a step's form submission into `Organization.launchStateJson`
// and redirects to the next step — or to the launch page with a
// "?done=1" marker once the final step is saved.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getLaunchStep,
  getNextStepId,
  type LaunchStepId,
} from "@/lib/domain/practice-launch";

type StepPayload = Record<string, string | number | boolean | null>;

/**
 * Save the given step's submission and advance to the next step.
 *
 * Form fields are read out of `FormData` (everything except `_stepId`)
 * and merged into `Organization.launchStateJson` under the step key.
 */
export async function saveLaunchStepAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!user.organizationId) {
    throw new Error("UNAUTHORIZED");
  }

  const rawStepId = formData.get("_stepId");
  if (typeof rawStepId !== "string") {
    throw new Error("Missing _stepId");
  }
  const stepId = rawStepId as LaunchStepId;
  const step = getLaunchStep(stepId);
  if (!step) {
    throw new Error(`Unknown step: ${stepId}`);
  }

  // Collect every non-underscored form field into a simple key/value payload.
  const payload: StepPayload = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("_")) continue;
    payload[key] = typeof value === "string" ? value : null;
  }
  payload._savedAt = new Date().toISOString();

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { launchStateJson: true },
  });

  const current =
    org?.launchStateJson && typeof org.launchStateJson === "object" && !Array.isArray(org.launchStateJson)
      ? (org.launchStateJson as Record<string, unknown>)
      : {};

  const nextState: Prisma.InputJsonValue = {
    ...current,
    [stepId]: payload,
  } as Prisma.InputJsonValue;

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { launchStateJson: nextState },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: user.id,
      action: "launch.wizard.step_saved",
      subjectType: "Organization",
      subjectId: user.organizationId,
      organizationId: user.organizationId,
      metadata: { stepId, fields: Object.keys(payload) },
    },
  });

  // Special case — saving "go_live" flips the PracticeLaunchStatus.goLiveAt.
  if (stepId === "go_live") {
    await prisma.practiceLaunchStatus.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        goLiveAt: new Date(),
      },
      update: { goLiveAt: new Date() },
    });
  }

  revalidatePath("/ops/launch");
  revalidatePath("/ops");

  const next = getNextStepId(stepId);
  if (next) {
    redirect(`/ops/launch?step=${next}`);
  }
  redirect("/ops/launch?done=1");
}

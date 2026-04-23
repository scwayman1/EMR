"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { titrationAgent, type TitrationSuggestion } from "@/lib/agents/titration-agent";
import { createAgentContext } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Server actions for the titration suggestion flow.
// ---------------------------------------------------------------------------
// `suggestTitration` runs the agent inline (so the clinician sees the result
// right away) and persists the suggestion as an AgentJob row in
// needs_approval state. `approveTitrationSuggestion` flips the linked job
// to succeeded; `rejectTitrationSuggestion` discards it. The actual dose
// change is left to the existing prescribe flow — this page is just the
// "should we" decision support.
// ---------------------------------------------------------------------------

export type SuggestResult =
  | { ok: true; suggestion: TitrationSuggestion; jobId: string }
  | { ok: false; error: string };

const suggestSchema = z.object({
  patientId: z.string().min(1),
  regimenId: z.string().min(1),
});

export async function suggestTitration(formData: FormData): Promise<SuggestResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  const parsed = suggestSchema.safeParse({
    patientId: formData.get("patientId") as string,
    regimenId: formData.get("regimenId") as string,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const { patientId, regimenId } = parsed.data;

  // Make sure the regimen belongs to a patient in the user's organization
  const regimen = await prisma.dosingRegimen.findFirst({
    where: {
      id: regimenId,
      patientId,
      patient: { organizationId: user.organizationId! },
    },
  });
  if (!regimen) return { ok: false, error: "Regimen not found." };

  // Create an AgentJob row up front so we have an id to write back to.
  const job = await prisma.agentJob.create({
    data: {
      organizationId: user.organizationId,
      workflowName: "titration.adhoc",
      agentName: "titration",
      eventName: "ad_hoc",
      input: { patientId, regimenId },
      requiresApproval: true,
      status: "running",
      attempts: 1,
      startedAt: new Date(),
    },
  });

  const { ctx, drainLogs } = createAgentContext({
    jobId: job.id,
    organizationId: user.organizationId,
    allowed: titrationAgent.allowedActions,
    agentName: titrationAgent.name,
    agentVersion: titrationAgent.version,
  });

  try {
    const suggestion = await titrationAgent.run({ patientId, regimenId }, ctx);
    titrationAgent.outputSchema.parse(suggestion);

    await prisma.agentJob.update({
      where: { id: job.id },
      data: {
        status: "needs_approval",
        output: suggestion as any,
        logs: drainLogs() as any,
        approvalRequiredAt: new Date(),
      },
    });

    revalidatePath(`/clinic/patients/${patientId}/titration`);
    return { ok: true, suggestion, jobId: job.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        lastError: message,
        logs: drainLogs() as any,
        completedAt: new Date(),
      },
    });
    return { ok: false, error: message };
  }
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

const reviewSchema = z.object({
  jobId: z.string().min(1),
  patientId: z.string().min(1),
});

export async function approveTitrationSuggestion(
  formData: FormData,
): Promise<ReviewResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  const parsed = reviewSchema.safeParse({
    jobId: formData.get("jobId") as string,
    patientId: formData.get("patientId") as string,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const job = await prisma.agentJob.findFirst({
    where: {
      id: parsed.data.jobId,
      agentName: "titration",
      organizationId: user.organizationId,
    },
  });
  if (!job) return { ok: false, error: "Job not found." };

  await prisma.agentJob.update({
    where: { id: job.id },
    data: {
      status: "succeeded",
      approvedById: user.id,
      approvedAt: new Date(),
      completedAt: new Date(),
    },
  });

  revalidatePath(`/clinic/patients/${parsed.data.patientId}/titration`);
  return { ok: true };
}

export async function rejectTitrationSuggestion(
  formData: FormData,
): Promise<ReviewResult> {
  const user = await requireUser();
  if (!user.roles.some((r) => r === "clinician" || r === "practice_owner")) {
    return { ok: false, error: "Unauthorized — clinician role required." };
  }

  const parsed = reviewSchema.safeParse({
    jobId: formData.get("jobId") as string,
    patientId: formData.get("patientId") as string,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const job = await prisma.agentJob.findFirst({
    where: {
      id: parsed.data.jobId,
      agentName: "titration",
      organizationId: user.organizationId,
    },
  });
  if (!job) return { ok: false, error: "Job not found." };

  await prisma.agentJob.update({
    where: { id: job.id },
    data: {
      status: "cancelled",
      approvedById: user.id,
      approvedAt: new Date(),
      completedAt: new Date(),
    },
  });

  revalidatePath(`/clinic/patients/${parsed.data.patientId}/titration`);
  return { ok: true };
}

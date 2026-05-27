"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { preVisitIntelligenceAgent } from "@/lib/agents/pre-visit-intelligence-agent";
import { resolveModelClient } from "@/lib/orchestration/model-client";
import { buildToolRegistry } from "@/lib/orchestration/tool-registry";
import type { AllowedAction, AgentLogEntry, StepResult } from "@/lib/orchestration/types";

export interface BriefingStep {
  step: number;
  label: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  durationMs?: number;
}

export interface BriefingResult {
  ok: boolean;
  error?: string;
  briefing?: {
    patientSummary: string;
    lastVisitSummary: string | null;
    talkingPoints: string[];
    sections: Array<{
      title: string;
      content: string;
      priority: "high" | "medium" | "low";
      icon: string;
    }>;
    riskFlags: string[];
    confidence: number;
  };
  steps: BriefingStep[];
  totalDurationMs: number;
}

const STEP_LABELS = [
  "Loading patient profile and chart summary",
  "Reviewing recent encounters and notes",
  "Analyzing outcome trends (last 30 days)",
  "Checking medications and dosing adherence",
  "Scanning recent messages and assessments",
  "Generating intelligence briefing via LLM",
];

export async function generateBriefing(patientId: string): Promise<BriefingResult> {
  const user = await requireUser();
  const startTime = Date.now();

  // Verify access
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });

  if (!patient) {
    return {
      ok: false,
      error: "Patient not found",
      steps: [],
      totalDurationMs: Date.now() - startTime,
    };
  }

  // Find the encounter that should receive this briefing (if any). We prefer
  // an in-progress encounter (clinician is already in the room) and fall back
  // to today's scheduled encounter. When neither exists, the briefing still
  // runs but won't be persisted — the user can click "Start Visit" and
  // `startVisitWithBriefing` will create the encounter with the briefing
  // attached. Passing encounterId here lets the Schedule tile's brief line
  // and any other downstream surface read the briefing the moment it's
  // generated, without waiting for the physician to start the visit.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const encounterForBriefing = await prisma.encounter.findFirst({
    where: {
      patientId,
      organizationId: user.organizationId!,
      OR: [
        { status: "in_progress" },
        { scheduledFor: { gte: todayStart, lte: todayEnd } },
      ],
    },
    orderBy: [{ status: "asc" }, { scheduledFor: "asc" }],
    select: { id: true },
  });

  // Build a mock context that captures logs as steps
  const logs: AgentLogEntry[] = [];
  const steps: BriefingStep[] = STEP_LABELS.map((label, i) => ({
    step: i + 1,
    label,
    status: "pending" as const,
  }));

  let currentStep = 0;

  const ctx = {
    jobId: `briefing-${Date.now()}`,
    organizationId: user.organizationId,
    log(level: AgentLogEntry["level"], message: string, data?: Record<string, unknown>) {
      logs.push({ at: new Date().toISOString(), level, message, data });

      // Match log messages to steps
      const stepMatch = message.match(/Step (\d)\/6/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1]);
        // Mark previous step done
        if (currentStep > 0 && steps[currentStep - 1]) {
          steps[currentStep - 1].status = "done";
          steps[currentStep - 1].durationMs = Date.now() - startTime;
        }
        currentStep = stepNum;
        if (steps[stepNum - 1]) {
          steps[stepNum - 1].status = "running";
        }
      }
    },
    async emit() {},
    assertCan(_action: AllowedAction) {},
    model: resolveModelClient(),
    tools: buildToolRegistry({
      agentName: "preVisitIntelligence",
      agentVersion: "1.0.0",
      organizationId: user.organizationId,
      allowed: new Set(["read.patient", "read.encounter", "read.note"] as AllowedAction[]),
      stepFn() {},
      sourceFn() {},
    }),
    stepResults: new Map<string, StepResult>(),
  };

  try {
    const result = await preVisitIntelligenceAgent.run(
      { patientId, encounterId: encounterForBriefing?.id },
      ctx,
    );

    // Mark all remaining steps done
    for (const step of steps) {
      if (step.status !== "done") step.status = "done";
      if (!step.durationMs) step.durationMs = Date.now() - startTime;
    }

    return {
      ok: true,
      briefing: result,
      steps,
      totalDurationMs: Date.now() - startTime,
    };
  } catch (err) {
    // Mark current step as error
    if (currentStep > 0 && steps[currentStep - 1]) {
      steps[currentStep - 1].status = "error";
      steps[currentStep - 1].detail =
        err instanceof Error ? err.message : "Unknown error";
    }

    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
      steps,
      totalDurationMs: Date.now() - startTime,
    };
  }
}

/**
 * Start a visit with briefing context pre-loaded.
 *
 * This creates/finds the encounter, stores the briefing data on it,
 * dispatches the scribe event, and redirects to notes. The scribe agent
 * picks up the briefingContext from the encounter and uses it to
 * pre-seed the note with talking points, risk flags, and assessment.
 */
export async function startVisitWithBriefing(
  patientId: string,
  briefing: BriefingResult["briefing"],
) {
  const user = await requireUser();

  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      organizationId: user.organizationId!,
      deletedAt: null,
    },
  });
  if (!patient) {
    redirect(`/clinic/patients/${patientId}?tab=notes&error=not_found`);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let encounter = await prisma.encounter.findFirst({
    where: {
      patientId,
      organizationId: user.organizationId!,
      status: "in_progress",
      createdAt: { gte: todayStart, lte: todayEnd },
    },
  });

  if (!encounter) {
    encounter = await prisma.encounter.create({
      data: {
        organizationId: user.organizationId!,
        patientId,
        status: "in_progress",
        modality: "in_person",
        reason: "Visit",
        startedAt: new Date(),
        scheduledFor: new Date(),
        // Store the briefing context so the scribe can use it
        briefingContext: briefing ? (briefing as any) : undefined,
      },
    });
  } else if (briefing) {
    // Update existing encounter with briefing
    await prisma.encounter.update({
      where: { id: encounter.id },
      data: { briefingContext: briefing as any },
    });
  }

  // Dispatch the scribe event
  const jobs = await dispatch({
    name: "encounter.note.draft.requested",
    encounterId: encounter.id,
    requestedBy: user.id,
  });

  // Try to run the agent inline with a 15-second timeout
  let createdNoteId: string | null = null;
  try {
    if (jobs.length > 0) {
      const jobRows = await prisma.agentJob.findMany({ where: { id: { in: jobs } } });
      const { runJob } = await import("@/lib/orchestration/runner");

      await Promise.race([
        Promise.all(jobRows.map(job => runJob(job, "inline-briefed-visit"))),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        ),
      ]);
    }

    // Find the note that was just created
    const latestNote = await prisma.note.findFirst({
      where: { encounterId: encounter.id },
      orderBy: { createdAt: "desc" },
    });
    createdNoteId = latestNote?.id ?? null;
  } catch {
    // Timeout is fine — job stays in the queue for the background worker
  }

  revalidatePath(`/clinic/patients/${patientId}`);

  // Redirect directly to the note if we have one, otherwise to the notes tab
  if (createdNoteId) {
    redirect(`/clinic/patients/${patientId}/notes/${createdNoteId}?from=briefing`);
  } else {
    redirect(`/clinic/patients/${patientId}?tab=notes`);
  }
}

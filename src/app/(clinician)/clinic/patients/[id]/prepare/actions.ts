"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { preVisitIntelligenceAgent } from "@/lib/agents/pre-visit-intelligence-agent";
import { resolveModelClient } from "@/lib/orchestration/model-client";
import type { AllowedAction, AgentLogEntry } from "@/lib/orchestration/types";

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
  };

  try {
    const result = await preVisitIntelligenceAgent.run(
      { patientId },
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

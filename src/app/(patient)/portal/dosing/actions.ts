"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { dosingRecommendationAgent } from "@/lib/agents/dosing-recommendation-agent";
import { resolveModelClient } from "@/lib/orchestration/model-client";
import type { AllowedAction } from "@/lib/orchestration/types";
import type { DosingRecommendation } from "@/lib/agents/dosing-recommendation-agent";

export interface DosingResult {
  ok: boolean;
  error?: string;
  recommendation?: DosingRecommendation;
  durationMs: number;
}

export async function generateDosingRecommendation(): Promise<DosingResult> {
  const user = await requireRole("patient");
  const startTime = Date.now();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return { ok: false, error: "Patient profile not found", durationMs: Date.now() - startTime };
  }

  const ctx = {
    jobId: `dosing-${Date.now()}`,
    organizationId: user.organizationId,
    log() {},
    async emit() {},
    assertCan(_action: AllowedAction) {},
    model: resolveModelClient(),
  };

  try {
    const result = await dosingRecommendationAgent.run({ patientId: patient.id }, ctx);
    return { ok: true, recommendation: result, durationMs: Date.now() - startTime };
  } catch (err) {
    console.error("[dosing] error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to generate dosing recommendation",
      durationMs: Date.now() - startTime,
    };
  }
}

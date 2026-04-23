"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { fairytaleSummaryAgent } from "@/lib/agents/fairytale-summary-agent";
import { createLightContext } from "@/lib/orchestration/context";

export interface FairytaleResult {
  ok: boolean;
  error?: string;
  story?: {
    title: string;
    openingLine: string;
    chapters: Array<{ heading: string; body: string }>;
    closingLine: string;
    generatedAt: string;
  };
  durationMs: number;
}

export async function generateFairytale(): Promise<FairytaleResult> {
  const user = await requireRole("patient");
  const startTime = Date.now();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return {
      ok: false,
      error: "Patient profile not found",
      durationMs: Date.now() - startTime,
    };
  }

  const ctx = createLightContext({
    jobId: `fairytale-${Date.now()}`,
    organizationId: user.organizationId,
  });

  try {
    const result = await fairytaleSummaryAgent.run({ patientId: patient.id }, ctx);
    return {
      ok: true,
      story: result,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error("[fairytale] error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to generate story",
      durationMs: Date.now() - startTime,
    };
  }
}

"use server";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { patientEducationAgent, patientSimplifierAgent } from "@/lib/agents/patient-education-agent";
import { createLightContext } from "@/lib/orchestration/context";

// ---------------------------------------------------------------------------
// Education Sheet generation (EMR-66)
// ---------------------------------------------------------------------------

export interface EducationSheetResult {
  ok: boolean;
  error?: string;
  sheet?: {
    title: string;
    patientName: string;
    generatedAt: string;
    sections: Array<{
      heading: string;
      icon: string;
      body: string;
      tips?: string[];
    }>;
    safetyReminders: string[];
    glossary: Array<{ term: string; definition: string }>;
  };
  durationMs: number;
}

export async function generateEducationSheet(): Promise<EducationSheetResult> {
  const user = await requireRole("patient");
  const startTime = Date.now();

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!patient) {
    return { ok: false, error: "Patient profile not found", durationMs: Date.now() - startTime };
  }

  const ctx = createLightContext({
    jobId: `education-${Date.now()}`,
    organizationId: user.organizationId,
  });

  try {
    const result = await patientEducationAgent.run({ patientId: patient.id }, ctx);
    return { ok: true, sheet: result, durationMs: Date.now() - startTime };
  } catch (err) {
    console.error("[education] error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to generate education sheet",
      durationMs: Date.now() - startTime,
    };
  }
}

// ---------------------------------------------------------------------------
// Text simplifier (EMR-54 / EMR-009)
// ---------------------------------------------------------------------------

export interface SimplifyResult {
  ok: boolean;
  error?: string;
  simplified?: string;
  readingLevel?: string;
  glossary?: Array<{ term: string; definition: string }>;
}

export async function simplifyText(
  text: string,
  context: "visit_summary" | "lab_result" | "care_plan" | "medication" | "general" = "general",
): Promise<SimplifyResult> {
  await requireRole("patient");

  if (!text.trim()) {
    return { ok: false, error: "No text provided" };
  }

  const ctx = createLightContext({ jobId: `simplify-${Date.now()}` });

  try {
    const result = await patientSimplifierAgent.run({ text, context }, ctx);
    return {
      ok: true,
      simplified: result.simplified,
      readingLevel: result.readingLevel,
      glossary: result.glossary,
    };
  } catch (err) {
    console.error("[simplify] error:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unable to simplify text",
    };
  }
}

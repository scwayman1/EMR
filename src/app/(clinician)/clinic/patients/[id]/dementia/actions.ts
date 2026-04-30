"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  DEMENTIA_ASSESSMENT_SLUG,
  DEMENTIA_SCREEN_SCHEMA,
  scoreDementiaScreen,
  type DementiaScreenAnswers,
} from "@/lib/domain/dementia-screen";

const schema = z.object({
  patientId: z.string(),
  answers: z.record(z.enum(["yes", "no"])),
});

/**
 * Persists the screen as an AssessmentResponse so it lives alongside
 * PHQ-9 / GAD-7 / etc. We upsert the Assessment row on first run so we
 * don't need a separate seed step in dev.
 */
export async function recordDementiaScreenAction(
  input: z.infer<typeof schema>,
): Promise<{ ok: true; score: number; band: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid screen submission." };

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, organizationId: user.organizationId!, deletedAt: null },
  });
  if (!patient) return { ok: false, error: "Patient not found." };

  const assessment = await prisma.assessment.upsert({
    where: { slug: DEMENTIA_ASSESSMENT_SLUG },
    create: {
      slug: DEMENTIA_ASSESSMENT_SLUG,
      title: "Mindspan Cognitive Screen",
      description:
        "Hybrid Mini-Cog + AD8 short-form dementia screen. 10 yes/no items, 1 point each.",
      schema: DEMENTIA_SCREEN_SCHEMA as any,
      scoringRules: {
        bands: [
          { max: 1, label: "low" },
          { max: 2, label: "borderline" },
          { max: 10, label: "positive" },
        ],
      } as any,
    },
    update: {},
  });

  const result = scoreDementiaScreen(parsed.data.answers as DementiaScreenAnswers);

  await prisma.assessmentResponse.create({
    data: {
      assessmentId: assessment.id,
      patientId: parsed.data.patientId,
      answers: parsed.data.answers as any,
      score: result.score,
      interpretation: `${result.band}: ${result.interpretation}`,
    },
  });

  revalidatePath(`/clinic/patients/${parsed.data.patientId}/dementia`);
  return { ok: true, score: result.score, band: result.band };
}

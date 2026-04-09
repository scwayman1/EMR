"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { getTemplate } from "./templates";

export type SubmitResult =
  | { ok: true; score: number; interpretation: string; label: string }
  | { ok: false; error: string };

export async function submitAssessmentAction(
  _prev: SubmitResult | null,
  formData: FormData
): Promise<SubmitResult> {
  const user = await requireRole("patient");

  const slug = formData.get("slug") as string;
  const template = getTemplate(slug);
  if (!template) return { ok: false, error: "Unknown assessment." };

  // Parse answers
  const answers: Record<string, number> = {};
  for (const q of template.questions) {
    const raw = formData.get(q.id);
    if (raw === null || raw === "") {
      return { ok: false, error: "Please answer every question before submitting." };
    }
    const parsed = z.coerce.number().int().min(0).safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Invalid answer value." };
    answers[q.id] = parsed.data;
  }

  // Compute score (sum for PHQ-9 and GAD-7; average for Pain VAS)
  const values = Object.values(answers);
  let score: number;
  if (slug === "pain-vas") {
    score = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  } else {
    score = values.reduce((a, b) => a + b, 0);
  }

  // Find interpretation
  const interp = template.interpretations.find(
    (i) => score >= i.min && score <= i.max
  );
  const label = interp?.label ?? "Unknown";
  const interpretation = interp?.description ?? "No interpretation available.";

  // Look up patient
  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) return { ok: false, error: "No patient profile found." };

  // Find or create the Assessment row by slug
  let assessment = await prisma.assessment.findUnique({ where: { slug } });
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        slug: template.slug,
        title: template.title,
        description: template.description,
        schema: template.questions as any,
      },
    });
  }

  await prisma.assessmentResponse.create({
    data: {
      assessmentId: assessment.id,
      patientId: patient.id,
      answers: answers as any,
      score,
      interpretation,
    },
  });

  revalidatePath("/portal/assessments");

  return { ok: true, score, interpretation, label };
}

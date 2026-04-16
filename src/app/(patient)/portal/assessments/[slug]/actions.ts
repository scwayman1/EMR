"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import {
  buildAnswerSchema,
  getAssessmentDefinition,
  scoreAssessment,
} from "@/lib/domain/assessments";

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitAssessmentAction(
  slug: string,
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  const user = await requireRole("patient");

  const def = getAssessmentDefinition(slug);
  if (!def) return { ok: false, error: "Unknown assessment." };

  const patient = await prisma.patient.findUnique({ where: { userId: user.id } });
  if (!patient) return { ok: false, error: "No patient profile found." };

  const assessment = await prisma.assessment.findUnique({ where: { slug } });
  if (!assessment) return { ok: false, error: "Assessment not configured." };

  // Gather answers keyed by question id.
  const raw: Record<string, string> = {};
  for (const q of def.questions) {
    const v = formData.get(q.id);
    if (typeof v === "string") raw[q.id] = v;
  }

  const parsed = buildAnswerSchema(def).safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `Please answer: ${first.path.join(".")}` : "Please answer every question.",
    };
  }

  const { score, band } = scoreAssessment(def, parsed.data);

  await prisma.assessmentResponse.create({
    data: {
      assessmentId: assessment.id,
      patientId: patient.id,
      answers: parsed.data as any,
      score,
      interpretation: `${band.label} — ${band.description}`,
    },
  });

  revalidatePath("/portal/assessments");
  revalidatePath(`/portal/assessments/${slug}`);
  redirect(`/portal/assessments/${slug}?done=1`);
}

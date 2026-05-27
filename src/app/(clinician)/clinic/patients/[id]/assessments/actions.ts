"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { getTemplate } from "@/app/(patient)/portal/assessments/[slug]/templates";

// EMR-160 — clinician quick-entry server action.
//
// The patient-side action (portal/assessments/[slug]/actions.ts) walks
// every question and computes the score from individual answers. Useful
// for the patient form, fragile for the chart workflow: a clinician with
// a paper PHQ-9 in hand wants to type "14" and move on, not click through
// nine radio rows. This action accepts the total score directly, validates
// it against the template's interpretation bands so a typo can't sneak a
// score of 99 into the chart, and links the result to the encounter the
// physician is in (so it shows up under the visit and threads the audit
// trail).

const quickEntrySchema = z.object({
  patientId: z.string().min(1),
  slug: z.string().min(1),
  score: z.coerce.number().finite(),
  encounterId: z.string().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export type QuickEntryResult =
  | { ok: true; responseId: string; label: string }
  | { ok: false; error: string };

export async function recordAssessmentQuickEntry(
  _prev: QuickEntryResult | null,
  formData: FormData,
): Promise<QuickEntryResult> {
  const user = await requireUser();
  if (!user.organizationId) {
    return { ok: false, error: "No clinic affiliation on file." };
  }

  const parsed = quickEntrySchema.safeParse({
    patientId: formData.get("patientId"),
    slug: formData.get("slug"),
    score: formData.get("score"),
    encounterId: formData.get("encounterId") || null,
    note: formData.get("note") || null,
  });
  if (!parsed.success) {
    return { ok: false, error: "Missing or malformed input." };
  }

  const { patientId, slug, score, encounterId, note } = parsed.data;

  const template = getTemplate(slug);
  if (!template) return { ok: false, error: `Unknown instrument: ${slug}` };

  // Score must fall inside the union of interpretation bands. Each
  // template defines [min, max] per band; outside that range we refuse
  // to write — protects against a fat-finger entry of "55" for a PHQ-9
  // (max 27) silently classifying as "Severe".
  const overallMin = Math.min(...template.interpretations.map((i) => i.min));
  const overallMax = Math.max(...template.interpretations.map((i) => i.max));
  if (score < overallMin || score > overallMax) {
    return {
      ok: false,
      error: `Score must be between ${overallMin} and ${overallMax} for ${template.title}.`,
    };
  }

  const interp = template.interpretations.find(
    (i) => score >= i.min && score <= i.max,
  );
  const interpretation = interp?.description ?? "No interpretation available.";
  const label = interp?.label ?? "Unknown";

  // Sanity: the chart must belong to the same org the clinician is in.
  // We don't enforce a specific role beyond requireUser() because nurses
  // and MAs legitimately enter assessment scores during rooming.
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, organizationId: user.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) return { ok: false, error: "Patient not found in this clinic." };

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

  // Encounter link — optional, but typed as a string we own. We validate
  // ownership before writing so a stale URL referencing another patient's
  // encounter can't slip through.
  let validEncounterId: string | undefined;
  if (encounterId) {
    const enc = await prisma.encounter.findFirst({
      where: {
        id: encounterId,
        patientId: patient.id,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });
    if (enc) validEncounterId = enc.id;
  }

  const response = await prisma.assessmentResponse.create({
    data: {
      assessmentId: assessment.id,
      patientId: patient.id,
      // We don't have per-question answers in quick-entry. Stash the
      // clinician's narrative note + encounter pointer in `answers` so
      // the audit trail still has the source of the score.
      answers: {
        _quickEntry: true,
        recordedByUserId: user.id,
        encounterId: validEncounterId ?? null,
        note: note?.trim() || null,
      } as any,
      score,
      interpretation,
    },
  });

  revalidatePath(`/clinic/patients/${patientId}`);
  revalidatePath(`/clinic/patients/${patientId}/assessments`);

  return { ok: true, responseId: response.id, label };
}

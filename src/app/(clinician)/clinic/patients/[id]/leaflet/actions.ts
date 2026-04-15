"use server";

import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { createLightContext } from "@/lib/orchestration/context";
import { formatDate, fullName } from "@/lib/utils/format";
import {
  extractNoteSection,
  extractActionItems,
  buildDeterministicNarrative,
  type LeafletData,
  type LeafletMedication,
} from "@/lib/domain/leaflet";

// ---------------------------------------------------------------------------
// EMR-149: Data assembly
// ---------------------------------------------------------------------------

export async function generateLeafletData(
  encounterId: string,
): Promise<{ ok: true; data: LeafletData } | { ok: false; error: string }> {
  const user = await requireUser();

  const encounter = await prisma.encounter.findFirst({
    where: { id: encounterId, organizationId: user.organizationId! },
    include: {
      patient: {
        include: {
          medications: { where: { active: true } },
          dosingRegimens: { where: { active: true }, include: { product: true } },
          outcomeLogs: { orderBy: { loggedAt: "desc" }, take: 5 },
          appointments: { where: { status: "confirmed" }, orderBy: { startAt: "asc" }, take: 1 },
        },
      },
      provider: { include: { user: { select: { firstName: true, lastName: true } } } },
      notes: { where: { status: "finalized" }, orderBy: { finalizedAt: "desc" }, take: 1 },
    },
  });

  if (!encounter) return { ok: false, error: "Encounter not found" };

  const patient = encounter.patient;
  const note = encounter.notes[0];
  const blocks = (note?.blocks as any[]) ?? [];
  const provider = encounter.provider;

  // Build medication list
  const meds: LeafletMedication[] = [];
  for (const r of patient.dosingRegimens) {
    const p = (r as any).product;
    meds.push({
      name: p?.name ?? "Cannabis product",
      dosage: `${r.volumePerDose} ${r.volumeUnit}, ${r.frequencyPerDay}x daily`,
      instructions: r.patientInstructions,
      type: "cannabis",
    });
  }
  for (const m of patient.medications) {
    meds.push({
      name: m.name,
      dosage: m.dosage ?? "",
      instructions: null,
      type: (m.type as any) ?? "prescription",
    });
  }

  // Extract note sections
  const assessment = extractNoteSection(blocks, "assessment");
  const plan = extractNoteSection(blocks, "plan");
  const subjective = extractNoteSection(blocks, "subjective");
  const summary = extractNoteSection(blocks, "summary");

  const discussed = subjective || assessment || summary || "Visit details not yet documented.";
  const nextSteps = extractActionItems(plan);
  const carePlanNotes = plan || "Care plan will be updated after your next visit.";

  // Follow-up
  const nextAppt = patient.appointments[0];
  const followUp = nextAppt
    ? `Your next appointment is ${formatDate(nextAppt.startAt)}.`
    : "Please schedule a follow-up visit within 2-4 weeks.";

  // Narrative source
  const narrativeSource = [assessment, plan, subjective].filter(Boolean).join("\n\n");

  const data: LeafletData = {
    patientName: fullName(patient.firstName, patient.lastName),
    patientDOB: patient.dateOfBirth ? formatDate(patient.dateOfBirth) : null,
    allergies: patient.allergies ?? [],
    visit: {
      date: formatDate(encounter.scheduledFor ?? encounter.createdAt),
      provider: provider?.user ? fullName(provider.user.firstName, provider.user.lastName) : "Your care team",
      modality: encounter.modality,
      reason: encounter.reason,
    },
    discussed,
    carePlan: meds,
    carePlanNotes,
    nextSteps: nextSteps.length > 0 ? nextSteps : ["Continue current care plan", "Log outcomes daily in the portal"],
    followUp,
    narrativeSource,
    generatedAt: new Date().toISOString(),
  };

  return { ok: true, data };
}

// ---------------------------------------------------------------------------
// EMR-150: AI narrative generation
// ---------------------------------------------------------------------------

export type LeafletTone = "warm" | "clinical" | "brief";

export async function generateLeafletNarrative(
  data: LeafletData,
  tone: LeafletTone = "warm",
): Promise<{ ok: true; narrative: string } | { ok: false; error: string }> {
  if (!data.narrativeSource.trim()) {
    return { ok: true, narrative: buildDeterministicNarrative(data) };
  }

  const toneInstructions: Record<LeafletTone, string> = {
    warm: "Write 2-3 warm, encouraging sentences. Use the patient's first name. Speak to them like a kind care team member. Acknowledge their progress.",
    clinical: "Write 2-3 clear, structured sentences. Professional but not cold. Focus on what was assessed and what was decided.",
    brief: "Write exactly 1 sentence summarizing the visit and key outcome.",
  };

  const ctx = createLightContext({ jobId: `leaflet-narrative-${Date.now()}` });

  const prompt = `You are writing a short narrative recap for a patient's after-visit summary at Leafjourney, a cannabis care clinic.

PATIENT: ${data.patientName}
VISIT: ${data.visit.date}, ${data.visit.modality} with ${data.visit.provider}
REASON: ${data.visit.reason ?? "Follow-up"}

CLINICAL NOTES:
${data.narrativeSource}

MEDICATIONS: ${data.carePlan.map((m) => m.name).join(", ") || "None"}

TONE: ${toneInstructions[tone]}

RULES:
- Do NOT invent facts not in the clinical notes
- Do NOT use "As an AI" or clinical jargon
- Write at a 3rd-grade reading level
- Be truthful and specific — reference real details from the notes

Return ONLY the narrative text, no JSON, no markdown.`;

  try {
    const narrative = await ctx.model.complete(prompt, {
      maxTokens: 256,
      temperature: 0.35,
    });
    return { ok: true, narrative: narrative.trim() };
  } catch {
    return { ok: true, narrative: buildDeterministicNarrative(data) };
  }
}

// ---------------------------------------------------------------------------
// EMR-152: Save to chart
// ---------------------------------------------------------------------------

export async function saveLeafletToChart(
  encounterId: string,
  narrative: string,
  leafletData: LeafletData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();

  const encounter = await prisma.encounter.findFirst({
    where: { id: encounterId, organizationId: user.organizationId! },
    select: { patientId: true, organizationId: true },
  });

  if (!encounter) return { ok: false, error: "Encounter not found" };

  await prisma.document.create({
    data: {
      organizationId: encounter.organizationId,
      patientId: encounter.patientId,
      kind: "other",
      originalName: `Leaflet — ${leafletData.visit.date}.json`,
      mimeType: "application/json",
      sizeBytes: JSON.stringify({ ...leafletData, narrative }).length,
      storageKey: `leaflets/${encounter.patientId}/${encounterId}/${Date.now()}.json`,
      tags: ["leaflet", "after-visit-summary"],
      uploadedById: user.id,
      encounterId,
    },
  });

  return { ok: true };
}

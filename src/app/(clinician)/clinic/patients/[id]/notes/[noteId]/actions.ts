"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";
import { resolveModelClient } from "@/lib/orchestration/model-client";
import { z } from "zod";

const blockSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

const saveSchema = z.object({
  noteId: z.string(),
  blocks: z.array(blockSchema),
});

export type SaveNoteResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

/**
 * Save note blocks without changing status.
 */
export async function saveNoteBlocks(
  noteId: string,
  blocks: { heading: string; body: string }[]
): Promise<SaveNoteResult> {
  const user = await requireUser();

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: { encounter: true },
  });
  if (!note) return { ok: false, error: "Note not found" };

  // Verify org access
  const encounter = await prisma.encounter.findFirst({
    where: {
      id: note.encounterId,
      organizationId: user.organizationId!,
    },
  });
  if (!encounter) return { ok: false, error: "Unauthorized" };

  await prisma.note.update({
    where: { id: noteId },
    data: { blocks: blocks as any },
  });

  revalidatePath(`/clinic/patients/${encounter.patientId}`);
  return { ok: true, status: note.status };
}

/**
 * Finalize a note: set status to finalized, record the author and timestamp,
 * then dispatch the note.finalized event which triggers the Coding Readiness Agent.
 */
export async function finalizeNote(noteId: string): Promise<SaveNoteResult> {
  const user = await requireUser();

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: { encounter: true },
  });
  if (!note) return { ok: false, error: "Note not found" };

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: note.encounterId,
      organizationId: user.organizationId!,
    },
  });
  if (!encounter) return { ok: false, error: "Unauthorized" };

  await prisma.note.update({
    where: { id: noteId },
    data: {
      status: "finalized",
      finalizedAt: new Date(),
      authorUserId: user.id,
    },
  });

  // Also mark the encounter as complete
  await prisma.encounter.update({
    where: { id: note.encounterId },
    data: { status: "complete", completedAt: new Date() },
  });

  // Dispatch note.finalized → triggers Coding Agent + Physician Nudge Agent
  await dispatch({
    name: "note.finalized",
    noteId,
    encounterId: note.encounterId,
    finalizedBy: user.id,
  });

  // Dispatch encounter.completed → triggers Patient Outreach Agent
  await dispatch({
    name: "encounter.completed",
    encounterId: note.encounterId,
    patientId: encounter.patientId,
    completedAt: new Date(),
  });

  // In dev, run the queue inline so coding suggestions appear immediately
  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 4);
  }

  revalidatePath(`/clinic/patients/${encounter.patientId}`);
  return { ok: true, status: "finalized" };
}

/**
 * Save blocks and finalize in a single action.
 */
export async function saveAndFinalizeNote(
  noteId: string,
  blocks: { heading: string; body: string }[]
): Promise<SaveNoteResult> {
  const user = await requireUser();

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: { encounter: true },
  });
  if (!note) return { ok: false, error: "Note not found" };

  const encounter = await prisma.encounter.findFirst({
    where: {
      id: note.encounterId,
      organizationId: user.organizationId!,
    },
  });
  if (!encounter) return { ok: false, error: "Unauthorized" };

  await prisma.note.update({
    where: { id: noteId },
    data: {
      blocks: blocks as any,
      status: "finalized",
      finalizedAt: new Date(),
      authorUserId: user.id,
    },
  });

  // Also mark the encounter as complete
  await prisma.encounter.update({
    where: { id: note.encounterId },
    data: { status: "complete", completedAt: new Date() },
  });

  // Dispatch note.finalized → triggers Coding Agent + Physician Nudge Agent
  await dispatch({
    name: "note.finalized",
    noteId,
    encounterId: note.encounterId,
    finalizedBy: user.id,
  });

  // Dispatch encounter.completed → triggers Patient Outreach Agent
  await dispatch({
    name: "encounter.completed",
    encounterId: note.encounterId,
    patientId: encounter.patientId,
    completedAt: new Date(),
  });

  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 4);
  }

  revalidatePath(`/clinic/patients/${encounter.patientId}`);
  return { ok: true, status: "finalized" };
}

// ---------------------------------------------------------------------------
// AI Section Refiner
// ---------------------------------------------------------------------------

export type RefineMode = "expand" | "clarify" | "clinical" | "concise" | "dosing";

const REFINE_INSTRUCTIONS: Record<RefineMode, string> = {
  expand: "Expand this section with more clinical detail, supporting evidence, and specific observations. Keep clinical tone.",
  clarify: "Rewrite this section to be clearer and more precise. Remove ambiguity. Keep the same information but improve readability.",
  clinical: "Make this section more clinically rigorous. Use proper medical terminology, reference specific findings, and ensure it meets documentation standards.",
  concise: "Make this section more concise. Remove redundancy and filler while preserving all clinically relevant information.",
  dosing: "Add specific cannabis dosing details — milligrams, frequency, delivery method, titration instructions, and any relevant product information.",
};

export type RefineResult =
  | { ok: true; refined: string }
  | { ok: false; error: string };

export async function refineSection(
  noteId: string,
  sectionHeading: string,
  sectionBody: string,
  mode: RefineMode,
): Promise<RefineResult> {
  const user = await requireUser();

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    include: {
      encounter: {
        include: { patient: { select: { firstName: true, lastName: true, presentingConcerns: true } } },
      },
    },
  });
  if (!note) return { ok: false, error: "Note not found" };

  const encounter = await prisma.encounter.findFirst({
    where: { id: note.encounterId, organizationId: user.organizationId! },
  });
  if (!encounter) return { ok: false, error: "Unauthorized" };

  const patient = note.encounter.patient;
  const instruction = REFINE_INSTRUCTIONS[mode];

  const prompt = `You are an AI clinical writing assistant for a cannabis care EMR. Refine the following note section.

PATIENT: ${patient.firstName} ${patient.lastName}
PRESENTING CONCERNS: ${patient.presentingConcerns ?? "Not documented"}
SECTION: ${sectionHeading}

CURRENT TEXT:
${sectionBody}

INSTRUCTION: ${instruction}

Return ONLY the refined text — no JSON, no markdown, no explanation. Just the improved section content.`;

  const model = resolveModelClient();

  try {
    const refined = await model.complete(prompt, {
      maxTokens: 512,
      temperature: 0.25,
    });
    return { ok: true, refined: refined.trim() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI refinement failed",
    };
  }
}

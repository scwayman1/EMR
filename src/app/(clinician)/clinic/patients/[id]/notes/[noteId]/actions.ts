"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { dispatch } from "@/lib/orchestration/dispatch";
import { runTick } from "@/lib/orchestration/runner";
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

  // Dispatch note.finalized to trigger the Coding Readiness Agent
  await dispatch({
    name: "note.finalized",
    noteId,
    encounterId: note.encounterId,
    finalizedBy: user.id,
  });

  // In dev, run the queue inline so coding suggestions appear immediately
  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 2);
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

  await dispatch({
    name: "note.finalized",
    noteId,
    encounterId: note.encounterId,
    finalizedBy: user.id,
  });

  if (process.env.NODE_ENV !== "production") {
    await runTick("inline-dev", 2);
  }

  revalidatePath(`/clinic/patients/${encounter.patientId}`);
  return { ok: true, status: "finalized" };
}

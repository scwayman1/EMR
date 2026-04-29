"use server";

// ---------------------------------------------------------------------------
// EMR-312 — Curriculum progress server actions
// ---------------------------------------------------------------------------
// V1: in-memory progress map keyed by clinician id. The shape mirrors the
// future `cme_progress` table (one row per learner, JSON `lessons` blob)
// so swapping in Prisma later is a one-import change.
// ---------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import {
  applyLessonEvent,
  emptyLearnerProgress,
  type LearnerProgress,
} from "@/lib/education/curriculum";

const PROGRESS_BY_LEARNER = new Map<string, LearnerProgress>();

function getOrCreate(learnerId: string): LearnerProgress {
  let p = PROGRESS_BY_LEARNER.get(learnerId);
  if (!p) {
    p = emptyLearnerProgress(learnerId);
    PROGRESS_BY_LEARNER.set(learnerId, p);
  }
  return p;
}

export async function loadProgress(learnerId: string): Promise<LearnerProgress> {
  return getOrCreate(learnerId);
}

export async function recordLessonStarted(
  learnerId: string,
  lessonId: string,
): Promise<LearnerProgress> {
  const next = applyLessonEvent(getOrCreate(learnerId), lessonId, "started");
  PROGRESS_BY_LEARNER.set(learnerId, next);
  revalidatePath("/education");
  return next;
}

export async function recordLessonCompleted(
  learnerId: string,
  lessonId: string,
  assessmentScore?: number,
): Promise<LearnerProgress> {
  const next = applyLessonEvent(getOrCreate(learnerId), lessonId, "completed", {
    assessmentScore,
  });
  PROGRESS_BY_LEARNER.set(learnerId, next);
  revalidatePath("/education");
  return next;
}

// ---------------------------------------------------------------------------
// EMR-312 — CME credit calculation + progress tracking helpers
// ---------------------------------------------------------------------------
// Pure functions over the catalog and a `LearnerProgress` blob. Persistence
// is the caller's problem (a future migration will give us a `cme_progress`
// table; until then this is the shape it'll write/read).
//
// CME rules implemented here:
//   - 1 CME credit = 60 minutes of completed time-on-task.
//   - Modules with assessments require ≥80% on the assessment to award credit.
//   - Modules without assessments award credit on completion alone.
//   - Partial credit per lesson is supported — we sum minutes across
//     completed lessons within a module.
// ---------------------------------------------------------------------------

import type {
  CurriculumModule,
  Lesson,
  LearnerProgress,
  LearnerProgressLesson,
} from "./types";
import { CURRICULUM_MODULES } from "./catalog";

const MINUTES_PER_CME = 60;
const ASSESSMENT_PASS_THRESHOLD = 0.8;

/** Total catalog hours, used to assert the ≥42 CME-hour minimum. */
export function totalCatalogHours(
  modules: CurriculumModule[] = CURRICULUM_MODULES,
): number {
  let mins = 0;
  for (const m of modules) for (const l of m.lessons) mins += l.durationMinutes;
  return mins / 60;
}

/** True if a lesson is "complete" — completedAt set and assessment passed (when present). */
export function isLessonComplete(
  lesson: Lesson,
  progress: LearnerProgressLesson | undefined,
): boolean {
  if (!progress?.completedAt) return false;
  if (lesson.assessment && lesson.assessment.length > 0) {
    return (progress.assessmentScore ?? 0) >= ASSESSMENT_PASS_THRESHOLD;
  }
  return true;
}

/** Sum of credit-eligible minutes for a learner, across all modules. */
export function awardedCmeMinutes(
  progress: LearnerProgress,
  modules: CurriculumModule[] = CURRICULUM_MODULES,
): number {
  let mins = 0;
  for (const m of modules) {
    const assessmentLessons = m.lessons.filter(l => l.assessment && l.assessment.length > 0);
    const hasFailedAssessment = assessmentLessons.some(l => !isLessonComplete(l, progress.lessons[l.id]));
    if (hasFailedAssessment) continue;

    for (const l of m.lessons) {
      if (isLessonComplete(l, progress.lessons[l.id])) {
        mins += l.durationMinutes;
      }
    }
  }
  return mins;
}

/** CME credits = floor(minutes / 60). Quarter-credits are not supported. */
export function awardedCmeCredits(
  progress: LearnerProgress,
  modules: CurriculumModule[] = CURRICULUM_MODULES,
): number {
  return Math.floor(awardedCmeMinutes(progress, modules) / MINUTES_PER_CME);
}

/**
 * Apply a lesson event to a progress blob. Pure — returns a new blob.
 *
 * `kind === "started"` records `startedAt` if missing.
 * `kind === "completed"` records `completedAt` and (optionally) the score.
 */
export function applyLessonEvent(
  progress: LearnerProgress,
  lessonId: string,
  kind: "started" | "completed",
  options: { assessmentScore?: number; at?: string } = {},
): LearnerProgress {
  const at = options.at ?? new Date().toISOString();
  const existing = progress.lessons[lessonId];

  let updated: LearnerProgressLesson;
  if (kind === "started") {
    updated = existing ?? {
      lessonId,
      startedAt: at,
      completedAt: null,
      assessmentScore: null,
    };
  } else {
    updated = {
      lessonId,
      startedAt: existing?.startedAt ?? at,
      completedAt: at,
      assessmentScore:
        options.assessmentScore ?? existing?.assessmentScore ?? null,
    };
  }

  const nextLessons = { ...progress.lessons, [lessonId]: updated };
  const nextProgress: LearnerProgress = {
    ...progress,
    lessons: nextLessons,
    cmeCreditsAwarded: 0,
  };
  nextProgress.cmeCreditsAwarded = awardedCmeCredits(nextProgress);
  return nextProgress;
}

/** Empty progress blob — useful for new learners and tests. */
export function emptyLearnerProgress(learnerId: string): LearnerProgress {
  return { learnerId, lessons: {}, cmeCreditsAwarded: 0 };
}

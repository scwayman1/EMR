// EMR-312 — public surface for the curriculum module.

export type {
  CmeCategory,
  CurriculumModule,
  Lesson,
  LessonAssessmentItem,
  LessonLevel,
  LessonMedium,
  LearnerProgress,
  LearnerProgressLesson,
} from "./types";

export { CURRICULUM_MODULES } from "./catalog";
export {
  totalCatalogHours,
  awardedCmeMinutes,
  awardedCmeCredits,
  applyLessonEvent,
  emptyLearnerProgress,
  isLessonComplete,
} from "./cme";

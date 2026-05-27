// ---------------------------------------------------------------------------
// EMR-312 — Proprietary cannabis education curriculum: shared types
// ---------------------------------------------------------------------------
// Curriculum totals must clear ≥42 hours of CME-grade material. The catalog
// in `./catalog.ts` is the source of truth; helpers in `./cme.ts` enforce
// the total at module load so a future contributor can't silently drop
// us below the regulatory threshold.
// ---------------------------------------------------------------------------

/** ACCME-style category for CME accreditation. */
export type CmeCategory = "AMA-PRA-1" | "AAFP" | "ANCC-RN" | "PA";

/** Bloom-style cognitive level — drives the kind of assessment used. */
export type LessonLevel = "foundational" | "applied" | "advanced";

/** Lesson medium, drives the player UI. */
export type LessonMedium =
  | "video"
  | "reading"
  | "case-study"
  | "interactive-simulation"
  | "assessment";

export interface LessonAssessmentItem {
  /** Stable id for grading. */
  id: string;
  prompt: string;
  /** Multiple-choice options; the correct one's `correct` flag is true. */
  options: Array<{ id: string; label: string; correct?: boolean }>;
  /** Explanation shown after the learner answers. */
  rationale: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  level: LessonLevel;
  medium: LessonMedium;
  /** Estimated time-on-task in minutes. CME credit = sum of these / 60. */
  durationMinutes: number;
  /** Optional knowledge check. Required for the module to count for CME. */
  assessment?: LessonAssessmentItem[];
}

export interface CurriculumModule {
  id: string;
  /** Where this module sits in the catalog navigation. */
  track:
    | "foundations"
    | "pharmacology"
    | "clinical-application"
    | "special-populations"
    | "regulatory"
    | "research-methods";
  title: string;
  summary: string;
  /** ACCME-style category(s) this module is accredited under. */
  cmeCategories: CmeCategory[];
  lessons: Lesson[];
}

export interface LearnerProgressLesson {
  lessonId: string;
  /** ISO timestamp the lesson was first opened. */
  startedAt: string;
  /** ISO timestamp the lesson reached the completion threshold. */
  completedAt: string | null;
  /** 0–1, fraction of items the learner answered correctly. */
  assessmentScore: number | null;
}

export interface LearnerProgress {
  learnerId: string;
  /** Per-lesson progress, keyed by lessonId. */
  lessons: Record<string, LearnerProgressLesson>;
  /** Total CME credits awarded so far. */
  cmeCreditsAwarded: number;
}

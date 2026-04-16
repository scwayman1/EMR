// Canonical definitions for the patient-facing assessments.
//
// The Prisma `Assessment` row carries slug + title + schema hint; the
// real question set, answer choices, scoring math, and interpretation
// bands live here. This keeps the renderer code-driven (typed, easy to
// add new assessments, easy to test) while the DB remains the record
// of what's been administered.

import { z } from "zod";

export type AssessmentSlug = "phq-9" | "gad-7" | "pain-vas";

export interface AssessmentChoice {
  label: string;
  value: number;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  choices: AssessmentChoice[];
}

export interface AssessmentInterpretationBand {
  min: number;
  max: number;
  label: string;
  description: string;
  tone: "success" | "info" | "warning" | "danger";
}

export interface AssessmentDefinition {
  slug: AssessmentSlug;
  title: string;
  intro: string;
  questions: AssessmentQuestion[];
  bands: AssessmentInterpretationBand[];
}

// ----------------------------------------------------------------
// PHQ-9 — depression screening, 9 items, 0-3 each, total 0-27
// ----------------------------------------------------------------

const PHQ_CHOICES: AssessmentChoice[] = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

const PHQ_QUESTIONS: AssessmentQuestion[] = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure",
  "Trouble concentrating on things",
  "Moving or speaking so slowly that others notice — or the opposite, restless",
  "Thoughts that you would be better off dead, or of hurting yourself",
].map((text, i) => ({
  id: `q${i + 1}`,
  text,
  choices: PHQ_CHOICES,
}));

const PHQ_BANDS: AssessmentInterpretationBand[] = [
  { min: 0, max: 4, label: "Minimal", description: "No action needed for depression.", tone: "success" },
  { min: 5, max: 9, label: "Mild", description: "Watchful waiting, re-check in 2 weeks.", tone: "info" },
  { min: 10, max: 14, label: "Moderate", description: "Consider counseling or follow-up.", tone: "warning" },
  { min: 15, max: 19, label: "Moderately severe", description: "Active treatment recommended.", tone: "warning" },
  { min: 20, max: 27, label: "Severe", description: "Urgent initiation of treatment.", tone: "danger" },
];

// ----------------------------------------------------------------
// GAD-7 — anxiety, 7 items, 0-3 each, total 0-21
// ----------------------------------------------------------------

const GAD_QUESTIONS: AssessmentQuestion[] = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it's hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid as if something awful might happen",
].map((text, i) => ({
  id: `q${i + 1}`,
  text,
  choices: PHQ_CHOICES, // same 0-3 Likert
}));

const GAD_BANDS: AssessmentInterpretationBand[] = [
  { min: 0, max: 4, label: "Minimal", description: "No clinically significant anxiety.", tone: "success" },
  { min: 5, max: 9, label: "Mild", description: "Monitor; reassess in 2-4 weeks.", tone: "info" },
  { min: 10, max: 14, label: "Moderate", description: "Clinical attention recommended.", tone: "warning" },
  { min: 15, max: 21, label: "Severe", description: "Active treatment recommended.", tone: "danger" },
];

// ----------------------------------------------------------------
// Pain VAS — single item, 0-10
// ----------------------------------------------------------------

const PAIN_VAS_CHOICES: AssessmentChoice[] = Array.from({ length: 11 }, (_, i) => ({
  label: String(i),
  value: i,
}));

const PAIN_VAS_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1",
    text: "How bad is your pain right now? 0 is no pain, 10 is the worst imaginable.",
    choices: PAIN_VAS_CHOICES,
  },
];

const PAIN_VAS_BANDS: AssessmentInterpretationBand[] = [
  { min: 0, max: 0, label: "No pain", description: "No pain reported.", tone: "success" },
  { min: 1, max: 3, label: "Mild", description: "Manageable day-to-day.", tone: "info" },
  { min: 4, max: 6, label: "Moderate", description: "Interferes with activity.", tone: "warning" },
  { min: 7, max: 10, label: "Severe", description: "Significant functional impairment.", tone: "danger" },
];

// ----------------------------------------------------------------
// Registry
// ----------------------------------------------------------------

export const ASSESSMENTS: Record<AssessmentSlug, AssessmentDefinition> = {
  "phq-9": {
    slug: "phq-9",
    title: "PHQ-9",
    intro:
      "Over the last two weeks, how often have you been bothered by any of the following problems?",
    questions: PHQ_QUESTIONS,
    bands: PHQ_BANDS,
  },
  "gad-7": {
    slug: "gad-7",
    title: "GAD-7",
    intro:
      "Over the last two weeks, how often have you been bothered by the following problems?",
    questions: GAD_QUESTIONS,
    bands: GAD_BANDS,
  },
  "pain-vas": {
    slug: "pain-vas",
    title: "Pain scale",
    intro: "A quick check-in to track how your pain is trending.",
    questions: PAIN_VAS_QUESTIONS,
    bands: PAIN_VAS_BANDS,
  },
};

export function getAssessmentDefinition(slug: string): AssessmentDefinition | null {
  return (ASSESSMENTS as Record<string, AssessmentDefinition>)[slug] ?? null;
}

// ----------------------------------------------------------------
// Scoring
// ----------------------------------------------------------------

export interface ScoreResult {
  score: number;
  band: AssessmentInterpretationBand;
}

export function scoreAssessment(
  def: AssessmentDefinition,
  answers: Record<string, number>,
): ScoreResult {
  let score = 0;
  for (const q of def.questions) {
    const v = answers[q.id];
    if (typeof v === "number" && Number.isFinite(v)) {
      score += v;
    }
  }
  const band =
    def.bands.find((b) => score >= b.min && score <= b.max) ??
    def.bands[def.bands.length - 1];
  return { score, band };
}

/**
 * Build a per-question Zod validator for an assessment. Answers must
 * be one of the declared choice values for the question.
 */
export function buildAnswerSchema(def: AssessmentDefinition) {
  const shape: Record<string, z.ZodType<number>> = {};
  for (const q of def.questions) {
    const allowed = q.choices.map((c) => c.value);
    shape[q.id] = z.coerce
      .number()
      .refine((v) => allowed.includes(v), {
        message: `Invalid value for ${q.id}`,
      });
  }
  return z.object(shape);
}

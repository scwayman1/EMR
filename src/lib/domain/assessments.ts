// Assessment form schemas. Used by the assessment UI and scoring logic.

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: Array<{ value: number; label: string }>;
}

export interface AssessmentTemplate {
  slug: string;
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  scoringFn: (answers: number[]) => { score: number; interpretation: string };
}

// PHQ-9 depression screening
const PHQ9_OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" },
];

export const PHQ9: AssessmentTemplate = {
  slug: "phq-9",
  title: "PHQ-9",
  description: "Over the last 2 weeks, how often have you been bothered by the following?",
  questions: [
    { id: "q1", text: "Little interest or pleasure in doing things", options: PHQ9_OPTIONS },
    { id: "q2", text: "Feeling down, depressed, or hopeless", options: PHQ9_OPTIONS },
    { id: "q3", text: "Trouble falling or staying asleep, or sleeping too much", options: PHQ9_OPTIONS },
    { id: "q4", text: "Feeling tired or having little energy", options: PHQ9_OPTIONS },
    { id: "q5", text: "Poor appetite or overeating", options: PHQ9_OPTIONS },
    { id: "q6", text: "Feeling bad about yourself", options: PHQ9_OPTIONS },
    { id: "q7", text: "Trouble concentrating on things", options: PHQ9_OPTIONS },
    { id: "q8", text: "Moving or speaking slowly, or being fidgety/restless", options: PHQ9_OPTIONS },
    { id: "q9", text: "Thoughts that you would be better off dead, or of hurting yourself", options: PHQ9_OPTIONS },
  ],
  scoringFn: (answers) => {
    const score = answers.reduce((sum, a) => sum + a, 0);
    let interpretation = "Minimal depression";
    if (score >= 20) interpretation = "Severe depression";
    else if (score >= 15) interpretation = "Moderately severe depression";
    else if (score >= 10) interpretation = "Moderate depression";
    else if (score >= 5) interpretation = "Mild depression";
    return { score, interpretation };
  },
};

// GAD-7 anxiety screening
export const GAD7: AssessmentTemplate = {
  slug: "gad-7",
  title: "GAD-7",
  description: "Over the last 2 weeks, how often have you been bothered by the following?",
  questions: [
    { id: "q1", text: "Feeling nervous, anxious, or on edge", options: PHQ9_OPTIONS },
    { id: "q2", text: "Not being able to stop or control worrying", options: PHQ9_OPTIONS },
    { id: "q3", text: "Worrying too much about different things", options: PHQ9_OPTIONS },
    { id: "q4", text: "Trouble relaxing", options: PHQ9_OPTIONS },
    { id: "q5", text: "Being so restless that it's hard to sit still", options: PHQ9_OPTIONS },
    { id: "q6", text: "Becoming easily annoyed or irritable", options: PHQ9_OPTIONS },
    { id: "q7", text: "Feeling afraid, as if something awful might happen", options: PHQ9_OPTIONS },
  ],
  scoringFn: (answers) => {
    const score = answers.reduce((sum, a) => sum + a, 0);
    let interpretation = "Minimal anxiety";
    if (score >= 15) interpretation = "Severe anxiety";
    else if (score >= 10) interpretation = "Moderate anxiety";
    else if (score >= 5) interpretation = "Mild anxiety";
    return { score, interpretation };
  },
};

// Pain Visual Analog Scale
export const PAIN_VAS: AssessmentTemplate = {
  slug: "pain-vas",
  title: "Pain VAS",
  description: "Rate your current pain level.",
  questions: [
    {
      id: "q1",
      text: "On a scale of 0-10, how would you rate your pain right now?",
      options: Array.from({ length: 11 }, (_, i) => ({
        value: i,
        label: i === 0 ? "0 — No pain" : i === 10 ? "10 — Worst pain" : String(i),
      })),
    },
  ],
  scoringFn: (answers) => {
    const score = answers[0] ?? 0;
    let interpretation = "No pain";
    if (score >= 7) interpretation = "Severe pain";
    else if (score >= 4) interpretation = "Moderate pain";
    else if (score >= 1) interpretation = "Mild pain";
    return { score, interpretation };
  },
};

export const ASSESSMENT_TEMPLATES: Record<string, AssessmentTemplate> = {
  "phq-9": PHQ9,
  "gad-7": GAD7,
  "pain-vas": PAIN_VAS,
};

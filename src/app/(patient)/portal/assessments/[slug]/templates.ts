// Assessment templates — shared between the server action and the client form.
// NOT a "use server" file, so it can export non-async functions and constants.

export interface AssessmentOption {
  label: string;
  value: number;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: AssessmentOption[];
}

export interface Interpretation {
  min: number;
  max: number;
  label: string;
  description: string;
}

export interface AssessmentTemplate {
  slug: string;
  title: string;
  description: string;
  questions: AssessmentQuestion[];
  interpretations: Interpretation[];
}

const PHQ9_OPTIONS: AssessmentOption[] = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

const GAD7_OPTIONS: AssessmentOption[] = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

export const TEMPLATES: AssessmentTemplate[] = [
  {
    slug: "phq-9",
    title: "PHQ-9",
    description:
      "Patient Health Questionnaire -- a quick screen for depression severity. Nine questions, takes about two minutes.",
    questions: [
      { id: "q1", text: "Little interest or pleasure in doing things", options: PHQ9_OPTIONS },
      { id: "q2", text: "Feeling down, depressed, or hopeless", options: PHQ9_OPTIONS },
      { id: "q3", text: "Trouble falling or staying asleep, or sleeping too much", options: PHQ9_OPTIONS },
      { id: "q4", text: "Feeling tired or having little energy", options: PHQ9_OPTIONS },
      { id: "q5", text: "Poor appetite or overeating", options: PHQ9_OPTIONS },
      { id: "q6", text: "Feeling bad about yourself -- or that you are a failure or have let yourself or your family down", options: PHQ9_OPTIONS },
      { id: "q7", text: "Trouble concentrating on things, such as reading the newspaper or watching television", options: PHQ9_OPTIONS },
      { id: "q8", text: "Moving or speaking so slowly that other people could have noticed. Or the opposite -- being so fidgety or restless that you have been moving around a lot more than usual", options: PHQ9_OPTIONS },
      { id: "q9", text: "Thoughts that you would be better off dead, or of hurting yourself in some way", options: PHQ9_OPTIONS },
    ],
    interpretations: [
      { min: 0, max: 4, label: "Minimal", description: "Minimal depression. Symptoms are few and mild." },
      { min: 5, max: 9, label: "Mild", description: "Mild depression. Consider watchful waiting and follow-up." },
      { min: 10, max: 14, label: "Moderate", description: "Moderate depression. A treatment plan may be beneficial." },
      { min: 15, max: 19, label: "Moderately severe", description: "Moderately severe depression. Active treatment is recommended." },
      { min: 20, max: 27, label: "Severe", description: "Severe depression. Immediate intervention is recommended." },
    ],
  },
  {
    slug: "gad-7",
    title: "GAD-7",
    description:
      "Generalized Anxiety Disorder scale -- seven questions that help track anxiety levels over the past two weeks.",
    questions: [
      { id: "q1", text: "Feeling nervous, anxious, or on edge", options: GAD7_OPTIONS },
      { id: "q2", text: "Not being able to stop or control worrying", options: GAD7_OPTIONS },
      { id: "q3", text: "Worrying too much about different things", options: GAD7_OPTIONS },
      { id: "q4", text: "Trouble relaxing", options: GAD7_OPTIONS },
      { id: "q5", text: "Being so restless that it is hard to sit still", options: GAD7_OPTIONS },
      { id: "q6", text: "Becoming easily annoyed or irritable", options: GAD7_OPTIONS },
      { id: "q7", text: "Feeling afraid, as if something awful might happen", options: GAD7_OPTIONS },
    ],
    interpretations: [
      { min: 0, max: 4, label: "Minimal", description: "Minimal anxiety. Symptoms are within a normal range." },
      { min: 5, max: 9, label: "Mild", description: "Mild anxiety. Monitor and consider reassessment." },
      { min: 10, max: 14, label: "Moderate", description: "Moderate anxiety. Further evaluation may be helpful." },
      { min: 15, max: 21, label: "Severe", description: "Severe anxiety. Active treatment is strongly recommended." },
    ],
  },
  {
    slug: "pain-vas",
    title: "Pain VAS",
    description:
      "Visual Analog Scale for pain -- rate your current pain intensity on a 0-10 scale across several dimensions.",
    questions: [
      {
        id: "q1",
        text: "How would you rate your pain right now?",
        options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
      },
      {
        id: "q2",
        text: "How would you rate your pain at its worst in the past week?",
        options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
      },
      {
        id: "q3",
        text: "How would you rate your pain at its best in the past week?",
        options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
      },
      {
        id: "q4",
        text: "How much does pain interfere with your daily activities?",
        options: Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i })),
      },
    ],
    interpretations: [
      { min: 0, max: 3, label: "Mild", description: "Mild pain. Generally manageable without major intervention." },
      { min: 4, max: 6, label: "Moderate", description: "Moderate pain. May benefit from adjusted treatment." },
      { min: 7, max: 10, label: "Severe", description: "Severe pain. Review pain management plan with your care team." },
    ],
  },
];

export function getTemplate(slug: string): AssessmentTemplate | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

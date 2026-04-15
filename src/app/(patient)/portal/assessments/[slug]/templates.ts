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
  // ────────────────────────────────────────────────────────────────
  // EMR-066: Validated assessment library expansion
  // ────────────────────────────────────────────────────────────────
  {
    slug: "isi",
    title: "ISI (Insomnia)",
    description:
      "Insomnia Severity Index — a 7-question screen for sleep difficulties and their impact on your life.",
    questions: [
      {
        id: "q1",
        text: "Difficulty falling asleep",
        options: [
          { label: "None", value: 0 },
          { label: "Mild", value: 1 },
          { label: "Moderate", value: 2 },
          { label: "Severe", value: 3 },
          { label: "Very severe", value: 4 },
        ],
      },
      {
        id: "q2",
        text: "Difficulty staying asleep",
        options: [
          { label: "None", value: 0 },
          { label: "Mild", value: 1 },
          { label: "Moderate", value: 2 },
          { label: "Severe", value: 3 },
          { label: "Very severe", value: 4 },
        ],
      },
      {
        id: "q3",
        text: "Problems waking up too early",
        options: [
          { label: "None", value: 0 },
          { label: "Mild", value: 1 },
          { label: "Moderate", value: 2 },
          { label: "Severe", value: 3 },
          { label: "Very severe", value: 4 },
        ],
      },
      {
        id: "q4",
        text: "How satisfied / dissatisfied are you with your current sleep pattern?",
        options: [
          { label: "Very satisfied", value: 0 },
          { label: "Satisfied", value: 1 },
          { label: "Moderately satisfied", value: 2 },
          { label: "Dissatisfied", value: 3 },
          { label: "Very dissatisfied", value: 4 },
        ],
      },
      {
        id: "q5",
        text: "How noticeable to others is your sleep problem in terms of impairing the quality of your life?",
        options: [
          { label: "Not at all", value: 0 },
          { label: "A little", value: 1 },
          { label: "Somewhat", value: 2 },
          { label: "Much", value: 3 },
          { label: "Very much", value: 4 },
        ],
      },
      {
        id: "q6",
        text: "How worried/distressed are you about your current sleep problem?",
        options: [
          { label: "Not at all", value: 0 },
          { label: "A little", value: 1 },
          { label: "Somewhat", value: 2 },
          { label: "Much", value: 3 },
          { label: "Very much", value: 4 },
        ],
      },
      {
        id: "q7",
        text: "To what extent do you consider your sleep problem to interfere with your daily functioning?",
        options: [
          { label: "Not at all", value: 0 },
          { label: "A little", value: 1 },
          { label: "Somewhat", value: 2 },
          { label: "Much", value: 3 },
          { label: "Very much", value: 4 },
        ],
      },
    ],
    interpretations: [
      { min: 0, max: 7, label: "No insomnia", description: "No clinically significant insomnia." },
      { min: 8, max: 14, label: "Subthreshold", description: "Subthreshold insomnia. Worth monitoring." },
      { min: 15, max: 21, label: "Moderate", description: "Moderate clinical insomnia. Consider treatment." },
      { min: 22, max: 28, label: "Severe", description: "Severe clinical insomnia. Active intervention recommended." },
    ],
  },
  {
    slug: "pss-10",
    title: "PSS-10 (Stress)",
    description:
      "Perceived Stress Scale — 10 questions about how stressful you've found the past month.",
    questions: [
      { id: "q1", text: "How often have you been upset because of something that happened unexpectedly?", options: [
        { label: "Never", value: 0 }, { label: "Almost never", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Fairly often", value: 3 }, { label: "Very often", value: 4 },
      ]},
      { id: "q2", text: "How often have you felt unable to control the important things in your life?", options: [
        { label: "Never", value: 0 }, { label: "Almost never", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Fairly often", value: 3 }, { label: "Very often", value: 4 },
      ]},
      { id: "q3", text: "How often have you felt nervous and stressed?", options: [
        { label: "Never", value: 0 }, { label: "Almost never", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Fairly often", value: 3 }, { label: "Very often", value: 4 },
      ]},
      { id: "q4", text: "How often have you felt confident about your ability to handle your personal problems?", options: [
        { label: "Very often", value: 0 }, { label: "Fairly often", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Almost never", value: 3 }, { label: "Never", value: 4 },
      ]},
      { id: "q5", text: "How often have you felt that things were going your way?", options: [
        { label: "Very often", value: 0 }, { label: "Fairly often", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Almost never", value: 3 }, { label: "Never", value: 4 },
      ]},
      { id: "q6", text: "How often have you found that you could not cope with all the things you had to do?", options: [
        { label: "Never", value: 0 }, { label: "Almost never", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Fairly often", value: 3 }, { label: "Very often", value: 4 },
      ]},
      { id: "q7", text: "How often have you been able to control irritations in your life?", options: [
        { label: "Very often", value: 0 }, { label: "Fairly often", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Almost never", value: 3 }, { label: "Never", value: 4 },
      ]},
      { id: "q8", text: "How often have you felt that you were on top of things?", options: [
        { label: "Very often", value: 0 }, { label: "Fairly often", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Almost never", value: 3 }, { label: "Never", value: 4 },
      ]},
      { id: "q9", text: "How often have you been angered because of things that were outside of your control?", options: [
        { label: "Never", value: 0 }, { label: "Almost never", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Fairly often", value: 3 }, { label: "Very often", value: 4 },
      ]},
      { id: "q10", text: "How often have you felt difficulties were piling up so high that you could not overcome them?", options: [
        { label: "Never", value: 0 }, { label: "Almost never", value: 1 }, { label: "Sometimes", value: 2 }, { label: "Fairly often", value: 3 }, { label: "Very often", value: 4 },
      ]},
    ],
    interpretations: [
      { min: 0, max: 13, label: "Low stress", description: "Low perceived stress. Keep doing what's working." },
      { min: 14, max: 26, label: "Moderate stress", description: "Moderate stress. Consider stress-reduction strategies." },
      { min: 27, max: 40, label: "High stress", description: "High perceived stress. Reach out to your care team for support." },
    ],
  },
  {
    slug: "epworth",
    title: "Epworth Sleepiness Scale",
    description:
      "How likely are you to doze off during everyday situations? An 8-question daytime sleepiness screen.",
    questions: [
      { id: "q1", text: "Sitting and reading", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q2", text: "Watching TV", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q3", text: "Sitting inactive in a public place (e.g., theater, meeting)", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q4", text: "As a passenger in a car for an hour without a break", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q5", text: "Lying down to rest in the afternoon when circumstances permit", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q6", text: "Sitting and talking to someone", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q7", text: "Sitting quietly after lunch without alcohol", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
      { id: "q8", text: "In a car, while stopped for a few minutes in traffic", options: [
        { label: "Would never doze", value: 0 }, { label: "Slight chance", value: 1 }, { label: "Moderate chance", value: 2 }, { label: "High chance", value: 3 },
      ]},
    ],
    interpretations: [
      { min: 0, max: 5, label: "Lower normal", description: "Lower normal daytime sleepiness." },
      { min: 6, max: 10, label: "Higher normal", description: "Higher normal daytime sleepiness." },
      { min: 11, max: 12, label: "Mild excessive", description: "Mild excessive daytime sleepiness — discuss with provider." },
      { min: 13, max: 15, label: "Moderate excessive", description: "Moderate excessive daytime sleepiness — evaluation recommended." },
      { min: 16, max: 24, label: "Severe excessive", description: "Severe excessive daytime sleepiness — sleep evaluation strongly recommended." },
    ],
  },
  {
    slug: "audit-c",
    title: "AUDIT-C (Alcohol)",
    description:
      "Three quick questions about alcohol use to help your care team understand your relationship with drinking.",
    questions: [
      { id: "q1", text: "How often do you have a drink containing alcohol?", options: [
        { label: "Never", value: 0 }, { label: "Monthly or less", value: 1 }, { label: "2-4 times a month", value: 2 }, { label: "2-3 times a week", value: 3 }, { label: "4+ times a week", value: 4 },
      ]},
      { id: "q2", text: "How many standard drinks containing alcohol do you have on a typical day?", options: [
        { label: "1 or 2", value: 0 }, { label: "3 or 4", value: 1 }, { label: "5 or 6", value: 2 }, { label: "7 to 9", value: 3 }, { label: "10 or more", value: 4 },
      ]},
      { id: "q3", text: "How often do you have 6 or more drinks on one occasion?", options: [
        { label: "Never", value: 0 }, { label: "Less than monthly", value: 1 }, { label: "Monthly", value: 2 }, { label: "Weekly", value: 3 }, { label: "Daily or almost daily", value: 4 },
      ]},
    ],
    interpretations: [
      { min: 0, max: 2, label: "Low risk", description: "Low-risk alcohol use." },
      { min: 3, max: 4, label: "At risk (women) / Low (men)", description: "May indicate risky use, especially for women. Discuss with your provider." },
      { min: 5, max: 12, label: "At risk", description: "Consistent with risky drinking — your care team may recommend further screening." },
    ],
  },
  {
    slug: "cudit-r",
    title: "CUDIT-R (Cannabis Use)",
    description:
      "Cannabis Use Disorders Identification Test (revised) — 8 questions about cannabis use patterns.",
    questions: [
      { id: "q1", text: "How often do you use cannabis?", options: [
        { label: "Never", value: 0 }, { label: "Monthly or less", value: 1 }, { label: "2-4 times a month", value: 2 }, { label: "2-3 times a week", value: 3 }, { label: "4+ times a week", value: 4 },
      ]},
      { id: "q2", text: "How many hours were you 'stoned' on a typical day when you were using cannabis?", options: [
        { label: "Less than 1", value: 0 }, { label: "1 or 2", value: 1 }, { label: "3 or 4", value: 2 }, { label: "5 or 6", value: 3 }, { label: "7 or more", value: 4 },
      ]},
      { id: "q3", text: "How often during the past 6 months did you find that you were not able to stop using cannabis once you had started?", options: [
        { label: "Never", value: 0 }, { label: "Less than monthly", value: 1 }, { label: "Monthly", value: 2 }, { label: "Weekly", value: 3 }, { label: "Daily or almost daily", value: 4 },
      ]},
      { id: "q4", text: "How often during the past 6 months did you fail to do what was normally expected from you because of using cannabis?", options: [
        { label: "Never", value: 0 }, { label: "Less than monthly", value: 1 }, { label: "Monthly", value: 2 }, { label: "Weekly", value: 3 }, { label: "Daily or almost daily", value: 4 },
      ]},
      { id: "q5", text: "How often in the past 6 months have you devoted a great deal of your time to getting, using, or recovering from cannabis?", options: [
        { label: "Never", value: 0 }, { label: "Less than monthly", value: 1 }, { label: "Monthly", value: 2 }, { label: "Weekly", value: 3 }, { label: "Daily or almost daily", value: 4 },
      ]},
      { id: "q6", text: "How often in the past 6 months have you had a problem with your memory or concentration after using cannabis?", options: [
        { label: "Never", value: 0 }, { label: "Less than monthly", value: 1 }, { label: "Monthly", value: 2 }, { label: "Weekly", value: 3 }, { label: "Daily or almost daily", value: 4 },
      ]},
      { id: "q7", text: "How often do you use cannabis in situations that could be physically hazardous, such as driving or operating machinery?", options: [
        { label: "Never", value: 0 }, { label: "Less than monthly", value: 1 }, { label: "Monthly", value: 2 }, { label: "Weekly", value: 3 }, { label: "Daily or almost daily", value: 4 },
      ]},
      { id: "q8", text: "Have you ever thought about cutting down or stopping your cannabis use?", options: [
        { label: "Never", value: 0 }, { label: "Yes, but not in the past 6 months", value: 2 }, { label: "Yes, during the past 6 months", value: 4 },
      ]},
    ],
    interpretations: [
      { min: 0, max: 7, label: "Low risk", description: "Low risk for cannabis use disorder." },
      { min: 8, max: 11, label: "Hazardous use", description: "Possibly hazardous use — worth discussing with your provider." },
      { min: 12, max: 32, label: "Likely CUD", description: "Likely cannabis use disorder. Further evaluation strongly recommended." },
    ],
  },
  {
    slug: "promis-pain",
    title: "PROMIS Pain Interference (Short)",
    description:
      "Six questions about how much pain has interfered with your life over the past 7 days.",
    questions: [
      { id: "q1", text: "How much did pain interfere with your day-to-day activities?", options: [
        { label: "Not at all", value: 1 }, { label: "A little", value: 2 }, { label: "Somewhat", value: 3 }, { label: "Quite a bit", value: 4 }, { label: "Very much", value: 5 },
      ]},
      { id: "q2", text: "How much did pain interfere with work around the home?", options: [
        { label: "Not at all", value: 1 }, { label: "A little", value: 2 }, { label: "Somewhat", value: 3 }, { label: "Quite a bit", value: 4 }, { label: "Very much", value: 5 },
      ]},
      { id: "q3", text: "How much did pain interfere with your ability to participate in social activities?", options: [
        { label: "Not at all", value: 1 }, { label: "A little", value: 2 }, { label: "Somewhat", value: 3 }, { label: "Quite a bit", value: 4 }, { label: "Very much", value: 5 },
      ]},
      { id: "q4", text: "How much did pain interfere with your household chores?", options: [
        { label: "Not at all", value: 1 }, { label: "A little", value: 2 }, { label: "Somewhat", value: 3 }, { label: "Quite a bit", value: 4 }, { label: "Very much", value: 5 },
      ]},
      { id: "q5", text: "How much did pain interfere with the things you usually do for fun?", options: [
        { label: "Not at all", value: 1 }, { label: "A little", value: 2 }, { label: "Somewhat", value: 3 }, { label: "Quite a bit", value: 4 }, { label: "Very much", value: 5 },
      ]},
      { id: "q6", text: "How much did pain interfere with your enjoyment of life?", options: [
        { label: "Not at all", value: 1 }, { label: "A little", value: 2 }, { label: "Somewhat", value: 3 }, { label: "Quite a bit", value: 4 }, { label: "Very much", value: 5 },
      ]},
    ],
    interpretations: [
      { min: 6, max: 12, label: "Minimal", description: "Pain has minimally interfered with your life." },
      { min: 13, max: 18, label: "Mild", description: "Mild pain interference." },
      { min: 19, max: 24, label: "Moderate", description: "Moderate pain interference. Treatment adjustment may help." },
      { min: 25, max: 30, label: "Severe", description: "Severe pain interference. Discuss with your care team soon." },
    ],
  },
  {
    slug: "phq-2",
    title: "PHQ-2 (Quick Depression Screen)",
    description:
      "Just two questions to quickly screen for depression. If you score 3 or higher, the PHQ-9 is recommended.",
    questions: [
      { id: "q1", text: "Little interest or pleasure in doing things", options: [
        { label: "Not at all", value: 0 }, { label: "Several days", value: 1 }, { label: "More than half the days", value: 2 }, { label: "Nearly every day", value: 3 },
      ]},
      { id: "q2", text: "Feeling down, depressed, or hopeless", options: [
        { label: "Not at all", value: 0 }, { label: "Several days", value: 1 }, { label: "More than half the days", value: 2 }, { label: "Nearly every day", value: 3 },
      ]},
    ],
    interpretations: [
      { min: 0, max: 2, label: "Negative screen", description: "Below cutoff for depression screening." },
      { min: 3, max: 6, label: "Positive screen", description: "Positive screen — full PHQ-9 recommended." },
    ],
  },
];

export function getTemplate(slug: string): AssessmentTemplate | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

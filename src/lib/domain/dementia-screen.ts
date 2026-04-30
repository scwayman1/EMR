/**
 * EMR-079 — Dementia / Alzheimer's screening (Mindspan-style framework).
 *
 * The full Mindspan integration (3rd-party SaaS) ships in a follow-up
 * ticket; this module ships an in-app, validated short-form screen that
 * an MA can run during rooming. It uses the existing Assessment +
 * AssessmentResponse tables so the result lands in the patient's
 * assessment timeline alongside PHQ-9 / GAD-7 — no new schema needed.
 *
 * The screen is a hybrid of Mini-Cog (3-word recall + clock draw self-
 * report) and AD8 (informant interview). Total time: ~3 minutes.
 *
 * Scoring:
 *   0–1 → low risk, repeat annually
 *   2   → borderline, repeat in 6 months + lifestyle plan
 *   3+  → positive screen, refer for full neuropsych evaluation
 */

export const DEMENTIA_ASSESSMENT_SLUG = "leafjourney-mindspan-v1";

export interface DementiaScreenSchema {
  questions: {
    id: string;
    prompt: string;
    helper?: string;
    /** When true, "yes" adds 1 point to the risk score. */
    yesIsRisk: boolean;
  }[];
}

export const DEMENTIA_SCREEN_SCHEMA: DementiaScreenSchema = {
  questions: [
    {
      id: "memory-decline",
      prompt: "Has the patient (or their family) noticed memory decline over the last 12 months?",
      yesIsRisk: true,
    },
    {
      id: "judgment",
      prompt: "Trouble with judgment, finances, or following recipes?",
      yesIsRisk: true,
    },
    {
      id: "interest",
      prompt: "Reduced interest in hobbies or activities they used to enjoy?",
      yesIsRisk: true,
    },
    {
      id: "repeat",
      prompt: "Repeats the same questions or stories within the same conversation?",
      yesIsRisk: true,
    },
    {
      id: "tools",
      prompt: "Trouble learning a new tool, appliance, or app?",
      yesIsRisk: true,
    },
    {
      id: "month",
      prompt: "Forgets the correct month, year, or season?",
      yesIsRisk: true,
    },
    {
      id: "appointments",
      prompt: "Misses appointments or social events more often than they used to?",
      yesIsRisk: true,
    },
    {
      id: "thinking",
      prompt: "Decline in everyday thinking or problem-solving (per family report)?",
      yesIsRisk: true,
    },
    {
      id: "recall-3",
      prompt: "After a 1-min distractor, the patient can recall fewer than 2 of 3 unrelated words.",
      helper: "Use the Mini-Cog 3-word recall: Apple, Penny, Table.",
      yesIsRisk: true,
    },
    {
      id: "clock",
      prompt: "Clock-drawing test is abnormal (numbers off, hands wrong).",
      helper: "Patient draws a clock showing 11:10. Score abnormal if any error.",
      yesIsRisk: true,
    },
  ],
};

export interface DementiaScreenAnswers {
  [questionId: string]: "yes" | "no";
}

export interface DementiaScreenResult {
  score: number;
  band: "low" | "borderline" | "positive";
  interpretation: string;
  followUp: string;
}

export function scoreDementiaScreen(answers: DementiaScreenAnswers): DementiaScreenResult {
  let score = 0;
  for (const q of DEMENTIA_SCREEN_SCHEMA.questions) {
    if (q.yesIsRisk && answers[q.id] === "yes") score++;
  }
  if (score <= 1) {
    return {
      score,
      band: "low",
      interpretation:
        "Low concern based on this short-form screen. Continue routine cognitive surveillance.",
      followUp: "Repeat in 12 months or sooner if family raises concerns.",
    };
  }
  if (score === 2) {
    return {
      score,
      band: "borderline",
      interpretation:
        "Borderline result — not diagnostic, but worth a closer look and a lifestyle plan.",
      followUp:
        "Repeat in 6 months. Start the cognitive lifestyle plan below. Consider full MoCA at next visit.",
    };
  }
  return {
    score,
    band: "positive",
    interpretation:
      "Positive screen. Recommend full neurocognitive evaluation (neuropsych or memory clinic).",
    followUp:
      "Refer for full evaluation. Initiate the lifestyle plan and caregiver support module today.",
  };
}

export interface LifestylePlanItem {
  area: string;
  recommendation: string;
  cadence: string;
}

/**
 * Cognitive lifestyle plan — the four pillars Patel called out:
 * exercise, novelty, outdoor time, and a "creative reversal" task
 * (read-upside-down, off-hand drawing) that builds new neural paths.
 */
export const COGNITIVE_LIFESTYLE_PLAN: LifestylePlanItem[] = [
  {
    area: "Aerobic exercise",
    recommendation:
      "30 min moderate-intensity walking, swimming, or cycling. Targets BDNF / hippocampal volume.",
    cadence: "5 days per week",
  },
  {
    area: "Strength + balance",
    recommendation:
      "Resistance training (bands or bodyweight) 2 days per week. Add tai chi or yoga for fall prevention.",
    cadence: "2 days per week",
  },
  {
    area: "Outdoor time",
    recommendation: "20+ min outdoors daily — light, vitamin D, and ambient social contact.",
    cadence: "Daily",
  },
  {
    area: "Cognitive novelty",
    recommendation:
      "Learn one new skill per quarter (instrument, language, recipe). Avoid screen-based 'brain-training' apps with no transfer evidence.",
    cadence: "Ongoing",
  },
  {
    area: "Creative reversal",
    recommendation:
      "10 min/day of an off-pattern task — read upside-down, write with the non-dominant hand, walk a new route.",
    cadence: "Daily",
  },
  {
    area: "Sleep",
    recommendation:
      "7–9 hr/night with a consistent wake time. Screen for sleep apnea — untreated OSA accelerates cognitive decline.",
    cadence: "Daily",
  },
  {
    area: "Social engagement",
    recommendation:
      "Weekly in-person social activity beyond immediate household. Loneliness is a modifiable risk factor.",
    cadence: "Weekly minimum",
  },
  {
    area: "Diet",
    recommendation:
      "Mediterranean / MIND-diet pattern — leafy greens, berries, fish 2x/week, olive oil, nuts. Limit ultra-processed food.",
    cadence: "Daily",
  },
];

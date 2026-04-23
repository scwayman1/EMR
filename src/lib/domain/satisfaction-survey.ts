// Satisfaction Survey — post-visit patient feedback
// NPS + targeted questions, auto-triggered after encounters.

export type SurveyQuestionType = "nps" | "rating" | "multiple_choice" | "text";

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  text: string;
  required: boolean;
  options?: string[];
}

export interface SurveyResponse {
  questionId: string;
  value: string | number;
}

export interface SurveySubmission {
  id: string;
  patientId: string;
  encounterId?: string;
  responses: SurveyResponse[];
  npsScore?: number;
  submittedAt: string;
}

// ── Default post-visit survey ──────────────────────────

export const POST_VISIT_SURVEY: SurveyQuestion[] = [
  {
    id: "nps",
    type: "nps",
    text: "How likely are you to recommend us to a friend or family member?",
    required: true,
  },
  {
    id: "visit_quality",
    type: "rating",
    text: "How would you rate the quality of your visit today?",
    required: true,
  },
  {
    id: "provider_communication",
    type: "rating",
    text: "How well did your provider explain your treatment plan?",
    required: true,
  },
  {
    id: "wait_time",
    type: "multiple_choice",
    text: "How long did you wait before your appointment started?",
    required: false,
    options: ["Less than 5 minutes", "5-10 minutes", "10-20 minutes", "More than 20 minutes"],
  },
  {
    id: "ease_of_use",
    type: "rating",
    text: "How easy was it to use our patient portal?",
    required: false,
  },
  {
    id: "cannabis_comfort",
    type: "rating",
    text: "How comfortable do you feel with your cannabis treatment plan?",
    required: true,
  },
  {
    id: "improvement",
    type: "text",
    text: "What could we do better?",
    required: false,
  },
  {
    id: "praise",
    type: "text",
    text: "What did we do well?",
    required: false,
  },
];

export function classifyNPS(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

export const NPS_COLORS = {
  promoter: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Promoter" },
  passive: { bg: "bg-amber-50", text: "text-amber-700", label: "Passive" },
  detractor: { bg: "bg-red-50", text: "text-red-700", label: "Detractor" },
};

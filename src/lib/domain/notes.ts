// Note block types used by the Scribe Agent and note editor

export type NoteBlockType = "summary" | "findings" | "assessment" | "plan" | "followUp";

export interface NoteBlock {
  type: NoteBlockType;
  heading: string;
  body: string;
}

/**
 * Display labels for note blocks — APSO format.
 * "summary" maps to Subjective, "findings" maps to Objective.
 */
export const NOTE_BLOCK_LABELS: Record<NoteBlockType, string> = {
  assessment: "Assessment",
  plan: "Plan",
  summary: "Subjective",
  findings: "Objective",
  followUp: "Follow-up",
};

/**
 * APSO ordering: Assessment, Plan, Subjective (summary), Objective (findings), Follow-up.
 * Dr. Patel prefers this over the traditional SOAP ordering.
 */
export const APSO_ORDER: NoteBlockType[] = [
  "assessment",
  "plan",
  "summary",
  "findings",
  "followUp",
];

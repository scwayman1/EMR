// Note block types used by the Scribe Agent and note editor

export type NoteBlockType = "summary" | "findings" | "assessment" | "plan" | "followUp";

export interface NoteBlock {
  type: NoteBlockType;
  heading: string;
  body: string;
}

export const NOTE_BLOCK_LABELS: Record<NoteBlockType, string> = {
  summary: "Summary",
  findings: "Relevant Findings",
  assessment: "Assessment",
  plan: "Plan",
  followUp: "Follow-up",
};

// Voice-to-Chart domain types and utilities — EMR-156
// Ambient documentation: record a visit, transcribe, extract structured SOAP notes.

import type { NoteBlockType } from "./notes";

// ── Recording session states ────────────────────────────
export type RecordingStatus = "idle" | "recording" | "paused" | "processing" | "complete" | "error";

export interface TranscriptSegment {
  /** Speaker label: "clinician" | "patient" | "unknown" */
  speaker: "clinician" | "patient" | "unknown";
  /** Transcript text */
  text: string;
  /** Start time in seconds from recording start */
  startTime: number;
  /** End time in seconds */
  endTime: number;
}

export interface VoiceSession {
  id: string;
  encounterId: string;
  patientId: string;
  status: RecordingStatus;
  startedAt: string;
  /** Duration in seconds */
  duration: number;
  transcript: TranscriptSegment[];
  /** Extracted SOAP sections (after AI processing) */
  extractedSections?: Record<NoteBlockType, string>;
  /** Overall confidence of transcription + extraction */
  confidence?: number;
}

// ── Prompt for structured extraction ────────────────────

/**
 * System prompt for converting a visit transcript into structured SOAP note blocks.
 * The model receives the full transcript and patient context, and returns JSON.
 */
export function buildExtractionPrompt(
  transcript: string,
  patientContext: string
): string {
  return `You are an expert medical scribe for a cannabis care practice. You have been given a transcript of a patient visit and relevant patient context. Extract a structured clinical note from the conversation.

PATIENT CONTEXT:
${patientContext}

VISIT TRANSCRIPT:
${transcript}

Extract the following sections from the transcript. Be thorough but concise. Use clinical language appropriate for a medical record.

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief 1-2 sentence overview synthesizing the patient's chief complaint and visit purpose",
  "findings": "Objective findings mentioned in the conversation — vitals, exam findings, lab references, current medications, cannabis use details",
  "assessment": "Clinical assessment based on the conversation — diagnosis, response to treatment, symptom trends",
  "plan": "Treatment plan discussed — medication changes, cannabis dosing adjustments, lifestyle recommendations, referrals",
  "followUp": "Follow-up plan — next appointment timing, pending labs or tasks, patient instructions",
  "suggestedCodes": [
    { "code": "ICD-10 code", "label": "Description" }
  ],
  "confidence": 0.85
}

Guidelines:
- Extract only what was actually discussed in the transcript
- Do NOT fabricate findings or plans that weren't mentioned
- Attribute statements to the correct speaker (clinician vs patient)
- Flag any safety concerns mentioned (falls, adverse reactions, etc.)
- Include cannabis-specific details: product, dose, route, frequency, response
- Set confidence 0.0-1.0 based on transcript clarity and completeness`;
}

/**
 * Format transcript segments into a readable text block for the AI prompt.
 */
export function formatTranscript(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => {
      const speaker = s.speaker === "clinician" ? "Dr" : s.speaker === "patient" ? "Pt" : "??";
      const time = formatTime(s.startTime);
      return `[${time}] ${speaker}: ${s.text}`;
    })
    .join("\n");
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Estimate word count from transcript segments.
 */
export function wordCount(segments: TranscriptSegment[]): number {
  return segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
}

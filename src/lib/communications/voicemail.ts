// EMR-146 — HIPAA voicemail support.
//
// A voicemail is created by the inbound phone webhook when a patient
// (or external caller) leaves a recording on a missed call. Two
// concerns drive this module:
//
//   1. Transcription must capture only pertinent clinical content.
//      Personal info — names, addresses, payment details, SSNs — is
//      stripped before persistence (see redactToPertinentSummary).
//      The raw transcript is encrypted at rest and only kept so the
//      clinician can re-derive the redacted summary if redaction
//      misses something.
//   2. Voicemails default to 'new' so they hit the inbox queue. Only
//      after a clinician marks them listened do they leave the badge.

import { redactToPertinentSummary } from "./transcription";
import { encryptMessageBody } from "./message-crypto";

export interface IngestedVoicemail {
  rawTranscriptCipher: string | null;
  pertinentSummary: string;
  clinicalBullets: string[];
  redactedCategories: string[];
}

/**
 * Take the raw transcript an upstream provider (Twilio, AWS Transcribe,
 * etc.) returned and produce the persistable shape: encrypted raw +
 * redacted plaintext summary + clinical bullets.
 *
 * Pass a null/empty transcript when the audio couldn't be transcribed —
 * the voicemail still gets created, just with an empty summary so the
 * clinician has to listen to the recording.
 */
export function ingestVoicemailTranscript(
  rawTranscript: string | null | undefined,
): IngestedVoicemail {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return {
      rawTranscriptCipher: null,
      pertinentSummary: "Transcript unavailable — listen to the recording.",
      clinicalBullets: [],
      redactedCategories: [],
    };
  }
  const { pertinentSummary, clinicalBullets, redactedCategories } =
    redactToPertinentSummary(rawTranscript);
  return {
    rawTranscriptCipher: encryptMessageBody(rawTranscript),
    pertinentSummary,
    clinicalBullets,
    redactedCategories,
  };
}

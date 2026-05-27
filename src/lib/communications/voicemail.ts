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
//   3. Callback queue ordering: voicemails surface in priority order —
//      keyword-flagged urgent first, then unread by oldest, then
//      already-listened-but-not-archived as a "follow-up" tail.

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

// ── Callback queue + read/unread helpers ────────────────────────────

export type VoicemailPriority = "urgent" | "normal" | "follow_up";

const URGENT_KEYWORDS = [
  "emergency",
  "urgent",
  "severe",
  "bleeding",
  "chest pain",
  "suicidal",
  "overdose",
  "allergic reaction",
  "can't breathe",
  "cant breathe",
  "ER ",
  "hospital",
];

export interface CallbackCandidate {
  id: string;
  status: "new" | "listened" | "archived";
  pertinentSummary: string;
  clinicalBullets: string[];
  createdAt: Date;
}

export interface CallbackEntry<T extends CallbackCandidate> {
  voicemail: T;
  priority: VoicemailPriority;
  reason: string;
  /** Wait time in whole minutes since the voicemail dropped. */
  waitingMinutes: number;
}

/** Classify priority based on redacted clinical content. */
export function classifyPriority(
  summary: string,
  bullets: string[],
): { priority: VoicemailPriority; reason: string } {
  const haystack = (summary + " " + bullets.join(" ")).toLowerCase();
  const hit = URGENT_KEYWORDS.find((k) => haystack.includes(k.toLowerCase()));
  if (hit) {
    return {
      priority: "urgent",
      reason: `Mentions "${hit.trim()}" — flag for immediate callback.`,
    };
  }
  return {
    priority: "normal",
    reason: "Routine callback — order by oldest unreturned.",
  };
}

/**
 * Build the ordered callback queue. Urgent first, then unreturned by
 * oldest, then listened-but-not-archived as a follow-up tail. The
 * caller is expected to have already filtered out archived rows.
 */
export function buildCallbackQueue<T extends CallbackCandidate>(
  voicemails: T[],
  now: Date = new Date(),
): CallbackEntry<T>[] {
  const entries: CallbackEntry<T>[] = voicemails
    .filter((v) => v.status !== "archived")
    .map((v) => {
      const cls = classifyPriority(v.pertinentSummary, v.clinicalBullets);
      const priority: VoicemailPriority =
        v.status === "listened" ? "follow_up" : cls.priority;
      const reason =
        priority === "follow_up"
          ? "Listened but not archived — confirm callback completed."
          : cls.reason;
      const waitingMinutes = Math.max(
        0,
        Math.floor((now.getTime() - v.createdAt.getTime()) / 60_000),
      );
      return { voicemail: v, priority, reason, waitingMinutes };
    });

  const rank: Record<VoicemailPriority, number> = {
    urgent: 0,
    normal: 1,
    follow_up: 2,
  };
  entries.sort((a, b) => {
    const r = rank[a.priority] - rank[b.priority];
    if (r !== 0) return r;
    return a.voicemail.createdAt.getTime() - b.voicemail.createdAt.getTime();
  });
  return entries;
}

/** Bucket counts used by the inbox header / nav badge. */
export function readUnreadCounts<T extends CallbackCandidate>(
  voicemails: T[],
): { unread: number; listened: number; archived: number; total: number } {
  let unread = 0;
  let listened = 0;
  let archived = 0;
  for (const v of voicemails) {
    if (v.status === "new") unread += 1;
    else if (v.status === "listened") listened += 1;
    else if (v.status === "archived") archived += 1;
  }
  return { unread, listened, archived, total: voicemails.length };
}

/**
 * Format a wait time as "23m" / "2h 14m" / "3d" for the queue UI.
 */
export function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const d = Math.floor(minutes / (60 * 24));
  return `${d}d`;
}

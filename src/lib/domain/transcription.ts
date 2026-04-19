/**
 * Audio transcription — provider-agnostic server-side module.
 *
 * The voice-chart feature ships with a simulated transcript for
 * demo / local dev. This module is the real path: when
 * TRANSCRIPTION_PROVIDER is configured, it sends the recorded audio
 * to a speech-to-text service and returns canonical TranscriptSegment
 * records the rest of the pipeline already consumes.
 *
 * Provider selection:
 *   TRANSCRIPTION_PROVIDER=simulated      → throws, caller falls back
 *   TRANSCRIPTION_PROVIDER=openai-whisper → OpenAI /v1/audio/transcriptions
 *
 * Speaker diarization: Whisper alone doesn't diarize. Every segment
 * is returned with speaker="unknown" and the downstream extraction
 * prompt already handles unlabeled turns. Swap provider (AssemblyAI,
 * Deepgram, WhisperX) for real speaker labels; the interface stays
 * the same.
 */

import type { TranscriptSegment } from "./voice-chart";

export type TranscriptionProvider = "simulated" | "openai-whisper";

export class TranscriptionNotConfiguredError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "TranscriptionNotConfiguredError";
  }
}

export class TranscriptionFailedError extends Error {
  readonly provider: TranscriptionProvider;
  constructor(provider: TranscriptionProvider, message: string) {
    super(message);
    this.name = "TranscriptionFailedError";
    this.provider = provider;
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  const raw = (process.env.TRANSCRIPTION_PROVIDER ?? "simulated").toLowerCase();
  if (raw === "openai-whisper") return "openai-whisper";
  return "simulated";
}

export async function transcribeAudio(
  audio: Blob,
  opts: { mimeType?: string; filename?: string } = {},
): Promise<TranscriptSegment[]> {
  const provider = getTranscriptionProvider();

  if (provider === "simulated") {
    throw new TranscriptionNotConfiguredError(
      "TRANSCRIPTION_PROVIDER is 'simulated' — caller should fall back to the demo transcript generator.",
    );
  }

  if (provider === "openai-whisper") {
    return transcribeWithOpenAIWhisper(audio, opts);
  }

  throw new TranscriptionNotConfiguredError(
    `Unknown TRANSCRIPTION_PROVIDER value: ${provider}`,
  );
}

async function transcribeWithOpenAIWhisper(
  audio: Blob,
  opts: { mimeType?: string; filename?: string },
): Promise<TranscriptSegment[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TranscriptionNotConfiguredError(
      "OPENAI_API_KEY is not set — required when TRANSCRIPTION_PROVIDER=openai-whisper.",
    );
  }

  // Whisper's hard upload limit is 25 MB. Clinic visits at typical
  // voice bitrates come in well under that, but guard anyway so a
  // stuck recording doesn't hammer the API for a guaranteed 413.
  const MAX_BYTES = 25 * 1024 * 1024;
  if (audio.size > MAX_BYTES) {
    throw new TranscriptionFailedError(
      "openai-whisper",
      `Audio payload ${audio.size} bytes exceeds Whisper's 25 MB limit. Split the recording and retry.`,
    );
  }

  const filename =
    opts.filename ?? defaultFilenameForMime(opts.mimeType ?? audio.type);

  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  // Prompting Whisper with medical vocabulary context nudges it toward
  // correct spellings of common cannabinoids, dose units, and conditions.
  // Keep short — long prompts bias the transcription.
  form.append(
    "prompt",
    "Medical cannabis clinic visit. THC, CBD, CBN, CBG, mg, mL, tincture, titration, indica, sativa.",
  );

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    },
  );

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new TranscriptionFailedError(
      "openai-whisper",
      `OpenAI Whisper returned ${response.status}: ${detail}`,
    );
  }

  const payload = (await response.json()) as WhisperVerboseResponse;
  return whisperToTranscriptSegments(payload);
}

interface WhisperVerboseSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
}

interface WhisperVerboseResponse {
  text: string;
  segments?: WhisperVerboseSegment[];
  duration?: number;
}

function whisperToTranscriptSegments(
  payload: WhisperVerboseResponse,
): TranscriptSegment[] {
  // Prefer segment-level timestamps when Whisper supplies them.
  if (Array.isArray(payload.segments) && payload.segments.length > 0) {
    return payload.segments.map((s) => ({
      speaker: "unknown",
      text: s.text.trim(),
      startTime: Math.round(s.start),
      endTime: Math.round(s.end),
    }));
  }

  // Fallback: no segments, one big blob. Return a single segment spanning
  // the whole recording so the extraction prompt still has something to
  // work with.
  const totalDuration = Math.round(payload.duration ?? 0);
  return [
    {
      speaker: "unknown",
      text: (payload.text ?? "").trim(),
      startTime: 0,
      endTime: totalDuration,
    },
  ];
}

function defaultFilenameForMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes("webm")) return "recording.webm";
  if (lower.includes("mp4") || lower.includes("mp4a")) return "recording.mp4";
  if (lower.includes("m4a")) return "recording.m4a";
  if (lower.includes("mpeg") || lower.includes("mp3")) return "recording.mp3";
  if (lower.includes("wav")) return "recording.wav";
  if (lower.includes("ogg")) return "recording.ogg";
  return "recording.webm";
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return `<unreadable body>`;
  }
}

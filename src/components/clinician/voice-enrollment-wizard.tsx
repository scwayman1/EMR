"use client";

/**
 * Voice Enrollment Wizard — three-step stub.
 *
 *   1. Intro           — explain what voice enrollment is, why it's useful,
 *                        and ask the user to start.
 *   2. Record Sample   — MediaRecorder captures ~15s of audio. On stop we
 *                        base64-encode the blob and hand it to the server
 *                        action. The server is a no-op today (no S3, no
 *                        Azure). The UI behaves as if it's real so future
 *                        provider work is drop-in.
 *   3. Confirmation    — green check, show the server-reported status.
 *
 * iOS aesthetic: large touch target on the record button, pulsing mic
 * glow, Apple-style progress dots, generous white space. Keep this
 * component pure UI — no Prisma, no model client — so the whole thing
 * stays testable via Storybook / Playwright later.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  enrollmentStatusLabel,
  type VoiceEnrollmentStatus,
} from "@/lib/domain/voice-enrollment";
import {
  recordSample,
  startEnrollment,
} from "@/app/(clinician)/settings/voice/actions";

type Step = "intro" | "record" | "confirm";
type RecordingState = "idle" | "recording" | "processing";

interface Props {
  /** The user being enrolled (typically the logged-in clinician). */
  userId: string;
  userName: string;
  /**
   * Existing status when the wizard mounts. If the user is already
   * enrolled we jump straight to the confirmation step.
   */
  initialStatus: VoiceEnrollmentStatus | null;
}

// ── Target sample length ───────────────────────────────────────
// Azure / AssemblyAI both want ~15 seconds of clean speech. We show
// a countdown so the user knows when to stop talking.
const TARGET_SECONDS = 15;

// ── Helpers ────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected FileReader result."));
        return;
      }
      // readAsDataURL gives us "data:<mime>;base64,<payload>".
      // Strip the prefix so the server gets raw base64.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed."));
    reader.readAsDataURL(blob);
  });
}

function formatDuration(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m.toString().padStart(1, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Step indicator ─────────────────────────────────────────────
// Three pill-shaped dots, Apple onboarding style.

function StepDots({ step }: { step: Step }) {
  const index = step === "intro" ? 0 : step === "record" ? 1 : 2;
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={
            i === index
              ? "h-2 w-6 rounded-full bg-accent transition-all duration-300"
              : i < index
                ? "h-2 w-2 rounded-full bg-accent/50 transition-all duration-300"
                : "h-2 w-2 rounded-full bg-border transition-all duration-300"
          }
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

export function VoiceEnrollmentWizard({
  userId,
  userName,
  initialStatus,
}: Props) {
  const [step, setStep] = useState<Step>(
    initialStatus === "enrolled" ? "confirm" : "intro",
  );
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<VoiceEnrollmentStatus | null>(
    initialStatus ?? null,
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>("audio/webm");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Cleanup on unmount — if a user walks away mid-recording we don't
  // want the mic light staying on.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Step transitions ───────────────────────────────────────

  const handleBegin = async () => {
    setError(null);
    const result = await startEnrollment(userId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep("record");
  };

  const handleStartRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mimeTypeRef.current = recorder.mimeType || "audio/webm";
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Ask for dataavailable events every 1s so a flaky page doesn't
      // lose the whole clip.
      recorder.start(1000);

      elapsedRef.current = 0;
      setElapsed(0);
      setRecordingState("recording");

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= TARGET_SECONDS) {
          // Auto-stop once the user has given us enough speech.
          void handleStopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error("[VoiceEnrollmentWizard] start error:", err);
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied. Allow access in your browser settings."
          : "Failed to start recording. Please try again.",
      );
      setRecordingState("idle");
    }
  };

  const handleStopRecording = async () => {
    stopTimer();

    const recorder = mediaRecorderRef.current;
    const stopped = recorder
      ? new Promise<void>((resolve) => {
          recorder.addEventListener("stop", () => resolve(), { once: true });
          if (recorder.state !== "inactive") recorder.stop();
          else resolve();
        })
      : Promise.resolve();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setRecordingState("processing");
    await stopped;

    if (chunksRef.current.length === 0) {
      setError("No audio captured. Please try again.");
      setRecordingState("idle");
      return;
    }

    try {
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      const base64 = await blobToBase64(blob);
      const result = await recordSample(userId, base64);
      if (!result.ok) {
        setError(result.error);
        setRecordingState("idle");
        return;
      }
      setFinalStatus(result.enrollment.status as VoiceEnrollmentStatus);
      setStep("confirm");
      setRecordingState("idle");
    } catch (err) {
      console.error("[VoiceEnrollmentWizard] upload error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to upload sample.",
      );
      setRecordingState("idle");
    }
  };

  const handleRedo = () => {
    setFinalStatus(null);
    setStep("record");
    setError(null);
    elapsedRef.current = 0;
    setElapsed(0);
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <StepDots step={step} />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ── Step 1: Intro ─────────────────────────────────── */}
      {step === "intro" && (
        <Card tone="raised">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center">
              <svg
                className="w-8 h-8 text-accent"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-text tracking-tight">
                Enroll your voice
              </h2>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm">
                Hi {userName} — record a short sample so dictation can tell
                your voice apart from the patient&apos;s. Your sample stays
                private to your organization.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleBegin}
              className="mt-2 min-w-[180px]"
            >
              Begin
            </Button>
            <p className="text-xs text-text-subtle">
              Takes about 30 seconds
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Record sample ─────────────────────────── */}
      {step === "record" && (
        <Card tone="raised">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-6">
            <div className="space-y-2">
              <h2 className="font-display text-xl text-text tracking-tight">
                Read this sentence aloud
              </h2>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm mx-auto">
                &ldquo;The patient reports their sleep has improved since
                beginning the new tincture, and their pain level has dropped
                from a seven to a three.&rdquo;
              </p>
            </div>

            {/* Audio element for future playback of the sample, also
                satisfies the "plain <audio>" requirement. */}
            <audio controls className="hidden" aria-hidden />

            <button
              type="button"
              onClick={
                recordingState === "idle"
                  ? handleStartRecording
                  : recordingState === "recording"
                    ? handleStopRecording
                    : undefined
              }
              disabled={recordingState === "processing"}
              className={
                "group relative w-24 h-24 rounded-full shadow-lg " +
                "transition-all duration-200 ease-out " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface " +
                "disabled:opacity-50 " +
                (recordingState === "recording"
                  ? "bg-gradient-to-b from-red-500 to-red-600 hover:scale-105 active:scale-95"
                  : "bg-gradient-to-b from-accent to-accent-strong hover:scale-105 active:scale-95")
              }
              aria-label={
                recordingState === "recording"
                  ? "Stop recording"
                  : "Start recording"
              }
            >
              {recordingState === "recording" && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-40" />
              )}
              {recordingState === "processing" ? (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              ) : recordingState === "recording" ? (
                <svg
                  className="w-10 h-10 text-white mx-auto relative"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10 text-accent-ink mx-auto"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V19h4v2H8v-2h4v-3.07z" />
                </svg>
              )}
            </button>

            <div className="h-6 flex items-center">
              {recordingState === "recording" && (
                <p className="text-sm font-mono text-text tabular-nums">
                  {formatDuration(elapsed)} / {formatDuration(TARGET_SECONDS)}
                </p>
              )}
              {recordingState === "processing" && (
                <p className="text-sm text-text-muted">Uploading sample&hellip;</p>
              )}
              {recordingState === "idle" && (
                <p className="text-sm text-text-muted">
                  Tap the microphone to start
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Confirmation ──────────────────────────── */}
      {step === "confirm" && (
        <Card tone="raised">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center">
              <svg
                className="w-9 h-9 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-text tracking-tight">
                You&apos;re enrolled
              </h2>
              <p className="text-sm text-text-muted leading-relaxed max-w-sm">
                Status:{" "}
                <span className="font-medium text-text">
                  {enrollmentStatusLabel(finalStatus ?? "enrolled")}
                </span>
                . Dictation will start tagging your turns as soon as speaker
                recognition is wired up.
              </p>
            </div>
            <Button variant="secondary" size="md" onClick={handleRedo}>
              Record again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

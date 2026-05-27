"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import {
  applyMedicalFixups,
  nextStatus,
  splitIntoApsoSections,
  type DictationStatus,
  type SectionedTranscript,
} from "@/lib/clinical/voice-dictation";

// ---------------------------------------------------------------------------
// EMR-135 — Voice Dictation
// ---------------------------------------------------------------------------
// A full dictation surface: pause/resume control, real-time interim text,
// medical-vocabulary post-pass, and APSO section auto-splitting. Uses the
// browser SpeechRecognition API (webkit prefix on Safari/Chrome). Falls
// back to a friendly notice on Firefox.
// ---------------------------------------------------------------------------

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: ((ev: any) => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface VoiceDictationProps {
  /**
   * Called whenever the consolidated transcript changes. The text is
   * post-processed (medical fixups applied) but not split into
   * sections — pair with `onSections` if you want APSO splitting.
   */
  onTranscriptChange?: (transcript: string) => void;
  /** Called with the APSO-split transcript on every change. */
  onSections?: (sections: SectionedTranscript) => void;
  /** Optional initial transcript (e.g. when resuming from a draft). */
  initialTranscript?: string;
  /** Spoken language. Default en-US. */
  lang?: string;
  /** Tailwind classes for the outer wrapper. */
  className?: string;
  /** Hide the section preview panel — useful when the parent renders sections itself. */
  hideSectionPreview?: boolean;
}

export function VoiceDictation({
  onTranscriptChange,
  onSections,
  initialTranscript = "",
  lang = "en-US",
  className,
  hideSectionPreview = false,
}: VoiceDictationProps) {
  const [status, setStatus] = React.useState<DictationStatus>("idle");
  const [transcript, setTranscript] = React.useState(initialTranscript);
  const [interim, setInterim] = React.useState("");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = React.useRef(transcript);
  React.useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Notify parent on every confirmed transcript change.
  React.useEffect(() => {
    onTranscriptChange?.(transcript);
    if (onSections) onSections(splitIntoApsoSections(transcript));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  // Build the recognition instance once per `lang`.
  React.useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev: any) => {
      let nextInterim = "";
      let appended = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const text = r[0]?.transcript ?? "";
        if (r.isFinal) appended += text;
        else nextInterim += text;
      }
      if (appended) {
        const fixed = applyMedicalFixups(appended);
        setTranscript((prev) => (prev ? prev + " " + fixed : fixed).trim());
      }
      setInterim(applyMedicalFixups(nextInterim));
    };

    rec.onerror = (ev: any) => {
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
        setStatus(nextStatus("listening", "deny"));
      }
    };

    rec.onend = () => {
      // Browser auto-ends after a silence window. Treat as a pause so
      // the user can pick up where they left off.
      setStatus((s) => nextStatus(s, "auto-end"));
      setInterim("");
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.start();
      setStatus(nextStatus(status, "start"));
    } catch {
      /* already started */
    }
  }, [status]);

  const pause = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
    setStatus(nextStatus(status, "stop"));
  }, [status]);

  const reset = React.useCallback(() => {
    pause();
    setTranscript("");
    setInterim("");
    setStatus("idle");
  }, [pause]);

  const sections = React.useMemo(
    () => splitIntoApsoSections(transcript),
    [transcript],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-border bg-surface-raised shadow-sm">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <MicButton
            status={status}
            onStart={start}
            onPause={pause}
          />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm text-text">Voice dictation</p>
            <p className="text-[11px] text-text-subtle truncate">
              {statusLabel(status)}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            disabled={status === "unsupported" || (!transcript && !interim)}
            className="text-[12px] text-text-subtle hover:text-text disabled:opacity-40"
          >
            Clear
          </button>
        </div>
        <div className="px-4 py-3 min-h-[100px] text-sm text-text leading-relaxed">
          <span>{transcript}</span>
          {interim && (
            <span className="text-text-subtle italic">
              {transcript ? " " : ""}
              {interim}
            </span>
          )}
          {!transcript && !interim && (
            <p className="text-text-subtle italic">
              Tap the mic and start speaking. Say &ldquo;Assessment…&rdquo;,
              &ldquo;Plan…&rdquo;, &ldquo;Subjective…&rdquo;, or
              &ldquo;Objective…&rdquo; to switch sections.
            </p>
          )}
        </div>
      </div>

      {!hideSectionPreview && transcript && (
        <SectionPreview sections={sections} />
      )}
    </div>
  );
}

function MicButton({
  status,
  onStart,
  onPause,
}: {
  status: DictationStatus;
  onStart: () => void;
  onPause: () => void;
}) {
  const disabled = status === "unsupported" || status === "denied";
  const listening = status === "listening";
  const onClick = listening ? onPause : onStart;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={
        disabled
          ? "Dictation unavailable"
          : listening
            ? "Pause dictation"
            : "Start dictation"
      }
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors shrink-0",
        listening
          ? "bg-danger text-white animate-pulse"
          : "bg-accent text-accent-ink hover:brightness-105",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <MicIcon listening={listening} />
    </button>
  );
}

function SectionPreview({ sections }: { sections: SectionedTranscript }) {
  const entries: Array<[string, string]> = [
    ["Subjective", sections.subjective],
    ["Objective", sections.objective],
    ["Assessment", sections.assessment],
    ["Plan", sections.plan],
  ];
  const populated = entries.filter(([, v]) => v.trim().length > 0);
  if (populated.length === 0 && !sections.unfiled) return null;

  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-text-subtle mb-2">
        Auto-routed to sections
      </p>
      <dl className="space-y-2">
        {populated.map(([label, body]) => (
          <div key={label}>
            <dt className="text-[11px] font-medium text-accent">{label}</dt>
            <dd className="text-sm text-text-muted leading-relaxed">{body}</dd>
          </div>
        ))}
        {sections.unfiled && (
          <div>
            <dt className="text-[11px] font-medium text-text-subtle">Unsorted</dt>
            <dd className="text-sm text-text-muted leading-relaxed italic">
              {sections.unfiled}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function statusLabel(status: DictationStatus): string {
  switch (status) {
    case "listening":
      return "Listening — say a section name to switch.";
    case "paused":
      return "Paused. Tap the mic to resume.";
    case "denied":
      return "Microphone permission denied. Check browser settings.";
    case "unsupported":
      return "Dictation isn't supported in this browser. Try Chrome or Safari.";
    case "idle":
    default:
      return "Tap the mic to start.";
  }
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={listening ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

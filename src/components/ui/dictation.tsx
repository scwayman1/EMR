"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// EMR-135: Voice dictation primitive. Better-than-Dragon means: works in
// any text field, no extra software, never blocks the UI, and has a
// medical-vocabulary post-pass. Uses the browser SpeechRecognition API
// (webkit prefix on Safari/Chrome) with continuous + interim results so
// the clinician sees text stream as they speak. Falls back to a "not
// supported" hint when the browser lacks the API (Firefox).

type DictationStatus = "idle" | "listening" | "denied" | "unsupported";

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

/**
 * Medical-vocabulary post-pass. The browser API mishears common medical
 * terms — fix the highest-frequency mistakes inline. Keep this list
 * conservative; aggressive substitutions become wrong-word hazards.
 */
const MEDICAL_FIXUPS: Array<[RegExp, string]> = [
  [/\bmilligrams?\b/gi, "mg"],
  [/\bmicrograms?\b/gi, "mcg"],
  [/\btwice a day\b/gi, "BID"],
  [/\bthree times a day\b/gi, "TID"],
  [/\bfour times a day\b/gi, "QID"],
  [/\bonce daily\b/gi, "QD"],
  [/\bas needed\b/gi, "PRN"],
  [/\bby mouth\b/gi, "PO"],
  [/\bsubcutaneous(ly)?\b/gi, "SC"],
  [/\bintramuscular(ly)?\b/gi, "IM"],
  [/\bintravenous(ly)?\b/gi, "IV"],
  // Cannabis-specific
  [/\bC\.? B\.? D\.?\b/gi, "CBD"],
  [/\bT\.? H\.? C\.?\b/gi, "THC"],
  [/\bsea bee dee\b/gi, "CBD"],
  [/\btee aitch see\b/gi, "THC"],
];

function applyMedicalFixups(text: string): string {
  let out = text;
  for (const [re, repl] of MEDICAL_FIXUPS) out = out.replace(re, repl);
  return out;
}

/**
 * Hook that wires the browser SpeechRecognition API into a controlled
 * onTranscript callback. The callback receives final text only — interim
 * text is reported separately so callers can style it differently.
 */
export function useDictation(opts?: {
  lang?: string;
  onFinal: (text: string) => void;
  onInterim?: (text: string) => void;
}) {
  const { lang = "en-US", onFinal, onInterim } = opts ?? { onFinal: () => {} };
  const [status, setStatus] = React.useState<DictationStatus>("idle");
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  // Refs so the recognition handlers always see the freshest callbacks
  // without rebuilding the recognition instance on every parent rerender.
  const onFinalRef = React.useRef(onFinal);
  const onInterimRef = React.useRef(onInterim);
  React.useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);
  React.useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

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
      let interim = "";
      let final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const result = ev.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) onFinalRef.current(applyMedicalFixups(final));
      if (interim) onInterimRef.current?.(applyMedicalFixups(interim));
    };
    rec.onerror = (ev: any) => {
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed") {
        setStatus("denied");
      } else {
        setStatus("idle");
      }
    };
    rec.onend = () => setStatus((s) => (s === "listening" ? "idle" : s));
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
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setStatus("listening");
    } catch {
      // start() throws if already started — treat as a noop.
    }
  }, []);

  const stop = React.useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* already stopped */
    }
    setStatus("idle");
  }, []);

  const toggle = React.useCallback(() => {
    if (status === "listening") stop();
    else start();
  }, [status, start, stop]);

  return { status, start, stop, toggle };
}

interface DictateButtonProps {
  /** Called with the final, post-processed transcript chunk. */
  onText: (text: string) => void;
  /** Optional: called with interim (in-progress) text for ghost styling. */
  onInterim?: (text: string) => void;
  className?: string;
  /** Tooltip / aria-label override. */
  label?: string;
  size?: "sm" | "md";
}

/**
 * Mic button that toggles dictation into a controlled text field. Pair
 * with a textarea/input where the parent owns state and appends `text`
 * on each onText call.
 */
export function DictateButton({
  onText,
  onInterim,
  className,
  label = "Dictate",
  size = "sm",
}: DictateButtonProps) {
  const { status, toggle } = useDictation({ onFinal: onText, onInterim });
  const disabled = status === "unsupported";
  const sizing =
    size === "md"
      ? "h-9 w-9"
      : "h-7 w-7";
  const tooltip =
    status === "unsupported"
      ? "Dictation not supported in this browser"
      : status === "denied"
        ? "Microphone permission denied"
        : status === "listening"
          ? "Stop dictating"
          : label;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : toggle}
      disabled={disabled}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={status === "listening"}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors shrink-0",
        sizing,
        status === "listening"
          ? "bg-danger/15 text-danger animate-pulse"
          : "text-text-subtle hover:text-accent hover:bg-surface-muted",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
        className,
      )}
    >
      <MicIcon listening={status === "listening"} />
    </button>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
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

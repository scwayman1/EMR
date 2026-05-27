/**
 * EMR-135 — Voice Dictation
 *
 * Pure helpers powering the dictation surface. The browser
 * SpeechRecognition wiring lives in the React component; this module
 * holds the deterministic transforms we want to unit-test:
 *
 *   • Medical-vocabulary post-pass (mishearings → correct abbreviations).
 *   • APSO section detection — "Subjective…" / "Objective…" / etc. —
 *     so the clinician can dictate one stream and the UI splits it.
 *   • Pause / resume state machine that tolerates the browser's
 *     habit of auto-ending a recognition session every ~30s.
 *
 * Keeping the transforms here means the React surface stays thin and
 * the tests stay fast.
 */

export type DictationStatus = "idle" | "listening" | "paused" | "denied" | "unsupported";

/* -------------------------------------------------------------------------- */
/* Medical-vocabulary post-pass                                                */
/* -------------------------------------------------------------------------- */

/**
 * Conservative substitutions only. Aggressive replacement turns a
 * mishearing into a wrong-word patient-safety bug, so we only fix
 * patterns that are unambiguous in clinical context.
 */
const MEDICAL_FIXUPS: Array<[RegExp, string]> = [
  // Dosage units
  [/\bmilligrams?\b/gi, "mg"],
  [/\bmicrograms?\b/gi, "mcg"],
  [/\bmilliliters?\b/gi, "mL"],
  // Frequency
  [/\bonce a day\b/gi, "QD"],
  [/\bonce daily\b/gi, "QD"],
  [/\btwice a day\b/gi, "BID"],
  [/\bthree times a day\b/gi, "TID"],
  [/\bfour times a day\b/gi, "QID"],
  [/\bevery (\d+) hours?\b/gi, "Q$1H"],
  [/\bas needed\b/gi, "PRN"],
  [/\bbedtime\b/gi, "QHS"],
  // Routes
  [/\bby mouth\b/gi, "PO"],
  [/\bsubcutaneous(ly)?\b/gi, "SC"],
  [/\bintramuscular(ly)?\b/gi, "IM"],
  [/\bintravenous(ly)?\b/gi, "IV"],
  [/\bsublingual(ly)?\b/gi, "SL"],
  // Cannabis
  [/\bC\.? B\.? D\.?\b/gi, "CBD"],
  [/\bT\.? H\.? C\.?\b/gi, "THC"],
  [/\bsea bee dee\b/gi, "CBD"],
  [/\btee aitch see\b/gi, "THC"],
  [/\bcannabidiol\b/gi, "CBD"],
  // Common mishearings
  [/\bhigh pertension\b/gi, "hypertension"],
  [/\bdiabetes mell?itus\b/gi, "diabetes mellitus"],
  [/\ba won c\b/gi, "A1C"],
  [/\bel dl\b/gi, "LDL"],
  [/\bh dl\b/gi, "HDL"],
  [/\bb p\b/gi, "BP"],
  [/\bh r\b/gi, "HR"],
];

export function applyMedicalFixups(text: string): string {
  let out = text;
  for (const [re, repl] of MEDICAL_FIXUPS) out = out.replace(re, repl);
  return out;
}

/* -------------------------------------------------------------------------- */
/* APSO section detection                                                     */
/* -------------------------------------------------------------------------- */

export type ApsoSection = "assessment" | "plan" | "subjective" | "objective" | "unknown";

/** Spoken cues that switch sections. Order matters — longer phrases first. */
const SECTION_CUES: Array<[RegExp, ApsoSection]> = [
  [/^\s*(assessment|impression)[:.,\s]/i, "assessment"],
  [/^\s*(plan|treatment plan|management)[:.,\s]/i, "plan"],
  [/^\s*(subjective|history|hpi|chief complaint)[:.,\s]/i, "subjective"],
  [/^\s*(objective|exam|vitals|physical exam)[:.,\s]/i, "objective"],
];

export interface SectionedTranscript {
  assessment: string;
  plan: string;
  subjective: string;
  objective: string;
  /** Anything spoken before any cue lands here. */
  unfiled: string;
}

const EMPTY_TRANSCRIPT: SectionedTranscript = {
  assessment: "",
  plan: "",
  subjective: "",
  objective: "",
  unfiled: "",
};

/**
 * Walk a transcript line by line, switching the active section when a
 * cue is heard. Returns one chunk per APSO section. Treats the input
 * as additive — call this on the full running transcript each time
 * the recognizer emits a final result.
 */
export function splitIntoApsoSections(text: string): SectionedTranscript {
  const out: SectionedTranscript = { ...EMPTY_TRANSCRIPT };
  let active: ApsoSection = "unknown";

  // Split on sentence-ish boundaries so a single dictated paragraph
  // can carry multiple section cues.
  const chunks = text.split(/(?<=[.!?])\s+/);
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;

    let matched = false;
    for (const [re, section] of SECTION_CUES) {
      const m = chunk.match(re);
      if (m) {
        active = section;
        const remainder = chunk.slice(m[0].length).trim();
        if (remainder) appendTo(out, active, remainder);
        matched = true;
        break;
      }
    }
    if (!matched) appendTo(out, active, chunk);
  }

  return out;
}

function appendTo(t: SectionedTranscript, section: ApsoSection, text: string) {
  if (section === "unknown") {
    t.unfiled = (t.unfiled ? t.unfiled + " " : "") + text;
  } else {
    t[section] = (t[section] ? t[section] + " " : "") + text;
  }
}

/* -------------------------------------------------------------------------- */
/* Pause / resume state machine                                               */
/* -------------------------------------------------------------------------- */

/**
 * The browser's SpeechRecognition often ends after ~30s of silence.
 * We treat that as an implicit "pause" and let the user resume — the
 * UI button reflects which of (idle, listening, paused) we're in.
 */
export function nextStatus(
  current: DictationStatus,
  event: "start" | "stop" | "auto-end" | "deny" | "unsupported",
): DictationStatus {
  switch (event) {
    case "deny":
      return "denied";
    case "unsupported":
      return "unsupported";
    case "start":
      return "listening";
    case "stop":
      return current === "listening" ? "paused" : "idle";
    case "auto-end":
      return current === "listening" ? "paused" : current;
  }
}

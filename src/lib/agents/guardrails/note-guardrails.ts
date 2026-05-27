/**
 * Note guardrails (EMR-131).
 *
 * Three guardrails sit between a transcript and a finalized note:
 *
 *  1. **PII redaction (pre-model)** — strip patient/provider PII out of
 *     the raw transcript before the model sees it. Names, phone, SSN,
 *     email, MRN-shaped tokens. The structured note that comes back can
 *     still reference the patient (the chart UI re-hydrates the name
 *     from the patient row), so the model never needs the literal PII.
 *
 *  2. **Hallucination scan (post-model)** — flag claims in AI-generated
 *     blocks that don't have grounding in the transcript or the
 *     patient's chart context. Scoring is intentionally conservative:
 *     we don't want to silently strip output, only mark spans for the
 *     clinician to review before signing.
 *
 *  3. **Snapshot freeze (on finalize)** — when the clinician signs a
 *     note, capture an immutable hash of the AI draft + the transcript
 *     so we can prove provenance later (defense against "the AI made
 *     that up" complaints in audit/litigation).
 */

import { createHash } from "crypto";

// ── PII redaction ────────────────────────────────────────────────

const PHONE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const MRN_LIKE = /\bMRN[:\s]*\d{4,}\b/gi;
const DOB = /\b(?:0?[1-9]|1[0-2])[\/.-](?:0?[1-9]|[12]\d|3[01])[\/.-](?:19|20)\d{2}\b/g;

export interface RedactionResult {
  /** The transcript with PII replaced by tokens. */
  redacted: string;
  /**
   * Per-category counts so we can show the clinician what was scrubbed
   * and so audit logs can prove the model never saw raw identifiers.
   */
  counts: Record<"phone" | "ssn" | "email" | "mrn" | "dob" | "name", number>;
}

/**
 * Redact common PII patterns plus a list of literal names (the patient
 * and any known household contacts). Names are passed in because we
 * can't reliably regex them — false positives on common words like
 * "Mason" or "Brooks" would wreck the model's grounding.
 */
export function redactPii(input: string, knownNames: string[] = []): RedactionResult {
  const counts = { phone: 0, ssn: 0, email: 0, mrn: 0, dob: 0, name: 0 };
  let out = input;

  out = out.replace(PHONE, (m) => {
    counts.phone++;
    return "[PHONE]";
  });
  out = out.replace(SSN, (m) => {
    counts.ssn++;
    return "[SSN]";
  });
  out = out.replace(EMAIL, (m) => {
    counts.email++;
    return "[EMAIL]";
  });
  out = out.replace(MRN_LIKE, (m) => {
    counts.mrn++;
    return "MRN [REDACTED]";
  });
  out = out.replace(DOB, (m) => {
    counts.dob++;
    return "[DOB]";
  });

  for (const name of knownNames) {
    const trimmed = name.trim();
    if (trimmed.length < 2) continue;
    // Word-boundary, case-insensitive. Escape regex metacharacters.
    const safe = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${safe}\\b`, "gi");
    out = out.replace(re, () => {
      counts.name++;
      return "[PATIENT]";
    });
  }

  return { redacted: out, counts };
}

// ── Hallucination scan ──────────────────────────────────────────

export interface HallucinationFlag {
  block: string;
  /** Phrase from the AI draft that has no transcript/context grounding. */
  span: string;
  reason: string;
}

export interface HallucinationReport {
  flags: HallucinationFlag[];
  /** 0–1, lower = more concerning. Use as a hint, not a gate. */
  confidence: number;
}

/**
 * Conservative hallucination scan. We split the AI draft into sentences
 * and check whether each sentence has at least one significant token
 * that appears in either the transcript or the patient context. A
 * sentence whose nouns/numerics don't show up anywhere upstream is
 * flagged — not removed.
 *
 * This is a heuristic, not a model call, so it's cheap and runs on
 * every finalize. The clinician sees flags inline in the editor and
 * decides whether to keep the sentence.
 */
export function scanForHallucinations(
  blocks: { type: string; body: string }[],
  transcript: string,
  patientContext: string
): HallucinationReport {
  const sourceTokens = new Set(
    tokenize(`${transcript}\n${patientContext}`).map((t) => t.toLowerCase())
  );
  const flags: HallucinationFlag[] = [];
  let totalSentences = 0;
  let groundedSentences = 0;

  for (const block of blocks) {
    if (!block.body) continue;
    const sentences = block.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
    for (const sentence of sentences) {
      totalSentences++;
      const significant = tokenize(sentence)
        .filter((t) => t.length >= 4)
        .map((t) => t.toLowerCase());
      if (significant.length === 0) {
        groundedSentences++;
        continue;
      }
      const overlap = significant.filter((t) => sourceTokens.has(t)).length;
      const ratio = overlap / significant.length;
      if (ratio < 0.18) {
        flags.push({
          block: block.type,
          span: sentence,
          reason:
            ratio === 0
              ? "No words from this sentence appear in the transcript or chart context."
              : "Few words from this sentence appear in source material — verify before signing.",
        });
      } else {
        groundedSentences++;
      }
    }
  }

  const confidence =
    totalSentences === 0 ? 1 : groundedSentences / totalSentences;
  return { flags, confidence };
}

function tokenize(s: string): string[] {
  return s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// ── Snapshot freeze ────────────────────────────────────────────

export interface NoteSnapshot {
  /** SHA-256 of the AI draft blocks (canonicalized). */
  draftHash: string;
  /** SHA-256 of the source transcript. */
  transcriptHash: string;
  /** ISO timestamp when the snapshot was taken. */
  frozenAt: string;
  /** Hallucination confidence at finalize time (0–1). */
  hallucinationConfidence: number;
  /** Count of redactions per PII category. */
  redactionCounts: RedactionResult["counts"];
  /** Sentences flagged but not stripped — provenance for audit. */
  flaggedSpans: HallucinationFlag[];
}

/**
 * Freeze a draft + transcript pair so the chart can later prove what
 * the AI produced before the clinician edited and signed. Stored as
 * JSON in Note.blocks[].metadata.snapshot or AuditLog metadata.
 */
export function freezeNoteSnapshot(args: {
  draftBlocks: { type: string; body: string }[];
  transcript: string;
  hallucinationConfidence: number;
  redactionCounts: RedactionResult["counts"];
  flaggedSpans: HallucinationFlag[];
}): NoteSnapshot {
  const canonicalDraft = JSON.stringify(
    args.draftBlocks.map((b) => ({ type: b.type, body: b.body }))
  );
  return {
    draftHash: sha256(canonicalDraft),
    transcriptHash: sha256(args.transcript),
    frozenAt: new Date().toISOString(),
    hallucinationConfidence: args.hallucinationConfidence,
    redactionCounts: args.redactionCounts,
    flaggedSpans: args.flaggedSpans,
  };
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

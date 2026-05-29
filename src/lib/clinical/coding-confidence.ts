/**
 * Coding domain logic — prompt, parse, and (the headline) deterministic
 * grounding for ICD-10 suggestions.
 *
 * The problem this solves: the coding model emits ICD-10 codes with
 * self-reported confidence and nothing checks them against the note, so a
 * code for a concept the note never mentions (e.g. "Primary insomnia" on a
 * visit that never discusses sleep) ships at 88% "confidence". Grounding is a
 * cheap, deterministic gate: a diagnostic code only survives if its clinical
 * concept actually appears in the documented note, and its confidence is
 * reconciled down by how well it's supported.
 *
 * Pure + dependency-free so the grounding rules are unit-testable.
 */

export interface CandidateCode {
  code: string;
  label: string;
  /** Model self-reported confidence, 0–1. */
  confidence: number;
  rationale?: string;
}

export interface GroundedCode extends CandidateCode {
  /** True when the code's concept is supported by the note text. */
  grounded: boolean;
  /** 0–1 fraction of the label's concept terms found in the note. */
  groundingScore: number;
  /** The note terms that supported this code (for the rationale/UI). */
  matchedTerms: string[];
}

export interface ParsedCoding {
  icd10: CandidateCode[];
  emLevel: string | null;
  emRationale: string;
  overallConfidence: number | null;
}

/* ── Prompt + parse (shared by the agent and the draft action) ─────────── */

export function buildCodingPrompt(noteText: string, patientContext: string): string {
  return `You are a medical coding assistant. Review this clinical note and suggest appropriate ICD-10 diagnostic codes and an E&M evaluation/management level.

CLINICAL NOTE:
${noteText}

Patient context: ${patientContext || "Not documented"}

Return ONLY valid JSON:
{
  "icd10": [
    { "code": "G89.29", "label": "Other chronic pain", "confidence": 0.85, "rationale": "Patient presents with chronic neuropathic pain" }
  ],
  "emLevel": "99214",
  "emRationale": "Moderate complexity visit with established patient",
  "overallConfidence": 0.75
}

Guidelines:
- Only suggest a code when the note documents findings that support it. Do not infer diagnoses that are not in the note.
- E&M codes: 99211-99215 for established, 99201-99205 for new patients.
- Cannabis-related codes may include F12.x series if applicable.
- Provide a clear rationale for each code, citing the documented finding.`;
}

function tryParseJSON(text: string): any | null {
  const jsonMatch =
    text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Parse a model coding response into a normalized shape. Returns null when the response isn't usable JSON. */
export function parseCodingResponse(text: string): ParsedCoding | null {
  const parsed = tryParseJSON(text);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.icd10)) {
    return null;
  }
  const icd10: CandidateCode[] = parsed.icd10
    .filter(
      (c: any) =>
        c && typeof c === "object" && typeof c.code === "string" && typeof c.label === "string",
    )
    .map((c: any) => ({
      code: c.code,
      label: c.label,
      confidence: typeof c.confidence === "number" ? clamp01(c.confidence) : 0.5,
      rationale: typeof c.rationale === "string" ? c.rationale : undefined,
    }));
  return {
    icd10,
    emLevel: typeof parsed.emLevel === "string" ? parsed.emLevel : null,
    emRationale: typeof parsed.emRationale === "string" ? parsed.emRationale : "",
    overallConfidence:
      typeof parsed.overallConfidence === "number" ? clamp01(parsed.overallConfidence) : null,
  };
}

/* ── Grounding ─────────────────────────────────────────────────────────── */

// Generic descriptors carry no clinical concept, so they don't count toward
// grounding (otherwise "Other chronic pain" would "match" on the word "other").
const STOPWORDS = new Set([
  "other", "unspecified", "primary", "secondary", "chronic", "acute", "related",
  "disorder", "disorders", "disease", "diseases", "syndrome", "type", "with",
  "without", "due", "the", "and", "nos", "not", "elsewhere", "classified",
  "unspec", "site", "left", "right", "bilateral", "encounter", "status",
]);

// Concept synonym expansion: a label term grounds if it OR any synonym is in
// the note. Conservative — only well-known clinical equivalences.
const SYNONYMS: Record<string, string[]> = {
  pain: ["pain", "painful", "ache", "aching", "discomfort", "sore", "soreness"],
  insomnia: ["insomnia", "sleep", "sleeplessness", "sleepless", "wakeful"],
  anxiety: ["anxiety", "anxious", "panic", "worried", "worry"],
  depression: ["depression", "depressed", "depressive", "mood"],
  nausea: ["nausea", "nauseated", "nauseous", "vomiting", "queasy"],
  neoplasm: ["neoplasm", "cancer", "tumor", "tumour", "malignancy", "malignant", "carcinoma", "mass", "oncolog"],
  seizure: ["seizure", "seizures", "epilepsy", "epileptic", "convulsion"],
  migraine: ["migraine", "headache", "cephalgia"],
  spasticity: ["spasticity", "spasm", "spastic", "cramp"],
  fatigue: ["fatigue", "tired", "tiredness", "exhaustion", "lethargy"],
  appetite: ["appetite", "anorexia", "cachexia", "weight loss"],
  inflammation: ["inflammation", "inflammatory", "swelling", "swollen"],
  neuropathy: ["neuropathy", "neuropathic", "numbness", "tingling", "paresthesia"],
  arthritis: ["arthritis", "arthritic", "joint"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Significant (concept-bearing) lowercase terms from a code label. */
export function conceptTerms(label: string): string[] {
  return Array.from(
    new Set(
      (label.toLowerCase().match(/[a-z]+/g) ?? []).filter(
        (w) => w.length >= 3 && !STOPWORDS.has(w),
      ),
    ),
  );
}

function termPresent(term: string, haystack: string): boolean {
  const variants = SYNONYMS[term] ?? [term];
  return variants.some((v) =>
    // Prefix-tolerant word match: "oncolog" matches "oncology", "pain" matches
    // "painful" only via the explicit synonym list above (not substring), so
    // we anchor on a word boundary then allow a suffix.
    new RegExp(`\\b${escapeRegExp(v)}`, "i").test(haystack),
  );
}

/**
 * Ground a single code's label against the note text. A code is grounded when
 * at least one of its concept terms (or a synonym) appears in the note. Codes
 * whose label carries no concept term (all stopwords) are treated as grounded
 * with a neutral score — we don't drop what we can't evaluate.
 */
export function groundCode(label: string, noteText: string): {
  grounded: boolean;
  score: number;
  matchedTerms: string[];
} {
  const terms = conceptTerms(label);
  if (terms.length === 0) {
    return { grounded: true, score: 0.5, matchedTerms: [] };
  }
  const matchedTerms = terms.filter((t) => termPresent(t, noteText));
  const score = matchedTerms.length / terms.length;
  return { grounded: matchedTerms.length > 0, score, matchedTerms };
}

/** Reconcile model confidence with how well the note supports the code. */
export function reconcileConfidence(modelConfidence: number, groundingScore: number): number {
  // A fully-supported code keeps ~its model confidence; a thinly-supported one
  // is scaled down. Ungrounded codes are dropped upstream, not reconciled.
  return clamp01(modelConfidence * (0.4 + 0.6 * groundingScore));
}

/**
 * Partition candidate ICD-10 codes into grounded (kept, with reconciled
 * confidence) and dropped (concept absent from the note).
 */
export function applyGrounding(
  codes: CandidateCode[],
  noteText: string,
): { kept: GroundedCode[]; dropped: GroundedCode[] } {
  const kept: GroundedCode[] = [];
  const dropped: GroundedCode[] = [];
  for (const c of codes) {
    const g = groundCode(c.label, noteText);
    const graded: GroundedCode = {
      ...c,
      grounded: g.grounded,
      groundingScore: g.score,
      matchedTerms: g.matchedTerms,
      confidence: g.grounded ? reconcileConfidence(c.confidence, g.score) : c.confidence,
    };
    (g.grounded ? kept : dropped).push(graded);
  }
  return { kept, dropped };
}

/** Overall confidence across kept codes (mean), 0 when none survive. */
export function overallCodingConfidence(kept: GroundedCode[]): number {
  if (kept.length === 0) return 0;
  return clamp01(kept.reduce((s, c) => s + c.confidence, 0) / kept.length);
}

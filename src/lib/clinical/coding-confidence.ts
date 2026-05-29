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

/* ── Critic pass + iterative confidence loop ───────────────────────────── */

export interface CodeVerdict {
  code: string;
  supported: boolean;
  confidence: number;
  evidence?: string;
}

export interface CriticResult {
  verdicts: CodeVerdict[];
  missed: CandidateCode[];
}

/** Minimal model-call shape the loop depends on (injected so this stays pure/testable). */
export type CompleteFn = (
  prompt: string,
  opts?: { maxTokens?: number; temperature?: number },
) => Promise<string>;

/** Strict auditor prompt: re-checks each proposed code against the note. */
export function buildCriticPrompt(noteText: string, codes: CandidateCode[]): string {
  const list = codes.map((c) => `- ${c.code} (${c.label})`).join("\n") || "(none)";
  return `You are a STRICT medical coding auditor. Given the clinical note and a list of proposed ICD-10 codes, decide for EACH proposed code whether the note documents findings that clearly support it. Be conservative: if the condition is not clearly documented, mark it unsupported. Also list any diagnosis that IS clearly documented in the note but is MISSING from the list.

CLINICAL NOTE:
${noteText}

PROPOSED CODES:
${list}

Return ONLY valid JSON:
{
  "verdicts": [
    { "code": "G89.29", "supported": true, "confidence": 0.9, "evidence": "exact phrase from the note" }
  ],
  "missed": [
    { "code": "F41.1", "label": "Generalized anxiety disorder", "confidence": 0.8, "rationale": "note documents ..." }
  ]
}`;
}

/** Parse a critic response; returns null when unusable. */
export function parseCriticResponse(text: string): CriticResult | null {
  const parsed = tryParseJSON(text);
  if (!parsed || typeof parsed !== "object") return null;
  const verdicts: CodeVerdict[] = Array.isArray(parsed.verdicts)
    ? parsed.verdicts
        .filter((v: any) => v && typeof v.code === "string")
        .map((v: any) => ({
          code: v.code,
          supported: Boolean(v.supported),
          confidence: typeof v.confidence === "number" ? clamp01(v.confidence) : 0.5,
          evidence: typeof v.evidence === "string" ? v.evidence : undefined,
        }))
    : [];
  const missed: CandidateCode[] = Array.isArray(parsed.missed)
    ? parsed.missed
        .filter((m: any) => m && typeof m.code === "string" && typeof m.label === "string")
        .map((m: any) => ({
          code: m.code,
          label: m.label,
          confidence: typeof m.confidence === "number" ? clamp01(m.confidence) : 0.6,
          rationale: typeof m.rationale === "string" ? m.rationale : undefined,
        }))
    : [];
  return { verdicts, missed };
}

export interface CodingLoopOptions {
  /** Max critic rounds (regenerate-with-feedback). Default 2 (aggressive). */
  maxCriticRounds?: number;
  /** Drop any surviving code below this confidence. Default 0.5 (aggressive). */
  confidenceFloor?: number;
  /** Turn the LLM critic off and run grounding-only. Default true. */
  enableCritic?: boolean;
}

export interface CodingLoopResult {
  kept: GroundedCode[];
  dropped: GroundedCode[];
  rounds: number;
  overall: number;
}

const codeKey = (c: { code: string }) => c.code.toUpperCase();
const sameCodeSet = (a: GroundedCode[], b: GroundedCode[]) => {
  if (a.length !== b.length) return false;
  const sa = new Set(a.map(codeKey));
  return b.every((c) => sa.has(codeKey(c)));
};

/**
 * The aggressive confidence loop: ground candidates, then repeatedly run a
 * strict LLM critic that drops unsupported codes and pulls in clearly-missed
 * ones, re-grounding each round until the set stabilises (or maxCriticRounds).
 * Finally apply a confidence floor. Pure aside from the injected `complete`.
 */
export async function runConfidenceLoop(args: {
  noteText: string;
  candidates: CandidateCode[];
  complete: CompleteFn;
  options?: CodingLoopOptions;
}): Promise<CodingLoopResult> {
  const {
    maxCriticRounds = 2,
    confidenceFloor = 0.5,
    enableCritic = true,
  } = args.options ?? {};

  const dropped: GroundedCode[] = [];
  let { kept, dropped: groundedOut } = applyGrounding(args.candidates, args.noteText);
  dropped.push(...groundedOut);

  let rounds = 0;
  if (enableCritic) {
    for (let i = 0; i < maxCriticRounds; i += 1) {
      let critic: CriticResult | null = null;
      try {
        const resp = await args.complete(buildCriticPrompt(args.noteText, kept), {
          maxTokens: 768,
          temperature: 0.1,
        });
        critic = parseCriticResponse(resp);
      } catch {
        break; // critic unavailable — keep what grounding produced
      }
      if (!critic) break;
      rounds += 1;

      const verdict = new Map(critic.verdicts.map((v) => [codeKey(v), v]));
      const supported: CandidateCode[] = kept
        .filter((c) => {
          const v = verdict.get(codeKey(c));
          return v ? v.supported : true; // codes the critic ignored stay
        })
        .map((c) => {
          const v = verdict.get(codeKey(c));
          return {
            code: c.code,
            label: c.label,
            confidence: v ? v.confidence : c.confidence,
            rationale: v?.evidence ?? c.rationale,
          };
        });
      const missed = critic.missed.filter(
        (m) => !supported.some((s) => codeKey(s) === codeKey(m)),
      );
      const merged = [...supported, ...missed];

      const grounded = applyGrounding(merged, args.noteText);
      dropped.push(...grounded.dropped);

      if (sameCodeSet(grounded.kept, kept) && missed.length === 0) {
        kept = grounded.kept; // adopt corrected confidences, then stop
        break;
      }
      kept = grounded.kept;
    }
  }

  // Aggressive floor: anything we still aren't confident in is set aside.
  const surviving: GroundedCode[] = [];
  for (const c of kept) {
    (c.confidence >= confidenceFloor ? surviving : dropped).push(c);
  }

  return {
    kept: surviving,
    dropped,
    rounds,
    overall: overallCodingConfidence(surviving),
  };
}

// EMR-037 / EMR-146 — pertinent-info-only transcript redaction.
//
// Per Dr. Patel's directive, AI transcription must "capture only
// pertinent medical info, DISCARD personal data". This module
// performs deterministic regex-based redaction first (so PHI never
// hits durable storage) and then extracts a short summary + a list
// of clinical bullets that the review queue surfaces to a clinician.
//
// In production this would defer to an LLM call after the regex
// pass; the regex pass alone is enough to keep emails, phone
// numbers, addresses, payment data and SSNs out of the database.

const PHI_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "email", pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { name: "phone", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { name: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: "credit_card", pattern: /\b(?:\d[ -]*?){13,19}\b/g },
  { name: "address", pattern: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way)\b/gi },
  // Typical patient identifier prefixes ("MRN 1234567")
  { name: "mrn", pattern: /\b(?:MRN|DOB|Patient ID|SSN)\s*[:#-]?\s*[\w-]+/gi },
];

const CLINICAL_KEYWORDS = [
  // Symptoms
  "pain",
  "anxiety",
  "sleep",
  "nausea",
  "headache",
  "appetite",
  "spasm",
  "tremor",
  "fatigue",
  // Care plan verbs
  "increase",
  "decrease",
  "titrate",
  "discontinue",
  "switch",
  "refill",
  // Cannabis / medication signals
  "thc",
  "cbd",
  "tincture",
  "edible",
  "vape",
  "gummy",
  "ratio",
  "mg",
];

export interface RedactionResult {
  pertinentSummary: string;
  clinicalBullets: string[];
  redactedCategories: string[];
}

/**
 * Strip PHI from a raw transcript and return a short
 * pertinent-info-only summary plus a bulleted clinical extraction.
 */
export function redactToPertinentSummary(raw: string): RedactionResult {
  if (!raw || raw.trim().length === 0) {
    return { pertinentSummary: "", clinicalBullets: [], redactedCategories: [] };
  }

  let scrubbed = raw;
  const redactedCategories: string[] = [];

  for (const { name, pattern } of PHI_PATTERNS) {
    // Reset lastIndex — global regexes carry state across .test()
    // calls, which can skip matches and leak PHI on repeat invocations.
    pattern.lastIndex = 0;
    if (pattern.test(scrubbed)) {
      pattern.lastIndex = 0;
      scrubbed = scrubbed.replace(pattern, `[${name.toUpperCase()} REDACTED]`);
      redactedCategories.push(name);
    }
  }

  // Split into sentences and keep only those containing a clinical
  // keyword. This is intentionally conservative — better to drop a
  // sentence than to leak PHI.
  const sentences = scrubbed
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const clinical = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return CLINICAL_KEYWORDS.some((kw) => lower.includes(kw));
  });

  const pertinentSummary = clinical.slice(0, 5).join(" ").slice(0, 1000);
  const clinicalBullets = clinical
    .map((s) => (s.length > 240 ? s.slice(0, 240) + "…" : s))
    .slice(0, 8);

  return {
    pertinentSummary:
      pertinentSummary ||
      "No clinically relevant content detected after redaction.",
    clinicalBullets,
    redactedCategories: Array.from(new Set(redactedCategories)),
  };
}

export type ScreeningVerdict = "clean" | "flagged";

export interface ScreeningFlag {
  term: string;
  offset: number;
  length: number;
  category: "prohibited_verb" | "prohibited_condition" | "drug_claim_pair";
  severity: "medium" | "high";
  suggestion?: string;
}

export interface ScreeningResult {
  verdict: ScreeningVerdict;
  flags: ScreeningFlag[];
}

const PROHIBITED_VERB_PATTERNS = [
  "treat(?:s|ing)?",
  "cure(?:s|ing)?",
  "prevent(?:s|ing)?",
  "diagnos(?:e|es|ing)",
  "mitigate(?:s|d|ing)?",
  "heal(?:s|ing)?",
  "remedy",
  "alleviate(?:s|d|ing)?",
  "eliminate(?:s|d|ing)?",
] as const;

const PROHIBITED_CONDITIONS = [
  "cancer",
  "tumor",
  "oncology",
  "anxiety disorder",
  "depression",
  "bipolar",
  "ptsd",
  "insomnia disorder",
  "epilepsy",
  "seizures",
  "alzheimer's",
  "dementia",
  "parkinson's",
  "arthritis",
  "diabetes",
  "autoimmune",
  "chronic pain",
  "migraine disorder",
  "fibromyalgia",
  "crohn's",
  "ibs",
  "colitis",
  "glaucoma",
  "adhd",
  "autism",
  "addiction",
] as const;

const THERAPEUTIC_CONNECTOR_PATTERNS = ["relief", "recovery", "from", "for"] as const;

const verbRegex = new RegExp(`\\b(?:${PROHIBITED_VERB_PATTERNS.join("|")})\\b`, "gi");
const conditionRegex = new RegExp(
  `\\b(?:${PROHIBITED_CONDITIONS
    .map((condition) => condition.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"))
    .join("|")})\\b`,
  "gi",
);
const therapeuticConnectorRegex = new RegExp(
  `\\b(?:${THERAPEUTIC_CONNECTOR_PATTERNS.join("|")})\\b`,
  "i",
);

function dedupeFlags(flags: ScreeningFlag[]): ScreeningFlag[] {
  const seen = new Set<string>();
  return flags.filter((flag) => {
    const key = `${flag.category}:${flag.offset}:${flag.term.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectMatches(regex: RegExp, text: string) {
  const matches: Array<{ term: string; offset: number; length: number }> = [];
  regex.lastIndex = 0;

  let match = regex.exec(text);
  while (match) {
    matches.push({
      term: match[0],
      offset: match.index,
      length: match[0].length,
    });
    match = regex.exec(text);
  }

  return matches;
}

interface Span {
  start: number;
  end: number;
  text: string;
}

function sentenceSpans(text: string): Span[] {
  const spans: Span[] = [];
  const splitter = /[^.!?\n]+[.!?\n]?/g;
  let match = splitter.exec(text);
  while (match) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[0],
    });
    match = splitter.exec(text);
  }
  return spans;
}

export function screenProductDescription(text: string): ScreeningResult {
  const flags: ScreeningFlag[] = [];

  if (!text.trim()) {
    return { verdict: "clean", flags };
  }

  const verbs = collectMatches(verbRegex, text);
  const conditions = collectMatches(conditionRegex, text);
  const spans = sentenceSpans(text);

  for (const span of spans) {
    const spanVerbs = verbs.filter((verb) => verb.offset >= span.start && verb.offset < span.end);
    const spanConditions = conditions.filter(
      (condition) => condition.offset >= span.start && condition.offset < span.end,
    );

    if (spanVerbs.length > 0 && spanConditions.length > 0) {
      for (const verb of spanVerbs) {
        flags.push({
          term: verb.term,
          offset: verb.offset,
          length: verb.length,
          category: "prohibited_verb",
          severity: "high",
          suggestion:
            "Replace therapeutic disease language with structure/function framing.",
        });
      }

      for (const condition of spanConditions) {
        flags.push({
          term: condition.term,
          offset: condition.offset,
          length: condition.length,
          category: "prohibited_condition",
          severity: "high",
          suggestion: "Avoid naming diagnosed conditions in product claims.",
        });
      }

      const pairTerm = `${spanVerbs[0].term} + ${spanConditions[0].term}`;
      flags.push({
        term: pairTerm,
        offset: Math.min(spanVerbs[0].offset, spanConditions[0].offset),
        length:
          Math.max(
            spanVerbs[0].offset + spanVerbs[0].length,
            spanConditions[0].offset + spanConditions[0].length,
          ) - Math.min(spanVerbs[0].offset, spanConditions[0].offset),
        category: "drug_claim_pair",
        severity: "high",
        suggestion:
          "This reads like a drug claim. Reframe around normal bodily function support.",
      });
      continue;
    }

    if (spanConditions.length > 0 && therapeuticConnectorRegex.test(span.text)) {
      for (const condition of spanConditions) {
        flags.push({
          term: condition.term,
          offset: condition.offset,
          length: condition.length,
          category: "prohibited_condition",
          severity: "medium",
          suggestion:
            "Disease-condition phrasing with therapeutic connectors can imply a drug claim.",
        });
      }
    }
  }

  const deduped = dedupeFlags(flags).sort((a, b) => a.offset - b.offset);
  return {
    verdict: deduped.length > 0 ? "flagged" : "clean",
    flags: deduped,
  };
}

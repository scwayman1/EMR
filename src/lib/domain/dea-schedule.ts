/**
 * EMR-350 — DEA controlled-substance scheduling helper.
 *
 * Maps a medication name (or known generic) to its DEA schedule (I–V) so
 * the prescription module can surface a "Controlled" badge and trigger
 * the right guardrails (override reasons, co-signer, audit trail).
 *
 * The list below is intentionally conservative: only well-documented
 * controlled substances commonly prescribed in our specialty are included.
 * Unrecognized names fall through to `null` (uncontrolled or unknown).
 */

export type DEASchedule = "I" | "II" | "III" | "IV" | "V";

interface ControlledEntry {
  /** DEA schedule classification. */
  schedule: DEASchedule;
  /** Patterns (lowercased) that match this substance in a free-text name. */
  patterns: RegExp[];
  /** Plain-language reason this substance is scheduled. */
  rationale: string;
}

const CONTROLLED_TABLE: ControlledEntry[] = [
  {
    schedule: "I",
    patterns: [/\bheroin\b/i, /\blsd\b/i, /\bmdma\b/i, /\bpsilocybin\b/i, /\bmescaline\b/i],
    rationale: "Schedule I: high abuse potential, no accepted medical use.",
  },
  {
    schedule: "II",
    patterns: [
      /\boxycodone\b/i,
      /\bhydrocodone\b/i,
      /\bmorphine\b/i,
      /\bfentanyl\b/i,
      /\bmethylphenidate\b/i,
      /\badderall\b/i,
      /\bdextroamphetamine\b/i,
      /\bamphetamine\b/i,
      /\bcodeine\b/i,
      /\bmethadone\b/i,
      /\bvyvanse\b/i,
      /\blisdexamfetamine\b/i,
    ],
    rationale: "Schedule II: high abuse potential, accepted medical use with severe restrictions.",
  },
  {
    schedule: "III",
    patterns: [
      /\bketamine\b/i,
      /\bbuprenorphine\b/i,
      /\bsuboxone\b/i,
      /\btestosterone\b/i,
      /\banabolic steroid\b/i,
      /\btylenol\s*[#3]/i,
    ],
    rationale: "Schedule III: moderate abuse potential, accepted medical use.",
  },
  {
    schedule: "IV",
    patterns: [
      /\balprazolam\b/i,
      /\bxanax\b/i,
      /\bdiazepam\b/i,
      /\bvalium\b/i,
      /\blorazepam\b/i,
      /\bativan\b/i,
      /\bclonazepam\b/i,
      /\bklonopin\b/i,
      /\btramadol\b/i,
      /\bzolpidem\b/i,
      /\bambien\b/i,
      /\beszopiclone\b/i,
      /\blunesta\b/i,
      /\bmodafinil\b/i,
      /\bprovigil\b/i,
    ],
    rationale: "Schedule IV: lower abuse potential than III; accepted medical use.",
  },
  {
    schedule: "V",
    patterns: [/\bpregabalin\b/i, /\blyrica\b/i, /\blacosamide\b/i, /\bcough syrup with codeine\b/i],
    rationale: "Schedule V: lowest abuse potential among scheduled substances.",
  },
];

export interface ControlledMatch {
  schedule: DEASchedule;
  rationale: string;
}

/**
 * Classify a medication name against the DEA schedule table. Returns null
 * when no rule fires — caller can treat as "not controlled / unknown" and
 * skip the guardrails.
 */
export function classifyDEASchedule(name: string): ControlledMatch | null {
  const candidate = name.trim();
  if (!candidate) return null;
  for (const entry of CONTROLLED_TABLE) {
    if (entry.patterns.some((p) => p.test(candidate))) {
      return { schedule: entry.schedule, rationale: entry.rationale };
    }
  }
  return null;
}

export const DEA_SCHEDULE_LABEL: Record<DEASchedule, string> = {
  I: "Schedule I",
  II: "Schedule II",
  III: "Schedule III",
  IV: "Schedule IV",
  V: "Schedule V",
};

export const DEA_SCHEDULE_TONE: Record<DEASchedule, "danger" | "warning" | "accent"> = {
  I: "danger",
  II: "danger",
  III: "warning",
  IV: "warning",
  V: "accent",
};

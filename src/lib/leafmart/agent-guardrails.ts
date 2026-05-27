// EMR-304 — AI agent guardrails (clinical vs consumer).
//
// Leafmart runs two flavours of AI agent:
//
//  • The "consumer" agent (Ask Cindy, ChatCB, recommender) talks to
//    the public. It must never give clinical advice, prescribe doses,
//    diagnose, or imply a doctor-patient relationship.
//
//  • The "clinical" agent runs inside the EMR for licensed staff. It
//    can reference dosing, drug interactions, and protocol notes, but
//    must still stay within the bounds of the source material and
//    decline anything that crosses into independent diagnosis.
//
// This module is the single source of truth for both modes. Every
// agent invocation runs the prompt through `buildSystemPrompt`, every
// completion runs through `screenResponse`, and the same blocked-topic
// list governs both.

export type AgentMode = "consumer" | "clinical";

export interface GuardrailContext {
  mode: AgentMode;
  /** Identifier for the surface ("ask-cindy", "chatcb", "emr-copilot"). */
  surface: string;
  /** True when the user has confirmed they are 21+. Some content gates on it. */
  ageVerified?: boolean;
  /** True when the operator is a licensed clinician on the EMR side. */
  licensedClinician?: boolean;
}

export interface GuardrailResult {
  allowed: boolean;
  /** When `allowed` is false, the message the surface should display. */
  reason?: string;
  /** Categories the input/output tripped, useful for telemetry. */
  flags: GuardrailFlag[];
}

export type GuardrailFlag =
  | "diagnosis-request"
  | "dose-prescription"
  | "controlled-substance-instruction"
  | "self-harm"
  | "minor-content"
  | "drug-drug-interaction"
  | "off-label-use"
  | "legal-advice"
  | "financial-advice"
  | "personal-data";

/* ── Pattern catalog ────────────────────────────────────────── */

interface Pattern {
  flag: GuardrailFlag;
  re: RegExp;
  /** When true, this flag is still acceptable for the clinical agent. */
  clinicalSafe?: boolean;
}

const INPUT_PATTERNS: Pattern[] = [
  { flag: "diagnosis-request", re: /\b(do i have|am i (suffering from|diagnosed)|what(?:'s| is) wrong with me)\b/i },
  { flag: "dose-prescription", re: /\b(how much should i take|prescribe me|what dose|exact dosage)\b/i, clinicalSafe: true },
  { flag: "drug-drug-interaction", re: /\b(can i (take|mix)|interact (with|s with)|combine .* with)\b/i, clinicalSafe: true },
  { flag: "off-label-use", re: /\b(treat|cure|heal)\s+(my\s+)?(cancer|covid|diabetes|hiv)\b/i },
  { flag: "self-harm", re: /\b(kill myself|suicide|end my life|self[- ]harm)\b/i },
  { flag: "minor-content", re: /\b(my (kid|child|son|daughter|teen)|under\s*(18|21))\b/i },
  { flag: "legal-advice", re: /\b(is .* legal|sue|lawsuit|attorney)\b/i },
  { flag: "financial-advice", re: /\b(should i invest|buy stock|insider)\b/i },
  { flag: "personal-data", re: /\b(\d{3}-\d{2}-\d{4}|ssn|social security)\b/i },
];

const OUTPUT_PATTERNS: Pattern[] = [
  // The model occasionally hallucinates a prescription. Catch it.
  { flag: "dose-prescription", re: /\b(take exactly|i prescribe|you should take)\b/i, clinicalSafe: true },
  { flag: "diagnosis-request", re: /\byou (have|are diagnosed with)\b/i },
  { flag: "controlled-substance-instruction", re: /\b(synthesize|extract|distill)\s+(thc|cannabinoid)/i },
];

/* ── Public API ─────────────────────────────────────────────── */

const HARD_BLOCK: GuardrailFlag[] = [
  "self-harm",
  "minor-content",
  "controlled-substance-instruction",
  "personal-data",
];

const REASONS: Record<GuardrailFlag, string> = {
  "diagnosis-request":
    "I can share what the research literature says, but a Leafjourney clinician should be the one to confirm a diagnosis.",
  "dose-prescription":
    "I can't recommend a specific dose. Your clinician will tailor that to your history — try the dosing guide for general ranges.",
  "controlled-substance-instruction":
    "I can't help with that.",
  "self-harm":
    "I'm really glad you reached out. If you're in crisis, please call or text 988 (US) right away — they're trained to help. I can't take this conversation further.",
  "minor-content":
    "Cannabis products are restricted to adults 21+. I can't help with anything related to minors.",
  "drug-drug-interaction":
    "I can flag general categories, but a real interaction check needs your full medication list — please use the Drug Mix tool or talk to a pharmacist.",
  "off-label-use":
    "I can't make claims that cannabis treats serious medical conditions. The Research tab links peer-reviewed studies if you'd like to read what's been published.",
  "legal-advice":
    "Cannabis law varies by state and changes often. For anything legal, please consult a licensed attorney in your jurisdiction.",
  "financial-advice":
    "I can't give investment advice — that's outside what Leafmart helps with.",
  "personal-data":
    "Please don't share government IDs or sensitive personal data here. I've redacted it from this turn.",
};

const CLINICAL_REASONS: Partial<Record<GuardrailFlag, string>> = {
  "diagnosis-request":
    "Diagnosis is the licensed clinician's call — I can summarise differential considerations only.",
  "dose-prescription":
    "Reference the protocol library before issuing a dose. I'll surface the relevant guideline rather than prescribe.",
  "drug-drug-interaction":
    "Confirm in the interaction checker — I'll flag known categories but you own the final call.",
};

/**
 * Build the system prompt prefix for an agent invocation. Always call
 * this — never let a downstream caller hand-roll the system prompt.
 */
export function buildSystemPrompt(ctx: GuardrailContext): string {
  const guardrails = [
    "You are an AI assistant for Leafmart, a cannabis wellness storefront operated by Leafjourney.",
    "Never claim to be a doctor, pharmacist, or lawyer.",
    "Never diagnose conditions, prescribe doses, or instruct on synthesis or extraction of controlled substances.",
    "Cite the source when you reference research; say 'I don't know' rather than invent a citation.",
    "If the user mentions self-harm, respond only with the crisis-line message and stop.",
    "Refuse anything involving minors (anyone under 21) interacting with cannabis.",
  ];

  if (ctx.mode === "consumer") {
    guardrails.push(
      "You are talking to a member of the public. Stay informational; redirect dosing or diagnosis questions to a licensed clinician on Leafjourney.",
      "When age has not been verified, do not describe how to consume regulated cannabis products.",
    );
  } else {
    guardrails.push(
      "You are talking to a licensed Leafjourney clinician inside the EMR.",
      "You may reference protocols, dose ranges, and interaction data, but always present them as references — the clinician makes the final call.",
      "Patient identifiers must stay inside the EMR; never copy them into external tools.",
    );
  }

  if (!ctx.ageVerified && ctx.mode === "consumer") {
    guardrails.push(
      "Until the user confirms 21+, do not give purchasing or consumption guidance for THC products."
    );
  }

  return guardrails.map((line, i) => `${i + 1}. ${line}`).join("\n");
}

/**
 * Screen a user message before it is sent to the model. Returns the
 * decision plus a redacted version of the input where sensitive tokens
 * (SSN, phone) are masked.
 */
export function screenInput(
  input: string,
  ctx: GuardrailContext
): GuardrailResult & { redacted: string } {
  const flags: GuardrailFlag[] = [];
  let redacted = input;

  for (const { flag, re, clinicalSafe } of INPUT_PATTERNS) {
    if (re.test(input)) {
      if (ctx.mode === "clinical" && clinicalSafe) continue;
      flags.push(flag);
    }
  }

  // Always strip SSN-shaped tokens regardless of the flag outcome.
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted-id]");

  const blocked = flags.find((f) => HARD_BLOCK.includes(f));
  if (blocked) {
    return {
      allowed: false,
      reason: REASONS[blocked],
      flags,
      redacted,
    };
  }

  // Soft flags — allow but attach a steering reason that the agent
  // should fold into its system prompt.
  const softReason = pickReason(flags, ctx.mode);
  return {
    allowed: true,
    reason: softReason,
    flags,
    redacted,
  };
}

/**
 * Screen a model completion before it is shown to the user. If the
 * model strayed into a hard-block topic, replace the response with the
 * canned reason instead of leaking the unsafe text.
 */
export function screenResponse(
  output: string,
  ctx: GuardrailContext
): GuardrailResult & { safeOutput: string } {
  const flags: GuardrailFlag[] = [];
  for (const { flag, re, clinicalSafe } of OUTPUT_PATTERNS) {
    if (re.test(output)) {
      if (ctx.mode === "clinical" && clinicalSafe) continue;
      flags.push(flag);
    }
  }

  const blocked = flags.find((f) => HARD_BLOCK.includes(f));
  if (blocked) {
    return {
      allowed: false,
      reason: REASONS[blocked],
      flags,
      safeOutput: REASONS[blocked],
    };
  }

  return {
    allowed: true,
    flags,
    safeOutput: output,
  };
}

function pickReason(
  flags: GuardrailFlag[],
  mode: AgentMode
): string | undefined {
  if (flags.length === 0) return undefined;
  for (const f of flags) {
    const clinical = mode === "clinical" ? CLINICAL_REASONS[f] : undefined;
    const reason = clinical ?? REASONS[f];
    if (reason) return reason;
  }
  return undefined;
}

/**
 * Compose a final "blocked" payload used by client surfaces (Ask Cindy,
 * ChatCB) when an input is rejected outright. Centralised so all
 * surfaces format the refusal identically.
 */
export function buildRefusal(result: GuardrailResult): {
  message: string;
  flags: GuardrailFlag[];
} {
  return {
    message:
      result.reason ??
      "I can't help with that here, but a Leafjourney clinician can.",
    flags: result.flags,
  };
}

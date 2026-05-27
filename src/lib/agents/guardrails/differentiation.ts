// ---------------------------------------------------------------------------
// EMR-304 — The single entrypoint every AI surface calls before responding.
// ---------------------------------------------------------------------------
// The contract:
//   1. Run the cannabis-aware safety scanner first. Any emergency hit
//      short-circuits to a "defer → emergency" decision regardless of
//      audience or surface.
//   2. Run the audience/surface scope rules. First match wins.
//   3. If nothing matched, return a default-allow decision so callers
//      can proceed to the model. The decision still carries topic tags
//      so callers can log them.
//
// Callers MUST:
//   - Call `evaluateGuardrails(ctx)` before sending to the model.
//   - When `action === "refuse" | "defer"`, return the refusal copy
//     directly without consulting the LLM.
//   - When `action === "allow"`, prepend `buildSystemPreamble(ctx)` to
//     their existing system prompt so the audience-aware voice + scope
//     constraints are always present.
// ---------------------------------------------------------------------------

import {
  scanForSafetyFlags,
  EMERGENCY_RESPONSE_COPY,
} from "@/lib/agents/safety/cannabis-red-flags";
import type { GuardrailContext, GuardrailDecision } from "./types";
import { evaluateScopeRules } from "./scope-rules";

/**
 * Evaluate a request against all guardrail layers and return a decision.
 * Pure function — no I/O, safe to call from any runtime.
 */
export function evaluateGuardrails(
  ctx: GuardrailContext,
): GuardrailDecision {
  // Layer 1: cannabis-aware safety scanner. Emergencies bypass everything.
  if (ctx.utterance) {
    const scan = scanForSafetyFlags(ctx.utterance);
    if (scan.topTier === "emergency" || scan.topTier === "cannabis_specific") {
      return {
        action: "defer",
        handoffTo: "emergency",
        ruleId: `safety.${scan.hits[0]?.id ?? "tier-" + scan.topTier}`,
        topics: ["self-harm"],
        reason: `Safety scanner matched tier=${scan.topTier} flag=${scan.hits[0]?.id ?? "?"}`,
        refusal: EMERGENCY_RESPONSE_COPY,
      };
    }
  }

  // Layer 2: audience/surface scope rules.
  const scoped = evaluateScopeRules(ctx);
  if (scoped) return scoped;

  // Layer 3: default-allow.
  return {
    action: "allow",
    topics: [],
    ruleId: "default-allow",
    reason: "No guardrail matched — default-allow.",
  };
}

// ---------------------------------------------------------------------------
// System-prompt preamble
// ---------------------------------------------------------------------------
// Every "allow" path prepends this to the agent's existing system prompt.
// Anchors the voice and constraints in the prompt itself so even if a
// downstream rule is missed, the model has the right frame.

const VOICE_BY_AUDIENCE: Record<GuardrailContext["audience"], string> = {
  clinician:
    "You are addressing a licensed clinician. Be clinically precise, cite evidence levels when known, and surface differentials and edge cases. Never invent dosing, lab values, or chart facts not provided in context.",
  consumer:
    "You are addressing a member of the public on a free education surface. Be warm, plain-language, and short. Never give personalized dosing or diagnosis. When relevant, hand off to a clinician on Leafjourney.",
  patient:
    "You are addressing a patient using their own Leafjourney account. Use their first name when natural. Acknowledge briefly, answer concretely, and leave a clear next step (a question, a small adjustment, or a visit offer). Do not diagnose. Escalate red flags to the care team without softening.",
  operator:
    "You are addressing a clinic operator. Stay focused on workflow, billing, and operational data. Refuse clinical recommendations — route those to a clinician.",
};

const SCOPE_RAILS = [
  "Never claim to be human; never use AI filler ('As an AI', 'I'm just a language model').",
  "Never use hollow liability copy ('please consult your doctor') when the user IS our patient — say what you know and offer a real next step.",
  "Never invent medical facts, dosing, lab values, or chart history that isn't in context.",
  "If you are uncertain or the request is outside your scope, say so plainly and hand off.",
];

export function buildSystemPreamble(ctx: GuardrailContext): string {
  const voice = VOICE_BY_AUDIENCE[ctx.audience];
  return [
    `### AUDIENCE — ${ctx.audience.toUpperCase()} on ${ctx.surface}`,
    voice,
    "",
    "### NON-NEGOTIABLES",
    ...SCOPE_RAILS.map((s) => `- ${s}`),
  ].join("\n");
}

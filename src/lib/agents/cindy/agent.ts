// ---------------------------------------------------------------------------
// EMR-309 — Ask Cindy: server-side answer pipeline
// ---------------------------------------------------------------------------
// Public + unauthenticated. Every request goes through the EMR-304
// guardrail layer first. If a highlight id matches the question
// verbatim, we skip the model and return the deterministic answer.
// ---------------------------------------------------------------------------

import { z } from "zod";
import {
  evaluateGuardrails,
  buildSystemPreamble,
} from "@/lib/agents/guardrails";
import { resolveModelClient } from "@/lib/orchestration/model-client";
import {
  CINDY_HIGHLIGHTS,
  buildCindySystemPrompt,
} from "./system-prompt";

export const askCindyInput = z.object({
  question: z.string().min(1).max(500),
  /** Optional id of a highlight chip the user clicked — bypasses the LLM. */
  highlightId: z.string().optional(),
});

export type AskCindyInput = z.infer<typeof askCindyInput>;

export interface AskCindyResult {
  answer: string;
  /** "highlight" → deterministic answer, "guardrail" → refusal/handoff, "model" → live LLM. */
  source: "highlight" | "guardrail" | "model";
  /** Where to send the user next, when applicable. */
  handoff?: { label: string; href: string };
  /** Stable rule id, useful for telemetry. */
  ruleId?: string;
}

/**
 * Run a single Cindy turn. Stateless — chat history is the caller's
 * problem (the widget keeps an in-memory transcript and re-sends it
 * as plain prose).
 */
export async function askCindy(input: AskCindyInput): Promise<AskCindyResult> {
  const parsed = askCindyInput.parse(input);

  // Highlight chip click → deterministic answer.
  if (parsed.highlightId) {
    const hit = CINDY_HIGHLIGHTS.find((h) => h.id === parsed.highlightId);
    if (hit) {
      return { answer: hit.answer, source: "highlight" };
    }
  }

  // Guardrail layer.
  const decision = evaluateGuardrails({
    audience: "consumer",
    surface: "ask-cindy",
    utterance: parsed.question,
    authenticated: false,
  });

  if (decision.action !== "allow") {
    const refusal = decision.refusal?.en ?? "I can't help with that here.";
    const handoff =
      decision.handoffTo === "emergency"
        ? { label: "Call 911 / 988", href: "tel:988" }
        : decision.handoffTo === "human-ops"
          ? { label: "Sign in", href: "/login" }
          : decision.handoffTo === "clinician"
            ? { label: "Find a clinician", href: "/clinicians" }
            : undefined;

    return {
      answer: refusal,
      source: "guardrail",
      ruleId: decision.ruleId,
      handoff,
    };
  }

  // Allow → build the prompt and call the model.
  const preamble = buildSystemPreamble({
    audience: "consumer",
    surface: "ask-cindy",
  });
  const cindyPrompt = buildCindySystemPrompt();
  const fullPrompt = [
    preamble,
    "",
    cindyPrompt,
    "",
    "### USER",
    parsed.question,
    "",
    "### CINDY",
  ].join("\n");

  const client = resolveModelClient();
  const answer = await client.complete(fullPrompt, {
    maxTokens: 240,
    temperature: 0.4,
  });

  return {
    answer: answer.trim(),
    source: "model",
    ruleId: decision.ruleId,
  };
}

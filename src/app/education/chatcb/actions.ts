"use server";

/**
 * ChatCB v0 server action.
 *
 * Public-facing, citation-first conversational search for medical cannabis.
 * v0 scope: call the configured AI client with a hard-coded citation-first
 * system prompt. No PubMed integration, no persistence, no auth — those are
 * follow-on tickets.
 *
 * The shape of the response (`{ content, citations, classification }`) is the
 * contract the UI codes against; later tickets will populate `citations` and
 * `classification` from real sources (PubMed E-utilities, our knowledge base,
 * the MCL positive/negative/neutral classifier).
 */

import { resolveModelClient } from "@/lib/orchestration/model-client";

/** MCL-style cannabis-condition evidence classification. */
export type EvidenceClassification = "positive" | "negative" | "neutral" | "mixed" | "insufficient";

/** A single research citation returned alongside the model response. */
export interface ChatCBCitation {
  id: string;
  title: string;
  source: string;
  url?: string;
  year?: number;
  /** MCL-style label so the UI can color-code by evidence strength. */
  classification: EvidenceClassification;
}

/** A turn in the conversation as the UI hands it to the server. */
export interface ChatCBHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

/** Response contract the `<ChatCBUI>` client component codes against. */
export interface ChatCBResult {
  content: string;
  citations: ChatCBCitation[];
  /**
   * Overall classification for the cannabinoid-condition pair(s) discussed
   * in the response, when one can be inferred. Null for general questions
   * (e.g. "what is a terpene?") where no specific pair applies.
   */
  classification: EvidenceClassification | null;
}

/**
 * Hard-coded citation-first system prompt. Kept short on purpose — long
 * prompts eat the free-tier token budget and make fallbacks more likely.
 */
const CHATCB_SYSTEM_PROMPT = [
  "You are ChatCB, a medical cannabis research assistant.",
  "Always cite sources when available.",
  "For each cannabinoid-condition pair discussed, label as positive/negative/neutral evidence.",
  "Keep plain-language summaries first, research language second.",
  "If you are not sure, say so — never invent a citation.",
  "End with a short reminder that this is not medical advice and the reader should consult a clinician.",
].join(" ");

/**
 * Compose the system prompt, conversation history, and the user's latest
 * query into a single prompt string for the `ModelClient.complete` API.
 *
 * The existing `ModelClient` interface takes a single prompt rather than
 * OpenAI-style message arrays, so we serialize the transcript into a
 * plain-text conversation. Later tickets can swap in a chat-aware client.
 */
function buildPrompt(query: string, history: ChatCBHistoryTurn[]): string {
  const parts: string[] = [CHATCB_SYSTEM_PROMPT, ""];
  for (const turn of history) {
    const label = turn.role === "user" ? "User" : "ChatCB";
    parts.push(`${label}: ${turn.content.trim()}`);
  }
  parts.push(`User: ${query.trim()}`);
  parts.push("ChatCB:");
  return parts.join("\n");
}

/**
 * v0: ask the configured AI client a question. Returns a structured result
 * with empty `citations` and null `classification` — the UI already renders
 * both, but we don't populate them until the PubMed ticket lands.
 */
export async function askChatCB(
  query: string,
  history: ChatCBHistoryTurn[] = [],
): Promise<ChatCBResult> {
  const q = query.trim();
  if (!q) {
    return {
      content: "Ask me anything about medical cannabis and I'll pull the research.",
      citations: [],
      classification: null,
    };
  }

  const prompt = buildPrompt(q, history);
  const model = resolveModelClient();

  try {
    const content = await model.complete(prompt, {
      maxTokens: 800,
      temperature: 0.3,
    });
    return {
      content: content.trim(),
      citations: [],
      classification: null,
    };
  } catch (err) {
    // v0 graceful degradation: surface a friendly message rather than a 500.
    // Later tickets will render structured error states.
    const message = err instanceof Error ? err.message : "unknown error";
    return {
      content:
        `ChatCB couldn't reach the research assistant right now (${message}). ` +
        "Please try again in a moment.",
      citations: [],
      classification: null,
    };
  }
}

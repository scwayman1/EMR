"use server";

// EMR-309 — Server action wrapper around the Cindy agent. Keeps the
// model client off the client bundle. Errors collapse to a friendly
// fallback so the widget never shows raw exceptions.

import { askCindy, type AskCindyResult } from "@/lib/agents/cindy";

export async function askCindyAction(
  question: string,
  highlightId?: string,
): Promise<AskCindyResult> {
  try {
    return await askCindy({ question, highlightId });
  } catch {
    return {
      answer:
        "I had trouble answering that one. Try asking ChatCB on the Education page, or message a clinician from the directory.",
      source: "guardrail",
      ruleId: "fallback.error",
    };
  }
}

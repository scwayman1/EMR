import { z } from "zod";
import type { Agent } from "@/lib/orchestration/types";

// ---------------------------------------------------------------------------
// Content Creation Agent
// ---------------------------------------------------------------------------
// Pure generation: produces educational content about a cannabis topic for a
// given audience and tone. Approval-gated so nothing goes live without a
// human review.
// ---------------------------------------------------------------------------

const input = z.object({
  topic: z.string().min(1),
  audience: z.enum(["patient", "clinician"]),
  tone: z.enum(["warm", "clinical", "educational"]),
});

const output = z.object({
  title: z.string(),
  body: z.string(),
  wordCount: z.number(),
});

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const contentCreationAgent: Agent<
  z.infer<typeof input>,
  z.infer<typeof output>
> = {
  name: "contentCreation",
  version: "1.0.0",
  description:
    "Generates educational content about a cannabis topic for a target " +
    "audience and tone. Approval-gated.",
  inputSchema: input,
  outputSchema: output,
  allowedActions: [],
  requiresApproval: true,

  async run({ topic, audience, tone }, ctx) {
    const audienceGuide =
      audience === "clinician"
        ? "The reader is a clinician. Use precise clinical language, evidence references where appropriate, and mechanistic detail."
        : "The reader is a patient. Use short sentences, friendly language, and avoid jargon. Explain any medical terms.";

    const toneGuide =
      tone === "warm"
        ? "Warm, encouraging, human voice."
        : tone === "clinical"
          ? "Objective, clinical, precise."
          : "Educational, informative, structured.";

    const prompt = `You are a senior medical writer at Leafjourney, a cannabis care practice. Write an educational article.

Topic: ${topic}
Audience: ${audience}
${audienceGuide}
Tone: ${tone}
${toneGuide}

Rules:
- Ground every claim in responsible, evidence-aware language.
- Do not invent citations.
- Avoid overclaiming cannabis benefits — stay balanced.
- 400-700 words for the body.

Return ONLY valid JSON:
{
  "title": "an engaging, specific title",
  "body": "the full article body as plain text with paragraph breaks"
}`;

    let raw = "";
    try {
      raw = await ctx.model.complete(prompt, {
        maxTokens: 1600,
        temperature: 0.6,
      });
    } catch (err) {
      ctx.log("warn", "Content LLM failed — using deterministic template", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    let title: string | null = null;
    let body: string | null = null;

    const jm =
      raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
    if (jm) {
      try {
        const parsed = JSON.parse(jm[1] || jm[0]);
        if (typeof parsed.title === "string") title = parsed.title.trim();
        if (typeof parsed.body === "string") body = parsed.body.trim();
      } catch {
        // ignore
      }
    }

    if (!title || !body) {
      title = `Understanding ${topic}`;
      body = `This article explores ${topic} for a ${audience} audience. Our care team at Leafjourney puts together plain-language education to help patients and clinicians navigate cannabis care with confidence. Stay tuned — a full draft of this piece is being prepared.`;
    }

    const wordCount = countWords(body);

    ctx.log("info", "Content draft generated", {
      topic,
      audience,
      tone,
      wordCount,
    });

    return { title, body, wordCount };
  },
};

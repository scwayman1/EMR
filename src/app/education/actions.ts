"use server";

import { resolveModelClient } from "@/lib/orchestration/model-client";
import {
  buildChatCBSystemPrompt,
  searchKnowledgeBase,
  type Citation,
  type CannabisConditionPair,
} from "@/lib/domain/chatcb";
import { searchPubMed, type PubMedSearchResult } from "@/lib/domain/pubmed";
import { fetchPubMedCitations } from "@/lib/agents/research/pubmed-citation-service";
import {
  getComboWheelCompounds,
  type ComboWheelCompound,
} from "@/lib/domain/combo-wheel";

export type { PubMedSearchResult };

/**
 * Server action returning the active Combo Wheel catalog.
 * Wraps `getComboWheelCompounds` so client components can fetch on mount.
 */
export async function fetchComboWheelCompounds(): Promise<ComboWheelCompound[]> {
  return getComboWheelCompounds();
}

export interface ChatCBResponse {
  answer: string;
  citations: Citation[];
}

/**
 * Server action for PubMed live search.
 * Searches the NLM E-utilities API for cannabis-related articles.
 */
export async function searchPubMedArticles(query: string): Promise<PubMedSearchResult> {
  const q = query.trim();
  if (!q) {
    return { query: q, totalResults: 0, articles: [], searchTime: 0 };
  }
  return searchPubMed(q, 10);
}

/**
 * Server action for the ChatCB cannabis search engine.
 * Calls the model with the system prompt + user question + relevant
 * knowledge base entries as context. Falls back to formatted KB matches.
 */
export async function askChatCB(question: string): Promise<ChatCBResponse> {
  const q = question.trim();
  if (!q) {
    return { answer: "Please enter a question about cannabis medicine.", citations: [] };
  }

  // Pull static knowledge-base matches and live PubMed citations in parallel
  // so the slower network call doesn't serialize behind the local lookup.
  const matches = searchKnowledgeBase(q);
  const pubmedResult = await fetchPubMedCitations(q, { maxResults: 5 }).catch(
    () => ({ query: q, totalResults: 0, citations: [] as Citation[], searchTime: 0 }),
  );

  // Build context from KB matches
  const kbContext =
    matches.length > 0
      ? "\n\nRelevant knowledge base entries:\n" +
        matches
          .map(
            (m) =>
              `- ${m.cannabinoid} for ${m.condition} (${m.evidenceLevel}, ${m.studyCount} studies): ${m.summary}`
          )
          .join("\n")
      : "";

  // Build context from live PubMed hits — gives the model fresh citations
  // it can reference by PMID inline.
  const pubmedContext =
    pubmedResult.citations.length > 0
      ? "\n\nLive PubMed results (cite by PMID when relevant):\n" +
        pubmedResult.citations
          .map(
            (c) =>
              `- [PMID ${c.pmid}] ${c.title} — ${c.journal} ${c.year} (${c.evidenceLevel}): ${c.summary}`
          )
          .join("\n")
      : "";

  const systemPrompt = buildChatCBSystemPrompt();
  const fullPrompt = `${systemPrompt}${kbContext}${pubmedContext}\n\nUser question: ${q}`;

  // Citations: surface live PubMed hits first (fresher, more authoritative),
  // then top up with KB entries up to a cap of 8 total.
  const kbCitations: Citation[] = matches.slice(0, 5).map((m, i) => ({
    id: `kb-${i}`,
    title: `${m.cannabinoid} and ${m.condition}`,
    authors: "Cannabis Knowledge Base",
    journal: "Leafjourney Research Index",
    year: 2025,
    evidenceLevel: m.evidenceLevel,
    studyType: "review" as const,
    summary: m.summary,
  }));

  const citations: Citation[] = [
    ...pubmedResult.citations,
    ...kbCitations,
  ].slice(0, 8);

  try {
    const model = resolveModelClient();
    const answer = await model.complete(fullPrompt, {
      maxTokens: 800,
      temperature: 0.4,
    });
    return { answer, citations };
  } catch {
    // Fallback: format knowledge base matches as a human-readable response
    const fallbackAnswer = buildFallbackResponse(q, matches);
    return { answer: fallbackAnswer, citations };
  }
}

function buildFallbackResponse(
  query: string,
  matches: CannabisConditionPair[]
): string {
  if (matches.length === 0) {
    return (
      `I couldn't find specific information about "${query}" in our cannabis knowledge base. ` +
      `This topic may require further research. Please consult with a qualified healthcare ` +
      `provider who specializes in cannabis medicine for personalized guidance.\n\n` +
      `You can also try searching for specific cannabinoids (THC, CBD, CBN, CBG) or ` +
      `conditions (pain, anxiety, insomnia, epilepsy) for detailed evidence summaries.`
    );
  }

  let response = `Here's what the research says about "${query}":\n\n`;

  for (const m of matches.slice(0, 5)) {
    const levelLabel =
      m.evidenceLevel === "positive"
        ? "Positive evidence"
        : m.evidenceLevel === "negative"
          ? "Negative evidence"
          : m.evidenceLevel === "mixed"
            ? "Mixed results"
            : m.evidenceLevel === "insufficient"
              ? "Insufficient data"
              : "Neutral";

    response += `🌿 ${m.cannabinoid} for ${m.condition} — ${levelLabel}, ${m.studyCount} studies\n`;
    response += `${m.summary}\n\n`;
  }

  response +=
    `🌿\n\nThis information is sourced from our curated cannabis research database. ` +
    `Always consult with a healthcare provider before making any treatment decisions.`;

  return stripStrayMarkdown(response);
}

/**
 * Defensive cleanup for any `**bold**` or `*italic*` artifacts that the
 * upstream LLM occasionally leaks into the chat surface — the chat panel
 * renders raw text, so unparsed asterisks read as literal characters.
 */
function stripStrayMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S[^*]*?\S|\S)\*(?=\s|$|[.,;:!?])/g, "$1$2");
}

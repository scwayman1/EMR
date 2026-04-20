"use server";

import { searchPubMedWithMeta, type PubMedArticle } from "@/lib/domain/pubmed";

export interface ResearchSearchResponse {
  articles: PubMedArticle[];
  totalResults: number;
  error?: string;
}

/**
 * Public-facing research search action. Fetch-on-demand, no database writes.
 * Next.js fetch cache (revalidate: 3600) is applied inside searchPubMedWithMeta.
 */
export async function searchResearch(
  query: string,
  limit: number
): Promise<ResearchSearchResponse> {
  const q = query.trim();
  if (!q) return { articles: [], totalResults: 0 };

  try {
    const result = await searchPubMedWithMeta(q, limit);
    return { articles: result.articles, totalResults: result.totalResults };
  } catch (err) {
    console.error("[research/actions] searchResearch failed:", err);
    return {
      articles: [],
      totalResults: 0,
      error: "PubMed is temporarily unavailable. Please try again in a moment.",
    };
  }
}

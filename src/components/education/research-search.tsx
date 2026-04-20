"use client";

import { useState, useTransition, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { PubMedArticle } from "@/lib/domain/pubmed";

interface ResearchSearchUIProps {
  /**
   * Server action that actually calls PubMed. Passed in from the route so the
   * network fetch happens server-side (no CORS, no key leak, cache applied).
   */
  search: (
    query: string,
    limit: number
  ) => Promise<{ articles: PubMedArticle[]; totalResults: number; error?: string }>;
  /**
   * Default query suggestion shown in the input (e.g. "cannabis chronic pain").
   */
  initialQuery?: string;
}

const DEFAULT_LIMIT = 10;

export function ResearchSearchUI({ search, initialQuery = "" }: ResearchSearchUIProps) {
  const [query, setQuery] = useState(initialQuery);
  const [cannabisFilter, setCannabisFilter] = useState(true);
  const [articles, setArticles] = useState<PubMedArticle[] | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = useCallback(() => {
    const raw = query.trim();
    if (!raw) return;
    const scoped = applyCannabisFilter(raw, cannabisFilter);
    setError(null);
    startTransition(async () => {
      try {
        const result = await search(scoped, DEFAULT_LIMIT);
        setArticles(result.articles);
        setTotalResults(result.totalResults);
        if (result.error) setError(result.error);
      } catch (err) {
        console.error("[ResearchSearchUI] search failed:", err);
        setError("Search failed. Please try again.");
        setArticles([]);
        setTotalResults(0);
      }
    });
  }, [cannabisFilter, query, search]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <Card className="rounded-2xl">
        <CardContent className="pt-6 pb-6">
          <label className="block text-sm font-medium text-text mb-2" htmlFor="pubmed-query">
            Search PubMed
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="pubmed-query"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="e.g. chronic pain, PTSD, epilepsy…"
              className="flex-1 h-12 rounded-xl border border-border-strong bg-white px-4 text-base text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <Button
              onClick={runSearch}
              disabled={!query.trim() || pending}
              className="rounded-xl h-12 px-6"
            >
              {pending ? "Searching…" : "Search"}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCannabisFilter((v) => !v)}
              aria-pressed={cannabisFilter}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                cannabisFilter
                  ? "bg-accent-soft text-accent border-accent/30"
                  : "bg-surface-muted text-text-muted border-border hover:text-text"
              )}
            >
              {cannabisFilter ? "Cannabis scope: ON" : "Cannabis scope: OFF"}
            </button>
            <span className="text-[11px] text-text-subtle">
              Adds <code className="font-mono">cannabis</code> to the query when it&rsquo;s missing.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Card className="rounded-2xl border-l-4 border-l-amber-500">
          <CardContent className="py-4">
            <p className="text-sm text-text">{error}</p>
          </CardContent>
        </Card>
      )}

      {articles !== null && !error && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Badge tone="accent" className="text-xs">
              {totalResults.toLocaleString()} results
            </Badge>
            <span className="text-xs text-text-subtle">
              Showing top {articles.length}
            </span>
          </div>

          {articles.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">
              No articles found. Try a different query or toggle off the cannabis scope.
            </p>
          ) : (
            <ul className="space-y-3 list-none p-0">
              {articles.map((article) => (
                <li key={article.pmid}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: PubMedArticle }) {
  return (
    <Card className="rounded-xl border border-border hover:border-accent/30 transition-colors">
      <CardContent className="py-4">
        <h3 className="text-base font-semibold text-text leading-snug">
          {article.title}
        </h3>
        <p className="text-xs text-text-muted mt-1.5">
          {formatAuthors(article.authors)}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-text-subtle">{article.journal}</span>
          {article.year > 0 && (
            <>
              <span className="text-xs text-text-subtle">&middot;</span>
              <span className="text-xs text-text-subtle">{article.year}</span>
            </>
          )}
          <span className="text-[10px] text-text-subtle ml-auto font-mono">
            PMID: {article.pmid}
          </span>
        </div>
        {article.abstractSnippet && (
          <p className="text-sm text-text-muted mt-3 leading-relaxed">
            {article.abstractSnippet}
          </p>
        )}
        <div className="mt-3">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent hover:underline inline-flex items-center gap-1"
          >
            Read on PubMed <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for tests)
// ─────────────────────────────────────────────────────────────────────────────

export function formatAuthors(authors: string[]): string {
  if (!authors || authors.length === 0) return "Unknown authors";
  if (authors.length <= 3) return authors.join(", ");
  return `${authors.slice(0, 3).join(", ")} et al.`;
}

/**
 * If the toggle is ON and the query doesn't already reference cannabis-related
 * terms, append `cannabis` so the user sees on-topic results.
 */
export function applyCannabisFilter(query: string, enabled: boolean): string {
  if (!enabled) return query;
  const lower = query.toLowerCase();
  const already = /\b(cannabis|cannabinoid|thc|cbd|marijuana|hemp)\b/.test(lower);
  if (already) return query;
  return `${query} cannabis`;
}

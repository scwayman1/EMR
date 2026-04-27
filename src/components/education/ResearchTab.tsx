"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  Search,
  Download,
  BookOpen,
  ExternalLink,
  Loader2,
  FileSearch,
  FlaskConical,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  searchKnowledgeBase,
  getConditions,
  getCannabinoids,
  EVIDENCE_COLORS,
} from "@/lib/domain/chatcb";
import { searchPubMedArticles, type PubMedSearchResult } from "@/app/education/actions";

export function ResearchTab() {
  const [cannabinoidFilter, setCannabinoidFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [pubmedQuery, setPubmedQuery] = useState("");
  const [pubmedResults, setPubmedResults] = useState<PubMedSearchResult | null>(null);
  const [pubmedLoading, setPubmedLoading] = useState(false);
  const conditions = getConditions();
  const cannabinoids = getCannabinoids();

  const results = searchKnowledgeBase(cannabinoidFilter || conditionFilter);
  const filtered = results.filter((r) => {
    if (cannabinoidFilter && !r.cannabinoid.toLowerCase().includes(cannabinoidFilter.toLowerCase())) return false;
    if (conditionFilter && !r.condition.toLowerCase().includes(conditionFilter.toLowerCase())) return false;
    return true;
  });

  async function handlePubmedSearch() {
    const q = pubmedQuery.trim();
    if (!q || pubmedLoading) return;
    setPubmedLoading(true);
    try {
      const result = await searchPubMedArticles(q);
      setPubmedResults(result);
    } catch {
      setPubmedResults({ query: q, totalResults: 0, articles: [], searchTime: 0 });
    } finally {
      setPubmedLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center mb-8">
        <h2 className="font-display text-4xl text-text tracking-tight mb-3">
          Cannabis Research Database
        </h2>
        <p className="text-base text-text-muted max-w-xl mx-auto leading-relaxed">
          Search live PubMed studies, browse 11,000+ peer-reviewed evidence pairs, and explore comprehensive clinical guides.
        </p>
      </div>

      {/* PubMed Live Search */}
      <Card tone="raised" className="rounded-3xl border border-border shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50 via-slate-50 to-emerald-50 border-b border-border py-5 px-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge tone="success" className="text-[10px] bg-emerald-100 text-emerald-800 gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              PubMed API
            </Badge>
            Live Medical Literature Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div
            className={cn(
              "flex flex-col md:flex-row gap-4 rounded-2xl transition-all",
              pubmedLoading && "opacity-90"
            )}
          >
            <div className="relative flex-1 group">
              {pubmedLoading ? (
                <Loader2
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent animate-spin"
                  strokeWidth={2.5}
                />
              ) : (
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-accent transition-colors"
                  strokeWidth={2}
                />
              )}
              <input
                type="text"
                value={pubmedQuery}
                onChange={(e) => setPubmedQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePubmedSearch()}
                disabled={pubmedLoading}
                aria-label="Search PubMed for cannabis research"
                placeholder="Search PubMed for cannabis research (e.g. 'CBD anxiety')..."
                className={cn(
                  "w-full h-14 rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4",
                  "text-base text-text placeholder:text-slate-400",
                  "focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20",
                  "disabled:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400",
                  "transition-all duration-200"
                )}
              />
            </div>
            <Button
              onClick={handlePubmedSearch}
              disabled={!pubmedQuery.trim() || pubmedLoading}
              className="rounded-2xl h-14 px-8 text-base font-semibold shadow-md min-w-[140px]"
            >
              {pubmedLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  Searching
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" strokeWidth={2.5} />
                  Search
                </>
              )}
            </Button>
          </div>

          {pubmedLoading && !pubmedResults && (
            <div className="mt-8 space-y-3 animate-in fade-in">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-50 via-slate-100/50 to-slate-50 bg-[length:200%_100%] animate-pulse h-24"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}

          {pubmedResults && !pubmedLoading && (
            <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge tone="accent" className="text-sm px-3 py-1 gap-1.5">
                  <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                  {pubmedResults.totalResults.toLocaleString()} results found
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  Search completed in {pubmedResults.searchTime}ms
                </span>
              </div>

              {pubmedResults.articles.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-10 text-center border border-dashed border-slate-200">
                  <FileSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-base text-slate-600 font-semibold">
                    No articles found
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Try adjusting your search terms or use broader keywords.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pubmedResults.articles.map((article) => (
                    <Card
                      key={article.pmid}
                      className="rounded-2xl border border-slate-200 hover:border-accent/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
                    >
                      <CardContent className="p-5">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-2 text-base font-semibold text-accent hover:underline leading-snug"
                        >
                          <span className="line-clamp-2">{article.title}</span>
                          <ExternalLink
                            className="w-4 h-4 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            strokeWidth={2.5}
                          />
                        </a>
                        <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                          {article.authors}
                        </p>
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {article.journal}
                          </span>
                          {article.year > 0 && (
                            <Badge tone="neutral" className="text-[10px]">{article.year}</Badge>
                          )}
                          <span className="text-[10px] text-slate-400 ml-auto font-mono">
                            PMID: {article.pmid}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Featured Resource: Justin Kander's Book */}
      <Card className="rounded-3xl border-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-2xl overflow-hidden relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="w-48 h-48" />
        </div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 right-1/3 w-72 h-72 bg-purple-300/10 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-8 relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-40 bg-white/15 rounded-lg shadow-2xl flex-shrink-0 border border-white/30 flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
            <BookOpen className="w-12 h-12 text-white/80 z-0" strokeWidth={1.5} />
            <span className="absolute bottom-4 left-0 right-0 text-center text-xs font-bold tracking-widest uppercase z-20">
              Cannabis<br />& Cancer
            </span>
          </div>
          <div className="flex-1 text-center md:text-left">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-white/20 mb-4 backdrop-blur-md gap-1.5">
              <Sparkles className="w-3 h-3" strokeWidth={2.5} />
              Featured Research PDF
            </Badge>
            <h3 className="font-display text-3xl mb-3 tracking-tight">Cannabis and Cancer</h3>
            <p className="text-indigo-100 text-base leading-relaxed mb-6 max-w-lg">
              By Justin Kander. A comprehensive compilation of human cases and research demonstrating the interaction between cannabinoids and cancer.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl",
                  "bg-white text-indigo-700 font-semibold text-sm shadow-lg shadow-indigo-900/30",
                  "hover:bg-indigo-50 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600",
                  "transition-all duration-200"
                )}
              >
                <Download className="w-4 h-4" strokeWidth={2.5} />
                Download PDF
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl",
                  "bg-white/10 text-white font-semibold text-sm border border-white/40 backdrop-blur-md",
                  "hover:bg-white/20 hover:border-white/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600",
                  "transition-all duration-200"
                )}
              >
                <ExternalLink className="w-4 h-4" strokeWidth={2.5} />
                Read Web Version
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base Browser */}
      <div>
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h3 className="font-display text-2xl text-text tracking-tight">Evidence Database</h3>
            <p className="text-sm text-text-muted mt-1">
              Curated cannabinoid–condition pairs with evidence levels.
            </p>
          </div>
          {(cannabinoidFilter || conditionFilter) && (
            <button
              type="button"
              onClick={() => {
                setCannabinoidFilter("");
                setConditionFilter("");
              }}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-8 items-stretch md:items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex-1 w-full relative">
            <FlaskConical
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              strokeWidth={2}
            />
            <select
              id="kb-cannabinoid"
              value={cannabinoidFilter}
              onChange={(e) => setCannabinoidFilter(e.target.value)}
              aria-label="Filter by cannabinoid"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-9 h-12 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 appearance-none transition-colors hover:bg-white"
            >
              <option value="">All Cannabinoids</option>
              {cannabinoids.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 w-full relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              strokeWidth={2}
            />
            <select
              id="kb-condition"
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              aria-label="Filter by condition"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-9 h-12 text-sm font-medium text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 appearance-none transition-colors hover:bg-white"
            >
              <option value="">All Conditions</option>
              {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="w-full md:w-auto px-4 h-12 flex items-center justify-center bg-accent/10 rounded-xl border border-accent/20">
            <span className="text-sm font-bold text-accent">
              {filtered.length}
              <span className="font-medium text-accent/70 ml-1">
                {filtered.length === 1 ? "pair" : "pairs"}
              </span>
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-base text-slate-600 font-semibold">No evidence pairs match your filters</p>
            <p className="text-sm text-slate-400 mt-1">Try widening your search by clearing one of the filters above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((pair, i) => {
              const ev = EVIDENCE_COLORS[pair.evidenceLevel];
              return (
                <Card
                  key={i}
                  className={cn(
                    "rounded-2xl border-2 border-transparent transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-lg hover:border-accent/30",
                    ev.bg
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-display text-text mb-2 leading-snug">
                          {pair.cannabinoid}
                          <span className="text-slate-400 font-sans text-sm mx-1.5">for</span>
                          {pair.condition}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                          {pair.summary}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                            "px-2.5 py-1 rounded-full border",
                            ev.bg,
                            ev.text,
                            "border-current/20 ring-1 ring-white/60"
                          )}
                          aria-label={ev.label}
                        >
                          <span aria-hidden className="text-xs leading-none">{ev.emoji}</span>
                          {ev.label}
                        </span>
                        <div className="bg-white/70 px-2.5 py-1 rounded-md border border-black/5 backdrop-blur-sm">
                          <p className="text-[11px] font-bold text-slate-700">
                            {pair.studyCount.toLocaleString()}
                            <span className="font-medium text-slate-500 ml-1">studies</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

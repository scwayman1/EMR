"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Atom,
  Pill,
  BookOpen,
  GraduationCap,
  Search,
  ArrowRight,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/ornament";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { cn } from "@/lib/utils/cn";
import {
  searchKnowledgeBase,
  getConditions,
  getCannabinoids,
  EVIDENCE_COLORS,
  type ChatCBMessage,
} from "@/lib/domain/chatcb";
import { askChatCB, searchPubMedArticles, type PubMedSearchResult } from "./actions";

/* ── Tabs ────────────────────────────────────────────────── */

type Tab = "chatcb" | "wheel" | "drugmix" | "research" | "learn";

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: "chatcb", label: "ChatCB", Icon: Sparkles },
  { key: "wheel", label: "Cannabinoid Profiles", Icon: Atom },
  { key: "drugmix", label: "Drug Mix", Icon: Pill },
  { key: "research", label: "Research", Icon: BookOpen },
  { key: "learn", label: "Learn", Icon: GraduationCap },
];

const SUGGESTED_QUESTIONS = [
  "Is CBD good for anxiety?",
  "THC vs CBD for pain",
  "Cannabis and sleep",
  "Drug interactions with warfarin",
  "What are terpenes?",
  "Cannabis for PTSD",
];

/* ── Cannabinoid wheel data ─────────────────────────────── */
const CANNABINOIDS = [
  { name: "THC", color: "bg-amber-600", effects: "Pain relief, appetite, sleep, euphoria", risks: "Anxiety at high doses, impaired cognition, dependency risk" },
  { name: "CBD", color: "bg-emerald-600", effects: "Anxiety reduction, anti-inflammatory, seizure control", risks: "Fatigue, diarrhea, liver enzyme changes at high doses" },
  { name: "CBN", color: "bg-purple-600", effects: "Mild sedation, potential sleep aid", risks: "Limited research, may cause drowsiness" },
  { name: "CBG", color: "bg-blue-600", effects: "Anti-inflammatory, neuroprotective (preclinical)", risks: "Very limited clinical data" },
  { name: "THCV", color: "bg-rose-600", effects: "Appetite suppression, energy, focus", risks: "May reduce THC effects, limited studies" },
  { name: "CBC", color: "bg-teal-600", effects: "Anti-inflammatory, antidepressant (preclinical)", risks: "Insufficient human data" },
];

/* ── Learn topics ───────────────────────────────────────── */
const LEARN_TOPICS = [
  { title: "What is CBD?", desc: "A beginner's guide to cannabidiol — the non-psychoactive cannabinoid.", href: "/portal/education" },
  { title: "How to dose cannabis", desc: "Start low, go slow. Learn the principles of safe cannabis dosing.", href: "/portal/dosing" },
  { title: "Routes of administration", desc: "Oral, sublingual, inhaled, topical — which is right for you?", href: "/portal/education" },
  { title: "Understanding terpenes", desc: "The aromatic compounds that shape each strain's effects.", href: "/portal/education" },
  { title: "Cannabis and your medications", desc: "Important drug interactions every patient should know.", href: "/portal/education" },
  { title: "Legal considerations", desc: "State laws, federal status, and what it means for you.", href: "/portal/qa" },
];

/* ════════════════════════════════════════════════════════════
   Page component
   ════════════════════════════════════════════════════════════ */

export default function EducationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chatcb");

  return (
    <div className="min-h-screen bg-bg">
      <SiteHeader />

      {/* Hero */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-10 pb-8 text-center">
        <Eyebrow className="justify-center mb-4">Evidence-based knowledge</Eyebrow>
        <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-text">
          Cannabis Education
        </h1>
        <p className="text-lg text-text-muted mt-4 max-w-2xl mx-auto leading-relaxed">
          For patients, providers, and researchers. Search 11,000+ studies,
          explore cannabinoid science, and check drug interactions — all free,
          no login required.
        </p>
      </div>

      {/* Sticky pill nav */}
      <div className="sticky top-16 z-20 backdrop-blur-lg bg-bg/80 border-b border-border">
        <div className="max-w-[1320px] mx-auto px-6 lg:px-12">
          <div
            role="tablist"
            aria-label="Education sections"
            className="flex items-center gap-1.5 overflow-x-auto py-3 -mb-px scrollbar-thin"
          >
            {TABS.map((tab) => {
              const Icon = tab.Icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-all whitespace-nowrap border",
                    active
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-surface text-text-muted border-border hover:text-text hover:border-accent/40"
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-12 py-10">
        {activeTab === "chatcb" && <ChatCBTab />}
        {activeTab === "wheel" && <WheelTab />}
        {activeTab === "drugmix" && <DrugMixTab />}
        {activeTab === "research" && <ResearchTab />}
        {activeTab === "learn" && <LearnTab />}
      </div>

      <SiteFooter />
    </div>
  );
}

/* ── ChatCB Tab ─────────────────────────────────────────── */

function ChatCBTab() {
  const [messages, setMessages] = useState<ChatCBMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    const userMsg: ChatCBMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: q,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await askChatCB(q);
      const assistantMsg: ChatCBMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.answer,
        citations: result.citations,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {messages.length === 0 ? (
        /* Empty state with search */
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent mb-5">
            <Sparkles className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-3xl text-text tracking-tight mb-2">
            ChatCB
          </h2>
          <p className="text-text-muted mb-8 max-w-md mx-auto">
            Ask anything about cannabis medicine. Powered by 11,000+
            peer-reviewed research papers.
          </p>

          {/* Search input */}
          <div className="max-w-lg mx-auto mb-8">
            <div className="relative">
              <Search
                className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Ask anything about cannabis medicine..."
                className="w-full h-14 rounded-2xl border border-border-strong bg-white pl-12 pr-14 text-base text-text shadow-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                aria-label="Ask"
                className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Suggested questions */}
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                className="text-sm px-4 py-2 rounded-full border border-border bg-white text-text-muted hover:border-accent hover:text-accent transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Chat messages */
        <div className="space-y-6 mb-6">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-5 py-4",
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-white border border-border shadow-sm"
              )}>
                <p className={cn(
                  "text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === "user" ? "text-white" : "text-text"
                )}>
                  {msg.content}
                </p>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">Sources</p>
                    {msg.citations.map((c) => {
                      const ev = EVIDENCE_COLORS[c.evidenceLevel];
                      return (
                        <div key={c.id} className={cn("rounded-lg px-3 py-2 text-xs", ev.bg)}>
                          <div className="flex items-center gap-2">
                            <span className={cn("font-semibold", ev.text)}>{ev.emoji}</span>
                            <span className="font-medium text-text">{c.title}</span>
                            <Badge className="text-[9px] ml-auto" tone="neutral">{ev.label}</Badge>
                          </div>
                          <p className="text-text-muted mt-1 leading-relaxed">{c.summary.slice(0, 150)}...</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-border rounded-2xl px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="animate-pulse">Researching</span>
                  <span className="animate-bounce">...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input bar (when chat is active) */}
      {messages.length > 0 && (
        <div className="sticky bottom-4">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask a follow-up..."
              className="w-full h-14 rounded-2xl border border-border-strong bg-white pl-5 pr-14 text-base text-text shadow-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              aria-label="Send"
              className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          <p className="text-center text-[10px] text-text-subtle mt-2">
            ChatCB by Leafjourney &middot; Not medical advice &middot; Always consult your provider
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Cannabis Wheel Tab ─────────────────────────────────── */

function WheelTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = CANNABINOIDS.find((c) => c.name === selected);

  return (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="Cannabinoid Profiles"
        subtitle="Tap a cannabinoid to learn about its effects and considerations."
      />

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {CANNABINOIDS.map((c) => (
          <button
            key={c.name}
            onClick={() => setSelected(selected === c.name ? null : c.name)}
            aria-pressed={selected === c.name}
            className={cn(
              "h-24 w-24 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all hover:scale-110 active:scale-95",
              c.color,
              selected === c.name && "ring-4 ring-offset-2 ring-accent scale-110"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {sel && (
        <Card tone="raised" className="rounded-2xl animate-in fade-in">
          <CardContent className="pt-6 pb-6">
            <h3 className="font-display text-xl text-text mb-4">{sel.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                  Therapeutic effects
                </p>
                <p className="text-sm text-text leading-relaxed">{sel.effects}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">
                  Risks & considerations
                </p>
                <p className="text-sm text-text leading-relaxed">{sel.risks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center mt-6">
        <Link href="/clinic/research/combo-wheel">
          <Button variant="secondary">
            Open full interactive wheel
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-8">
      <h2 className="font-display text-3xl text-text tracking-tight mb-2">
        {title}
      </h2>
      <p className="text-sm text-text-muted max-w-xl mx-auto leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

/* ── Drug Mix Tab ───────────────────────────────────────── */

function DrugMixTab() {
  const [meds, setMeds] = useState("");
  const [results, setResults] = useState<any[] | null>(null);

  async function checkMix() {
    // Import the check function dynamically (it uses a JSON data file)
    const { checkInteractions } = await import("@/lib/domain/drug-interactions");
    const medList = meds.split("\n").map((m) => m.trim()).filter(Boolean);
    const cannabinoids = ["THC", "CBD", "CBN"];
    const interactions = checkInteractions(medList, cannabinoids);
    setResults(interactions);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <SectionHeader
        title="Drug Interaction Checker"
        subtitle="Check how your medications interact with cannabis cannabinoids (THC, CBD, CBN)."
      />

      <Card tone="raised" className="rounded-2xl mb-6">
        <CardContent className="pt-6 pb-6">
          <label
            htmlFor="drugmix-meds"
            className="block text-sm font-medium text-text mb-2"
          >
            Your current medications
          </label>
          <textarea
            id="drugmix-meds"
            value={meds}
            onChange={(e) => setMeds(e.target.value)}
            placeholder={"Enter one medication per line, e.g.:\nWarfarin\nMetformin\nLisinopril"}
            rows={5}
            className="w-full rounded-xl border border-border-strong bg-white px-4 py-3 text-base text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <Button onClick={checkMix} disabled={!meds.trim()} className="mt-4 rounded-xl">
            Check interactions
          </Button>
        </CardContent>
      </Card>

      {results !== null && (
        <div className="space-y-3">
          {results.length === 0 ? (
            <Card className="rounded-2xl border-l-4 border-l-emerald-400">
              <CardContent className="py-5">
                <p className="text-sm font-medium text-emerald-700">No known interactions found</p>
                <p className="text-xs text-text-muted mt-1">Based on our database. Always inform your provider about all medications.</p>
              </CardContent>
            </Card>
          ) : (
            results.map((ix, i) => (
              <Card key={i} className={cn(
                "rounded-2xl border-l-4",
                ix.severity === "red" ? "border-l-red-500 bg-red-50/30" :
                ix.severity === "yellow" ? "border-l-amber-500 bg-amber-50/30" :
                "border-l-emerald-400"
              )}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone={ix.severity === "red" ? "danger" : ix.severity === "yellow" ? "warning" : "success"}>
                      {ix.severity}
                    </Badge>
                    <span className="text-sm font-medium text-text">{ix.drug} + {ix.cannabinoid}</span>
                  </div>
                  <p className="text-sm text-text-muted">{ix.mechanism}</p>
                  <p className="text-xs text-text-subtle mt-1">Recommendation: {ix.recommendation}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Research Tab ───────────────────────────────────────── */

function ResearchTab() {
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
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Cannabis Research Database"
        subtitle="Browse cannabinoid-condition evidence pairs from 11,000+ peer-reviewed publications."
      />

      {/* PubMed Live Search */}
      <Card tone="raised" className="rounded-2xl mb-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Badge tone="success" className="text-[10px]">PubMed</Badge>
            Live PubMed search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={pubmedQuery}
                onChange={(e) => setPubmedQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePubmedSearch()}
                placeholder="Search PubMed for cannabis research..."
                className="w-full h-12 rounded-xl border border-border-strong bg-white pl-11 pr-4 text-base text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <Button
              onClick={handlePubmedSearch}
              disabled={!pubmedQuery.trim() || pubmedLoading}
              className="rounded-xl h-12 px-6"
            >
              {pubmedLoading ? "Searching..." : "Search"}
            </Button>
          </div>

          {pubmedResults && (
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge tone="accent" className="text-xs">
                  {pubmedResults.totalResults.toLocaleString()} results
                </Badge>
                <span className="text-xs text-text-subtle">
                  Search completed in {pubmedResults.searchTime}ms
                </span>
              </div>

              {pubmedResults.articles.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">
                  No articles found. Try a different search term.
                </p>
              ) : (
                <div className="space-y-3">
                  {pubmedResults.articles.map((article) => (
                    <Card key={article.pmid} className="rounded-xl border border-border hover:border-accent/30 transition-colors">
                      <CardContent className="py-4">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-accent hover:underline leading-snug"
                        >
                          {article.title}
                        </a>
                        <p className="text-xs text-text-muted mt-1.5">
                          {article.authors}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-text-subtle">{article.journal}</span>
                          {article.year > 0 && (
                            <Badge tone="neutral" className="text-[9px]">{article.year}</Badge>
                          )}
                          <span className="text-[10px] text-text-subtle ml-auto font-mono">
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

      {/* Existing Knowledge Base Browser */}
      <h3 className="font-display text-xl text-text tracking-tight mb-4">Knowledge base</h3>

      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <label htmlFor="kb-cannabinoid" className="sr-only">
          Filter by cannabinoid
        </label>
        <select
          id="kb-cannabinoid"
          value={cannabinoidFilter}
          onChange={(e) => setCannabinoidFilter(e.target.value)}
          className="rounded-xl border border-border-strong bg-white px-4 h-10 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          <option value="">All cannabinoids</option>
          {cannabinoids.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label htmlFor="kb-condition" className="sr-only">
          Filter by condition
        </label>
        <select
          id="kb-condition"
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="rounded-xl border border-border-strong bg-white px-4 h-10 text-sm text-text focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        >
          <option value="">All conditions</option>
          {conditions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-text-muted ml-auto">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </span>
      </div>

      <div className="space-y-3">
        {filtered.map((pair, i) => {
          const ev = EVIDENCE_COLORS[pair.evidenceLevel];
          return (
            <Card
              key={i}
              className={cn(
                "rounded-2xl border border-border/60 hover:border-accent/30 transition-colors",
                ev.bg
              )}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-text">
                      {pair.cannabinoid} for {pair.condition}
                    </p>
                    <p className="text-sm text-text-muted mt-1 leading-relaxed">
                      {pair.summary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={cn("text-[10px]", ev.text)} tone="neutral">
                      {ev.label}
                    </Badge>
                    <p className="text-xs font-medium text-text-subtle mt-1.5">
                      {pair.studyCount} studies
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Learn Tab ──────────────────────────────────────────── */

function LearnTab() {
  return (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="Learn About Cannabis"
        subtitle="Educational resources for patients, caregivers, and curious minds."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LEARN_TOPICS.map((topic) => (
          <Link key={topic.title} href={topic.href} className="group">
            <Card
              tone="raised"
              className="rounded-2xl card-hover hover:border-accent/30 transition-all h-full"
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-lg text-text tracking-tight pt-1">
                    {topic.title}
                  </h3>
                </div>
                <p className="text-sm text-text-muted leading-relaxed">
                  {topic.desc}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Read more <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href="/portal/education">
          <Button variant="secondary">
            Browse full education library
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

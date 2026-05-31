"use client";

// EMR-018 — Strain Finder.
//
// Matches a free-text symptom (sleep, anxiety, pain, cancer, …) to flower
// strains from the Leafly-backed catalog, showing each strain's terpene and
// cannabinoid profile so patients and clinicians can see *why* it matches.
// Pure, client-side matching — no PHI captured.

import React, { useMemo, useState } from "react";
import { Search, Leaf, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  matchStrainsToSymptom,
  listCoveredConditions,
  type StrainMatch,
} from "@/lib/integrations/leafly-client";

const SUGGESTED = ["sleep", "anxiety", "pain", "stress", "cancer", "depression"];

export function StrainFinder() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const conditions = useMemo(() => listCoveredConditions(), []);
  const matches: StrainMatch[] = useMemo(
    () => (submitted ? matchStrainsToSymptom(submitted) : []),
    [submitted],
  );

  function run(q?: string) {
    const term = (q ?? query).trim();
    if (!term) return;
    if (q) setQuery(q);
    setSubmitted(term);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-accent/10 text-accent mb-5 shadow-sm">
          <Leaf className="w-8 h-8" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2 className="font-display text-4xl text-text tracking-tight mb-3">
          Strain Finder
        </h2>
        <p className="text-base text-text-muted max-w-xl mx-auto leading-relaxed">
          Tell us what you&apos;re trying to manage and we&apos;ll match flower
          strains by their terpene and cannabinoid profile.
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="relative bg-white p-2 rounded-2xl shadow-lg border border-slate-200 flex items-center">
          <Search className="w-5 h-5 text-slate-400 ml-3 mr-1" strokeWidth={2} aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            aria-label="Search strains by symptom"
            placeholder="e.g. trouble sleeping, anxiety, chronic pain…"
            className="flex-1 h-12 bg-transparent text-base text-text placeholder:text-slate-400 focus:outline-none"
          />
          <Button onClick={() => run()} disabled={!query.trim()} className="rounded-xl h-12 px-6">
            Find strains
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => run(s)}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-accent transition-all capitalize"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {submitted && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {matches.length === 0 ? (
            <Card className="rounded-2xl border border-border">
              <CardContent className="p-10 text-center">
                <p className="text-base font-semibold text-text">
                  No strains matched &ldquo;{submitted}&rdquo;
                </p>
                <p className="text-sm text-text-muted mt-2">
                  Try one of these conditions:{" "}
                  {conditions.slice(0, 8).join(", ")}.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-center text-sm text-text-muted mb-6">
                {matches.length} strain{matches.length === 1 ? "" : "s"} commonly
                used for{" "}
                <span className="font-semibold text-text">
                  {matches[0].matchedCondition}
                </span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((strain) => (
                  <Card
                    key={strain.slug}
                    className="rounded-2xl border border-slate-200 hover:border-accent/50 hover:shadow-lg transition-all"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-display text-xl text-text tracking-tight">
                            {strain.name}
                          </h3>
                          <Badge tone="neutral" className="mt-1 text-[10px]">
                            {strain.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-accent text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
                          {strain.matchScore}% match
                        </div>
                      </div>

                      {strain.summary && (
                        <p className="text-sm text-text-muted leading-relaxed mb-4">
                          {strain.summary}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                        <ProfileStat label="THC" value={`${strain.thcLevel}%`} />
                        <ProfileStat label="CBD" value={`${strain.cbdLevel}%`} />
                      </div>

                      <div className="space-y-2">
                        <ChipRow
                          label="Terpenes"
                          items={strain.terpenes ?? [strain.dominantTerpene]}
                          tone="accent"
                        />
                        <ChipRow label="Effects" items={strain.effects} tone="muted" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <p className="max-w-2xl mx-auto text-center text-xs text-text-muted leading-relaxed">
        For education only. Strain effects vary by individual, batch, and dose.
        Always discuss cannabis use with your care team.
      </p>
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
        {label}
      </div>
      <div className="text-sm font-bold text-text mt-0.5">{value}</div>
    </div>
  );
}

function ChipRow({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "accent" | "muted";
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pt-1 w-16 shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it}
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full",
              tone === "accent"
                ? "bg-accent/10 text-accent"
                : "bg-slate-100 text-slate-600",
            )}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

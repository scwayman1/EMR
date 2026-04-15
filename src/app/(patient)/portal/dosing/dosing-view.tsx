"use client";

import { useState, useTransition, useEffect } from "react";
import { generateDosingRecommendation, type DosingResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeafSprig, EditorialRule } from "@/components/ui/ornament";

export function DosingView() {
  const [result, setResult] = useState<DosingResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [autoRan, setAutoRan] = useState(false);

  useEffect(() => {
    if (autoRan) return;
    setAutoRan(true);
    startTransition(async () => {
      const r = await generateDosingRecommendation();
      setResult(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegenerate() {
    startTransition(async () => {
      const r = await generateDosingRecommendation();
      setResult(r);
    });
  }

  // Loading
  if (isPending && !result) {
    return (
      <Card tone="ambient" className="text-center py-20">
        <CardContent>
          <div className="flex flex-col items-center gap-5">
            <LeafSprig size={32} className="text-accent animate-pulse" />
            <div>
              <p className="font-display text-xl text-text">
                Building your dosing plan...
              </p>
              <p className="text-sm text-text-muted mt-2">
                We are reviewing your chart, medications, and outcomes to
                create a personalized recommendation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error
  if (result && !result.ok) {
    return (
      <Card tone="raised" className="border-l-4 border-l-danger">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-danger mb-4">{result.error}</p>
          <Button onClick={handleRegenerate} variant="secondary">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result?.recommendation) return null;
  const rec = result.recommendation;

  return (
    <div className="space-y-8">
      {/* ── Experience level badge ─────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <Badge tone={rec.experienceLevel === "naive" ? "neutral" : "accent"}>
          {rec.experienceLevel === "naive" ? "Cannabis-new" : "Has prior experience"}
        </Badge>
      </div>

      {/* ── Recommendation cards ───────────────────── */}
      {rec.recommendations.map((r, i) => (
        <Card key={i} tone="raised" className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge tone="accent">{r.productType}</Badge>
              <Badge tone="neutral">{r.route}</Badge>
            </div>
            <CardTitle className="text-2xl">
              Recommended starting plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Starting dose ──────────────────── */}
            <div className="rounded-xl bg-accent-soft border border-accent/15 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <LeafSprig size={16} className="text-accent/70" />
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                  Your starting dose
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 border border-accent/15">
                  <span className="font-display text-lg text-accent tabular-nums font-medium">
                    {r.startingDose.thcMg}
                  </span>
                  <span className="text-xs text-accent">mg THC</span>
                </span>
                <span className="text-text-subtle text-sm">+</span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 border border-highlight/15">
                  <span className="font-display text-lg text-[color:var(--highlight)] tabular-nums font-medium">
                    {r.startingDose.cbdMg}
                  </span>
                  <span className="text-xs text-[color:var(--highlight)]">mg CBD</span>
                </span>
              </div>
              <p className="text-sm text-text-muted">
                <strong>{r.startingDose.frequency}</strong> &mdash; {r.startingDose.timing}
              </p>
            </div>

            {/* ── Titration schedule ─────────────── */}
            {r.titrationSchedule.length > 0 && (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-4">
                  Your 4-week plan
                </p>
                <div className="space-y-3">
                  {r.titrationSchedule.map((week) => (
                    <div
                      key={week.week}
                      className="flex items-start gap-4 p-4 rounded-lg bg-surface-muted/60 border border-border/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accent/30 bg-accent-soft/50 text-accent text-xs font-medium">
                        W{week.week}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-text tabular-nums">
                            {week.thcMg}mg THC + {week.cbdMg}mg CBD
                          </span>
                          <span className="text-xs text-text-subtle">
                            {week.frequency}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted">{week.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Max dose ──────────────────────── */}
            <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-highlight-soft/40 border border-highlight/20">
              <span className="text-[10px] uppercase tracking-wider text-[color:var(--highlight-hover)] font-medium">
                Max recommended
              </span>
              <span className="font-display text-lg tabular-nums text-text">
                {r.maxRecommendedDose.thcMgPerDay}
                <span className="text-xs text-text-muted ml-1">mg THC/day</span>
              </span>
              <span className="font-display text-lg tabular-nums text-text">
                {r.maxRecommendedDose.cbdMgPerDay}
                <span className="text-xs text-text-muted ml-1">mg CBD/day</span>
              </span>
            </div>

            {/* ── Patient instructions ──────────── */}
            {r.patientInstructions && (
              <div className="rounded-xl bg-surface border border-border/60 px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-2">
                  In your own words
                </p>
                <p className="text-[15px] text-text leading-relaxed">
                  {r.patientInstructions}
                </p>
              </div>
            )}

            {/* ── Rationale ─────────────────────── */}
            <div className="pl-4 border-l-2 border-accent/25">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-subtle mb-1">
                Why this recommendation
              </p>
              <p className="text-sm text-text-muted">{r.rationale}</p>
            </div>

            {/* ── Warnings ──────────────────────── */}
            {r.warnings.length > 0 && (
              <div className="rounded-xl bg-[#B83B2E]/5 border border-[#B83B2E]/10 px-5 py-4">
                <p className="text-sm font-medium text-[#B83B2E] mb-2">
                  Things to know
                </p>
                <ul className="space-y-1">
                  {r.warnings.map((w, j) => (
                    <li key={j} className="text-sm text-text-muted flex items-start gap-2">
                      <span className="text-[#B83B2E] mt-0.5 shrink-0">&bull;</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <EditorialRule />

      {/* ── General guidance ────────────────────────── */}
      <Card tone="ambient" className="text-center">
        <CardContent className="py-8">
          <LeafSprig size={24} className="text-accent mx-auto mb-4" />
          <p className="text-[15px] text-text-muted leading-relaxed max-w-lg mx-auto">
            {rec.generalGuidance}
          </p>
        </CardContent>
      </Card>

      {/* ── When to contact ─────────────────────────── */}
      {rec.whenToContact.length > 0 && (
        <Card tone="raised" className="border-l-4 border-l-accent">
          <CardContent className="py-8 px-6 md:px-8">
            <h2 className="font-display text-xl text-text tracking-tight mb-5">
              Reach out to your care team if...
            </h2>
            <ul className="space-y-3">
              {rec.whenToContact.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-text-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-xs font-medium mt-0.5">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 print:hidden">
        <Button onClick={() => window.print()} variant="primary">
          Print this plan
        </Button>
        <Button onClick={handleRegenerate} variant="secondary" disabled={isPending}>
          {isPending ? "Building..." : "Generate a new recommendation"}
        </Button>
      </div>

      {/* ── Understanding Your Dose ────────────────── */}
      <Card className="border-l-4 border-l-amber-400/60 bg-amber-50/30">
        <CardContent className="py-4 px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 mb-2">
            Understanding your dose
          </p>
          <p className="text-sm text-text-muted leading-relaxed">
            Exact cannabinoid content varies by batch as a result of the whole
            plant infusion process. Please reference the product&apos;s unique
            batch label for lab results.
          </p>
        </CardContent>
      </Card>

      {/* ── Disclaimer ──────────────────────────────── */}
      <div className="text-center space-y-1">
        <p className="text-[11px] text-text-subtle">
          Generated for {rec.patientName} on{" "}
          {new Date(rec.generatedAt).toLocaleString()} ·{" "}
          {(result.durationMs / 1000).toFixed(1)}s
        </p>
        <p className="text-[11px] text-text-subtle max-w-md mx-auto">
          This is a recommendation, not a prescription. Your care team will
          review and finalize your dosing plan.
        </p>
      </div>
    </div>
  );
}

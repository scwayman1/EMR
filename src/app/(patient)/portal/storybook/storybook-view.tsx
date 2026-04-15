"use client";

import { useState, useTransition, useEffect } from "react";
import { generateFairytale, type FairytaleResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeafSprig, EditorialRule } from "@/components/ui/ornament";

export function StorybookView() {
  const [result, setResult] = useState<FairytaleResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [autoRan, setAutoRan] = useState(false);

  // Auto-generate on first mount
  useEffect(() => {
    if (autoRan) return;
    setAutoRan(true);
    startTransition(async () => {
      const r = await generateFairytale();
      setResult(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRegenerate() {
    startTransition(async () => {
      const r = await generateFairytale();
      setResult(r);
    });
  }

  // ── Loading state ────────────────────────────────────────────────
  if (isPending && !result) {
    return (
      <Card tone="ambient" className="text-center py-20">
        <CardContent>
          <div className="flex flex-col items-center gap-5">
            <LeafSprig size={32} className="text-accent animate-pulse" />
            <div>
              <p className="font-display text-xl text-text">
                Writing your story...
              </p>
              <p className="text-sm text-text-muted mt-2">
                The agent is gathering your chart and turning it into a chapter
                of your journey.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error state ──────────────────────────────────────────────────
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

  if (!result?.story) return null;
  const { story } = result;

  // ── Rendered story ───────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* Title page */}
      <Card tone="ambient" className="text-center py-16 print:break-after-page">
        <CardContent>
          <div className="flex flex-col items-center gap-5">
            <LeafSprig size={36} className="text-accent" />
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-text-subtle">
              A care story
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-text tracking-tight leading-tight max-w-2xl">
              {story.title}
            </h1>
            <EditorialRule className="w-32 mt-3" />
          </div>
        </CardContent>
      </Card>

      {/* Opening line */}
      <p className="font-display text-2xl md:text-3xl text-text leading-snug italic text-center max-w-2xl mx-auto px-6">
        &ldquo;{story.openingLine}&rdquo;
      </p>

      <EditorialRule />

      {/* Chapters */}
      <div className="space-y-12 max-w-2xl mx-auto px-6">
        {story.chapters.map((chapter, i) => (
          <article key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-display text-3xl text-accent/40">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.16em] text-accent">
                  Chapter {i + 1}
                </p>
                <h2 className="font-display text-2xl text-text tracking-tight">
                  {chapter.heading}
                </h2>
              </div>
            </div>
            <p className="text-[17px] text-text-muted leading-relaxed first-letter:font-display first-letter:text-4xl first-letter:text-accent first-letter:float-left first-letter:mr-2 first-letter:mt-1">
              {chapter.body}
            </p>
          </article>
        ))}
      </div>

      <EditorialRule />

      {/* Closing line */}
      <p className="font-display text-xl md:text-2xl text-text leading-snug italic text-center max-w-xl mx-auto px-6">
        &mdash; {story.closingLine}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-8 print:hidden">
        <Button onClick={() => window.print()} variant="primary">
          Print this story
        </Button>
        <Button onClick={handleRegenerate} variant="secondary" disabled={isPending}>
          {isPending ? "Writing..." : "Generate a new chapter"}
        </Button>
      </div>

      {/* Generation footer */}
      <p className="text-[11px] text-text-subtle text-center">
        Written {new Date(story.generatedAt).toLocaleString()} ·{" "}
        {(result.durationMs / 1000).toFixed(1)}s
      </p>
    </div>
  );
}

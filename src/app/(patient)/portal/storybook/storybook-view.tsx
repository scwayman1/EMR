"use client";

import { useEffect, useState, useTransition } from "react";
import { generateFairytale, type FairytaleResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeafSprig, EditorialRule } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";
import { ShareButton } from "@/components/portal/share-button";
import { SoundtrackPicker } from "@/components/portal/soundtrack-picker";
import { SHARE_PRESETS } from "@/lib/portal/social-share";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CHAPTER_EMOJI = ["🌱", "🌿", "🌼", "🌻", "🍀", "🌸", "🌺", "✨"];
const GRADIENTS = [
  "from-[#e0e8e4] to-[#f0f4f2]", // green-ish
  "from-[#e2e8f0] to-[#f8fafc]", // blue-ish
  "from-[#fef3c7] to-[#fffbeb]", // yellow-ish
  "from-[#ffedd5] to-[#fff7ed]", // orange-ish
];

function chapterEmojiFor(index: number, heading: string): string {
  const lower = heading.toLowerCase();
  if (lower.includes("sleep")) return "🌙";
  if (lower.includes("pain")) return "🩹";
  if (lower.includes("anxiet") || lower.includes("calm")) return "🌤️";
  if (lower.includes("mood") || lower.includes("joy")) return "☀️";
  if (lower.includes("visit") || lower.includes("clinic")) return "🩺";
  if (lower.includes("garden") || lower.includes("grow")) return "🌱";
  return CHAPTER_EMOJI[index % CHAPTER_EMOJI.length];
}

export function StorybookView() {
  const [result, setResult] = useState<FairytaleResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [autoRan, setAutoRan] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    if (autoRan) return;
    setAutoRan(true);
    startTransition(async () => {
      const r = await generateFairytale();
      setResult(r);
    });
  }, [autoRan]);

  function handleRegenerate() {
    setActiveChapter(0);
    startTransition(async () => {
      const r = await generateFairytale();
      setResult(r);
    });
  }

  function gotoPrev() {
    if (activeChapter > 0) setActiveChapter((prev) => prev - 1);
  }

  function gotoNext() {
    const max = (result?.story?.chapters.length ?? 1) - 1;
    if (activeChapter < max) setActiveChapter((prev) => prev + 1);
  }

  function handleSaveAsPdf() {
    if (typeof window !== "undefined") window.print();
  }

  if (isPending && !result) {
    return (
      <Card tone="ambient" className="text-center py-20">
        <CardContent>
          <div className="flex flex-col items-center gap-5">
            <LeafSprig size={32} className="text-accent animate-pulse" />
            <div>
              <p className="font-display text-xl text-text">Writing your story...</p>
              <p className="text-sm text-text-muted mt-2">
                The agent is gathering your chart and turning it into a chapter of your journey.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
  const chapter = story.chapters[activeChapter];
  if (!chapter) return null;

  const emoji = chapterEmojiFor(activeChapter, chapter.heading);
  const gradient = GRADIENTS[activeChapter % GRADIENTS.length];
  const isFirst = activeChapter === 0;
  const isLast = activeChapter === story.chapters.length - 1;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <Card tone="ambient" className="text-center py-16 print:break-after-page max-w-[700px] mx-auto">
        <CardContent>
          <div className="flex flex-col items-center gap-5">
            <LeafSprig size={36} className="text-accent" />
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-text-subtle">
              Your health story
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-text tracking-tight leading-tight max-w-2xl">
              {story.title}
            </h1>
            <EditorialRule className="w-32 mt-3" />
          </div>
        </CardContent>
      </Card>

      <p className="font-display text-2xl md:text-3xl text-text leading-snug italic text-center max-w-2xl mx-auto px-6">
        &ldquo;{story.openingLine}&rdquo;
      </p>

      {/* The Folio Container */}
      <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-border/40 relative min-h-[600px] flex flex-col md:flex-row print:shadow-none print:border-none print:block">
        
        {/* Top Progress & Tools */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 print:hidden pointer-events-none">
          <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-border/50 pointer-events-auto">
            <SoundtrackPicker chapterHeadings={story.chapters.map((c) => c.heading)} />
          </div>
          <div className="flex gap-1.5 w-48">
            {story.chapters.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-300",
                  i === activeChapter
                    ? "bg-accent"
                    : i < activeChapter
                    ? "bg-accent/40"
                    : "bg-border-strong/30"
                )}
              />
            ))}
          </div>
        </div>

        {/* Left Pane: Art & Identity */}
        <div className={cn("flex-1 p-12 md:p-16 flex flex-col justify-center bg-gradient-to-br border-b md:border-b-0 md:border-r border-border/30 transition-colors duration-700", gradient)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChapter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-start"
            >
              <span className="text-7xl md:text-8xl mb-8 opacity-90 filter drop-shadow-sm">{emoji}</span>
              <p className="font-display text-xs uppercase tracking-[0.25em] text-accent font-semibold mb-4">
                Chapter {activeChapter + 1}
              </p>
              <h2 className="font-display text-4xl md:text-5xl text-accent leading-[1.1] tracking-tight">
                {chapter.heading}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Pane: The Story */}
        <div className="flex-[1.2] p-12 md:p-20 flex flex-col justify-center relative bg-white overflow-hidden print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeChapter}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <p className="text-lg md:text-xl text-text-muted leading-[1.8] first-letter:font-display first-letter:text-[5.5rem] first-letter:leading-[0.8] first-letter:float-left first-letter:pr-3 first-letter:pt-2 first-letter:text-accent first-letter:font-normal">
                {chapter.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 flex gap-3 print:hidden">
            <Button
              variant="secondary"
              size="md"
              className="rounded-full h-12 w-12 shadow-sm border-border-strong/30 bg-surface hover:bg-surface-muted"
              onClick={gotoPrev}
              disabled={isFirst}
            >
              <ChevronLeft className="w-5 h-5 text-text" />
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="rounded-full h-12 w-12 shadow-sm border-border-strong/30 bg-surface hover:bg-surface-muted"
              onClick={gotoNext}
              disabled={isLast}
            >
              <ChevronRight className="w-5 h-5 text-text" />
            </Button>
          </div>
        </div>

      </div>

      <p className="font-display text-xl md:text-2xl text-text leading-snug italic text-center max-w-xl mx-auto px-6 mt-16">
        &mdash; {story.closingLine}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-8 print:hidden max-w-[700px] mx-auto">
        <Button onClick={handleSaveAsPdf} variant="primary">
          Save as PDF
        </Button>
        <Button onClick={handleRegenerate} variant="secondary" disabled={isPending}>
          {isPending ? "Writing..." : "Generate a new chapter"}
        </Button>
        <ShareButton
          milestone={SHARE_PRESETS.storybook(story.chapters.length)}
          label="Share story"
        />
      </div>

      <p className="text-[11px] text-text-subtle text-center max-w-[700px] mx-auto mt-4">
        Written {new Date(story.generatedAt).toLocaleString()} ·{" "}
        {(result.durationMs / 1000).toFixed(1)}s
      </p>
    </div>
  );
}

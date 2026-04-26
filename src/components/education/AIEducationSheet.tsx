"use client";

import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Printer,
  Share2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EducationSheetProps {
  diagnosis?: string;
  icd10?: string;
}

type ReadingLevel = "plain" | "clinical";

interface SheetContent {
  title: string;
  intro: string;
  howItWorks: string;
  tips: string[];
}

export function AIEducationSheet({
  diagnosis = "Chronic Pain",
  icd10 = "G89.29",
}: EducationSheetProps) {
  const [level, setLevel] = useState<ReadingLevel>("plain");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 2000);
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const handleEmail = useCallback(() => {
    if (typeof window === "undefined") return;
    const subject = encodeURIComponent(
      `Your Leafjourney Care Guide: ${diagnosis}`
    );
    const body = encodeURIComponent(
      `A personalized care guide has been prepared for you (${diagnosis} — ${icd10}). Open Leafjourney to view.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [diagnosis, icd10]);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Leafjourney Care Guide: ${diagnosis}`,
          text: `Patient education for ${diagnosis} (${icd10})`,
        });
      } catch {
        // User dismissed the share sheet — no-op.
      }
    }
  }, [diagnosis, icd10]);

  const contentPlain: SheetContent = {
    title: `Understanding ${diagnosis}`,
    intro:
      "Pain that lasts a long time can make everyday things hard. But you are not alone, and there are ways to feel better.",
    howItWorks:
      "Your body has an alarm system. When you are hurt, it rings. Sometimes, the alarm gets stuck in the 'ON' position even when your body is healed. Cannabis can help turn down the volume of this alarm.",
    tips: [
      "Start with a very small amount.",
      "Wait to see how you feel before having more.",
      "Keep your medicine in a safe place away from children.",
    ],
  };

  const contentClinical: SheetContent = {
    title: `Clinical Overview: ${diagnosis} (${icd10})`,
    intro:
      "Chronic pain is a persistent nociceptive or neuropathic signal that extends beyond the expected period of tissue healing.",
    howItWorks:
      "Exogenous cannabinoids modulate the endocannabinoid system (ECS), specifically targeting CB1 and CB2 receptors to dampen excessive nociceptive signaling and reduce pro-inflammatory cytokines.",
    tips: [
      "Initiate therapy with low-dose sublingual CBD.",
      "Titrate THC gradually (1-2.5mg increments) to avoid psychoactive adverse effects.",
      "Monitor for interactions with concurrent analgesic medications.",
    ],
  };

  const activeContent = level === "plain" ? contentPlain : contentClinical;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header / Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 print:hidden">
        <div>
          <h2 className="font-display text-3xl text-text tracking-tight mb-2 flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-accent" aria-hidden="true" />
            Patient Education Generator
          </h2>
          <p className="text-sm text-text-muted max-w-xl">
            Auto-generate personalized, easily understandable education sheets
            based on ICD-10 codes.
          </p>
        </div>

        {!isGenerated ? (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            className="rounded-xl w-full md:w-auto"
            leadingIcon={
              isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-4 h-4" aria-hidden="true" />
              )
            }
          >
            {isGenerating ? "Generating…" : `Generate for ${icd10}`}
          </Button>
        ) : (
          <ReadingLevelToggle value={level} onChange={setLevel} />
        )}
      </div>

      {isGenerated && (
        <Card
          tone="raised"
          className={cn(
            "rounded-3xl border-border shadow-xl overflow-hidden bg-white",
            "animate-in fade-in slide-in-from-bottom-4 duration-500",
            "print:shadow-none print:rounded-none print:border-0"
          )}
        >
          {/* Calming printable header */}
          <div className="bg-gradient-to-r from-emerald-50 via-emerald-50 to-teal-50 border-b border-emerald-100/80 p-8 flex items-start justify-between gap-6">
            <div className="min-w-0">
              <Badge
                tone="success"
                className="border-0 bg-emerald-100 text-emerald-800 mb-3 font-bold px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
              >
                Leafjourney Care Guide
              </Badge>
              <h1
                key={`title-${level}`}
                className="font-display text-3xl md:text-4xl text-emerald-950 mb-2 tracking-tight animate-in fade-in duration-300"
              >
                {activeContent.title}
              </h1>
              <p
                key={`intro-${level}`}
                className="text-emerald-900/80 font-medium max-w-2xl text-base md:text-lg leading-relaxed animate-in fade-in duration-300"
              >
                {activeContent.intro}
              </p>
            </div>
            <div className="hidden md:flex shrink-0 w-20 h-20 bg-white rounded-full shadow-inner items-center justify-center text-emerald-600 ring-1 ring-emerald-100">
              <FileText className="w-9 h-9" aria-hidden="true" />
            </div>
          </div>

          <CardContent
            key={`body-${level}`}
            className="p-8 md:p-10 space-y-10 animate-in fade-in duration-300"
          >
            <section>
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-accent" aria-hidden="true" />
                How it works
              </h3>
              <p className="text-base md:text-lg text-text-muted leading-relaxed bg-surface-muted/60 p-6 rounded-2xl border border-border/70">
                {activeContent.howItWorks}
              </p>
            </section>

            <section>
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" aria-hidden="true" />
                Important Tips
              </h3>
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeContent.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="bg-white border-2 border-border/70 p-5 rounded-2xl shadow-sm hover:border-accent/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold mb-3">
                      {i + 1}
                    </div>
                    <p className="text-text-muted font-medium leading-snug">
                      {tip}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </CardContent>

          {/* Action Bar */}
          <div className="bg-surface-muted/70 border-t border-border/70 p-6 flex flex-wrap justify-between items-center gap-4 print:hidden">
            <p className="text-xs text-text-subtle font-medium max-w-md">
              Generated securely for patient education purposes. Not a
              replacement for emergency medical care.
            </p>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                variant="secondary"
                onClick={handleEmail}
                className="flex-1 md:flex-none rounded-xl font-semibold"
                leadingIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
              >
                Email
              </Button>
              <Button
                variant="secondary"
                onClick={handleShare}
                className="flex-1 md:flex-none rounded-xl font-semibold"
                leadingIcon={<Share2 className="w-4 h-4" aria-hidden="true" />}
              >
                Share
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                className="flex-1 md:flex-none rounded-xl font-semibold"
                leadingIcon={<Printer className="w-4 h-4" aria-hidden="true" />}
              >
                Print
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

interface ToggleProps {
  value: ReadingLevel;
  onChange: (next: ReadingLevel) => void;
}

function ReadingLevelToggle({ value, onChange }: ToggleProps) {
  const options: { id: ReadingLevel; label: string; sub: string }[] = [
    { id: "plain", label: "Plain Language", sub: "3rd Grade" },
    { id: "clinical", label: "Clinical View", sub: "ICD-10" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Reading level"
      className="inline-flex bg-surface-muted p-1 rounded-xl border border-border/70 shadow-sm"
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ease-smooth",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              isActive
                ? "bg-white text-accent shadow-sm"
                : "text-text-subtle hover:text-text"
            )}
          >
            <span>{opt.label}</span>
            <span
              className={cn(
                "ml-2 text-[10px] font-bold uppercase tracking-widest",
                isActive ? "text-accent/70" : "text-text-subtle/70"
              )}
            >
              {opt.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

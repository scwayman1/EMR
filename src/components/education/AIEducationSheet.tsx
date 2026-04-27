"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
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
type Field = "title" | "intro" | "howItWorks" | "tip";
type View = "plain" | "clinical";

interface SheetContent {
  title: string;
  intro: string;
  howItWorks: string;
  tips: string[];
}

interface ViewState extends SheetContent {
  /** Field currently receiving deltas — used to render a typing caret. */
  liveField: Field | null;
  /** True once the server emits view_done for this view. */
  done: boolean;
}

type StreamEvent =
  | { type: "chunk"; view: View; field: Field; delta: string }
  | { type: "field_done"; view: View; field: Field }
  | { type: "view_done"; view: View }
  | { type: "done" }
  | { type: "error"; code: string; message: string };

const EMPTY_VIEW: ViewState = {
  title: "",
  intro: "",
  howItWorks: "",
  tips: [],
  liveField: null,
  done: false,
};

/** How long we wait for the FIRST byte before giving up. */
const FIRST_BYTE_TIMEOUT_MS = 20_000;
/** Hard ceiling for the entire streaming run. */
const TOTAL_TIMEOUT_MS = 60_000;

export function AIEducationSheet({
  diagnosis = "Chronic Pain",
  icd10 = "G89.29",
}: EducationSheetProps) {
  const [level, setLevel] = useState<ReadingLevel>("plain");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plain, setPlain] = useState<ViewState>(EMPTY_VIEW);
  const [clinical, setClinical] = useState<ViewState>(EMPTY_VIEW);

  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const applyEvent = useCallback((event: StreamEvent) => {
    if (event.type === "chunk" || event.type === "field_done") {
      const setter = event.view === "plain" ? setPlain : setClinical;
      setter((prev) => applyChunk(prev, event));
      return;
    }
    if (event.type === "view_done") {
      const setter = event.view === "plain" ? setPlain : setClinical;
      setter((prev) => ({ ...prev, liveField: null, done: true }));
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setIsStarted(true);
    setError(null);
    setPlain(EMPTY_VIEW);
    setClinical(EMPTY_VIEW);

    // Total run timeout — covers the whole stream.
    const totalTimer = setTimeout(() => controller.abort("total_timeout"), TOTAL_TIMEOUT_MS);
    // First-byte timeout — only fires if nothing has arrived yet.
    let firstByteSeen = false;
    const firstByteTimer = setTimeout(() => {
      if (!firstByteSeen) controller.abort("first_byte_timeout");
    }, FIRST_BYTE_TIMEOUT_MS);

    try {
      const response = await fetch("/api/agents/pharmacology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagnosis, icd10 }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let message = `Server returned ${response.status}.`;
        try {
          const body = await response.json();
          if (body?.error) message = String(body.error);
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        firstByteSeen = true;
        buffer += decoder.decode(value, { stream: true });

        // SSE: events end with a blank line. Process complete frames.
        let frameEnd: number;
        while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const event = JSON.parse(payload) as StreamEvent;
              if (event.type === "error") {
                throw new Error(event.message);
              }
              applyEvent(event);
            } catch (parseErr) {
              // Re-throw real errors; ignore malformed frames.
              if (parseErr instanceof Error && parseErr.message) {
                if (parseErr.name !== "SyntaxError") throw parseErr;
              }
            }
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason === "first_byte_timeout") {
          setError("The AI didn't respond in time. Please try again.");
        } else if (reason === "total_timeout") {
          setError("Generation took too long. Please try again.");
        } else {
          // User-initiated abort — don't show an error.
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Generation failed. Please try again."
        );
      }
    } finally {
      clearTimeout(totalTimer);
      clearTimeout(firstByteTimer);
      setIsGenerating(false);
      // Mark anything still in-flight as no-longer-live.
      setPlain((p) => ({ ...p, liveField: null }));
      setClinical((c) => ({ ...c, liveField: null }));
    }
  }, [diagnosis, icd10, applyEvent]);

  const handleRetry = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

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

  const activeContent = level === "plain" ? plain : clinical;
  const activeReady = activeContent.title || activeContent.intro;

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

        {!isStarted ? (
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
          <div className="flex items-center gap-3">
            <ReadingLevelToggle
              value={level}
              onChange={setLevel}
              plainReady={plain.done}
              clinicalReady={clinical.done}
            />
            {!isGenerating && (
              <Button
                variant="ghost"
                onClick={handleRetry}
                size="sm"
                className="rounded-xl"
                leadingIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
                aria-label="Regenerate"
              >
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3"
        >
          <AlertTriangle
            className="w-5 h-5 text-red-600 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">
              Couldn't generate the guide
            </p>
            <p className="text-sm text-red-800/90 mt-0.5">{error}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            className="rounded-lg"
            leadingIcon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
          >
            Retry
          </Button>
        </div>
      )}

      {isStarted && (
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
                className="font-display text-3xl md:text-4xl text-emerald-950 mb-2 tracking-tight animate-in fade-in duration-300 min-h-[2.25rem]"
              >
                {activeContent.title || (
                  <SkeletonLine className="w-2/3" />
                )}
                {activeContent.liveField === "title" && <Caret />}
              </h1>
              <p
                key={`intro-${level}`}
                className="text-emerald-900/80 font-medium max-w-2xl text-base md:text-lg leading-relaxed animate-in fade-in duration-300 min-h-[3rem]"
              >
                {activeContent.intro || <SkeletonLine className="w-full" />}
                {activeContent.liveField === "intro" && <Caret />}
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
            <section aria-busy={!activeContent.done}>
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-accent" aria-hidden="true" />
                How it works
              </h3>
              <p className="text-base md:text-lg text-text-muted leading-relaxed bg-surface-muted/60 p-6 rounded-2xl border border-border/70 min-h-[5rem]">
                {activeContent.howItWorks || (
                  <SkeletonBlock lines={2} />
                )}
                {activeContent.liveField === "howItWorks" && <Caret />}
              </p>
            </section>

            <section aria-busy={!activeContent.done}>
              <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" aria-hidden="true" />
                Important Tips
              </h3>
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(activeContent.tips.length > 0
                  ? activeContent.tips
                  : ["", "", ""]
                ).map((tip, i) => (
                  <li
                    key={i}
                    className="bg-white border-2 border-border/70 p-5 rounded-2xl shadow-sm hover:border-accent/40 transition-colors min-h-[6.5rem]"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold mb-3">
                      {i + 1}
                    </div>
                    <p className="text-text-muted font-medium leading-snug">
                      {tip || <SkeletonBlock lines={2} />}
                      {activeContent.liveField === "tip" &&
                        i === activeContent.tips.length - 1 && <Caret />}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </CardContent>

          {/* Action Bar */}
          <div className="bg-surface-muted/70 border-t border-border/70 p-6 flex flex-wrap justify-between items-center gap-4 print:hidden">
            <p className="text-xs text-text-subtle font-medium max-w-md">
              {activeReady && activeContent.done
                ? "Generated securely for patient education purposes. Not a replacement for emergency medical care."
                : "Generating personalized content — both reading levels stream in parallel."}
            </p>
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                variant="secondary"
                onClick={handleEmail}
                disabled={!activeContent.done}
                className="flex-1 md:flex-none rounded-xl font-semibold"
                leadingIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
              >
                Email
              </Button>
              <Button
                variant="secondary"
                onClick={handleShare}
                disabled={!activeContent.done}
                className="flex-1 md:flex-none rounded-xl font-semibold"
                leadingIcon={<Share2 className="w-4 h-4" aria-hidden="true" />}
              >
                Share
              </Button>
              <Button
                variant="primary"
                onClick={handlePrint}
                disabled={!activeContent.done}
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

function applyChunk(
  prev: ViewState,
  event:
    | { type: "chunk"; view: View; field: Field; delta: string }
    | { type: "field_done"; view: View; field: Field }
): ViewState {
  if (event.type === "field_done") {
    return { ...prev, liveField: null };
  }
  const next: ViewState = { ...prev, liveField: event.field };
  switch (event.field) {
    case "title":
      next.title = (prev.title + event.delta).trimStart();
      break;
    case "intro":
      next.intro = (prev.intro + event.delta).trimStart();
      break;
    case "howItWorks":
      next.howItWorks = (prev.howItWorks + event.delta).trimStart();
      break;
    case "tip": {
      // Each `field_done` for a tip closes that tip; deltas append to the
      // open tip (last in the array). When transitioning from a non-tip
      // field, start a fresh tip.
      const tips = [...prev.tips];
      if (prev.liveField !== "tip") {
        tips.push(event.delta.trimStart());
      } else {
        tips[tips.length - 1] = (tips[tips.length - 1] + event.delta).trimStart();
      }
      next.tips = tips;
      break;
    }
  }
  return next;
}

interface ToggleProps {
  value: ReadingLevel;
  onChange: (next: ReadingLevel) => void;
  plainReady: boolean;
  clinicalReady: boolean;
}

function ReadingLevelToggle({
  value,
  onChange,
  plainReady,
  clinicalReady,
}: ToggleProps) {
  const options: {
    id: ReadingLevel;
    label: string;
    sub: string;
    ready: boolean;
  }[] = [
    { id: "plain", label: "Plain Language", sub: "3rd Grade", ready: plainReady },
    { id: "clinical", label: "Clinical View", sub: "ICD-10", ready: clinicalReady },
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
              "relative px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ease-smooth",
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
            {!opt.ready && (
              <Loader2
                className="inline-block w-3 h-3 ml-2 animate-spin opacity-60"
                aria-label="Still generating"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-4 rounded bg-emerald-100/70 animate-pulse align-middle",
        className
      )}
    />
  );
}

function SkeletonBlock({ lines }: { lines: number }) {
  return (
    <span aria-hidden="true" className="inline-block w-full space-y-2 align-middle">
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "block h-3 rounded bg-surface-muted animate-pulse",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </span>
  );
}

function Caret() {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[2px] h-4 bg-accent/80 ml-0.5 align-middle animate-pulse"
    />
  );
}

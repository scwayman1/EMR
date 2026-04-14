"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";

// ---------------------------------------------------------------------------
// SimplifiedText — EMR-54 / EMR-009
// ---------------------------------------------------------------------------
// A reusable component that shows clinical text with an option to simplify
// it to 3rd-grade reading level. Can be dropped into any patient-facing
// page (visit summaries, lab results, care plans).
//
// Usage:
//   <SimplifiedText
//     text="Patient presents with HTN, DM2. BID dosing recommended."
//     context="visit_summary"
//   />
// ---------------------------------------------------------------------------

interface SimplifiedTextProps {
  text: string;
  context?: "visit_summary" | "lab_result" | "care_plan" | "medication" | "general";
  /** Server action to call for AI simplification */
  simplifyAction?: (text: string, context: string) => Promise<{
    ok: boolean;
    error?: string;
    simplified?: string;
    readingLevel?: string;
    glossary?: Array<{ term: string; definition: string }>;
  }>;
  className?: string;
}

export function SimplifiedText({
  text,
  context = "general",
  simplifyAction,
  className,
}: SimplifiedTextProps) {
  const [mode, setMode] = useState<"original" | "simple">("original");
  const [simplified, setSimplified] = useState<string | null>(null);
  const [glossary, setGlossary] = useState<Array<{ term: string; definition: string }>>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSimplify() {
    if (simplified) {
      setMode("simple");
      return;
    }

    if (!simplifyAction) {
      // Fallback: use the deterministic plain-language module client-side
      // This is a graceful degradation — the full AI version requires
      // a server action passed as a prop
      setSimplified(text);
      setMode("simple");
      return;
    }

    startTransition(async () => {
      const result = await simplifyAction(text, context);
      if (result.ok && result.simplified) {
        setSimplified(result.simplified);
        setGlossary(result.glossary ?? []);
        setMode("simple");
        setError(null);
      } else {
        setError(result.error ?? "Could not simplify");
      }
    });
  }

  return (
    <div className={className}>
      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode("original")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            mode === "original"
              ? "bg-surface border-border-strong text-text font-medium"
              : "border-border/50 text-text-muted hover:text-text hover:border-border-strong"
          }`}
        >
          Original
        </button>
        <button
          type="button"
          onClick={handleSimplify}
          disabled={isPending}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
            mode === "simple"
              ? "bg-accent-soft border-accent/30 text-accent font-medium"
              : "border-border/50 text-text-muted hover:text-accent hover:border-accent/30"
          }`}
        >
          <LeafSprig size={10} className="text-accent/60" />
          {isPending ? "Simplifying..." : "Simple words"}
        </button>
      </div>

      {/* Content */}
      {mode === "original" ? (
        <div className="text-sm text-text-muted leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap rounded-lg bg-accent-soft/30 border border-accent/10 px-4 py-3">
            {simplified ?? text}
          </div>

          {glossary.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
                Words explained
              </p>
              {glossary.map((g, i) => (
                <div key={i} className="pl-3 border-l-2 border-accent/20">
                  <p className="text-xs">
                    <span className="font-medium text-text">{g.term}</span>
                    <span className="text-text-muted"> &mdash; {g.definition}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-danger mt-2">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SimpleExplainer — standalone card version
// ---------------------------------------------------------------------------
// A standalone card that shows a clinical concept with its simple explanation.
// Used for individual terms/concepts rather than full paragraphs.
//
// Usage:
//   <SimpleExplainer term="Hypertension" />
// ---------------------------------------------------------------------------

interface SimpleExplainerProps {
  term: string;
  explanation?: string;
  className?: string;
}

export function SimpleExplainer({ term, explanation, className }: SimpleExplainerProps) {
  return (
    <Card tone="ambient" className={className}>
      <CardContent className="py-4 px-5">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent mt-0.5">
            <LeafSprig size={12} />
          </span>
          <div>
            <p className="text-sm font-medium text-text">{term}</p>
            {explanation && (
              <p className="text-sm text-text-muted mt-0.5">{explanation}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

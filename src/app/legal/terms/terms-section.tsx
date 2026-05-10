"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

export function TermsSection({
  id,
  title,
  summary,
  children,
}: {
  id: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const [showSummary, setShowSummary] = useState(true);

  return (
    <section id={id} className="not-prose mb-10">
      <h2 className="font-display text-[22px] font-medium mt-10 text-[var(--ink)]">
        {title}
      </h2>

      <div className="mt-3 mb-4 rounded-xl border border-[var(--border)] bg-[var(--accent-soft,rgba(45,139,94,0.06))] px-4 py-3">
        <button
          type="button"
          onClick={() => setShowSummary((v) => !v)}
          aria-expanded={showSummary}
          className="flex items-center gap-2 text-[12px] uppercase tracking-wider font-semibold text-[var(--leaf,#2d8b5e)]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI summary
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showSummary ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {showSummary && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--text-soft)]">
            {summary.replace(/^AI summary:\s*/i, "")}
          </p>
        )}
      </div>

      <div className="prose prose-zinc max-w-none [&_p]:text-[14.5px] [&_p]:leading-relaxed [&_p]:text-[var(--text-soft)]">
        {children}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { QUOTES, type Quote } from "@/lib/domain/quotes";
import { LeafSprig } from "@/components/ui/ornament";

/**
 * Login pop-up that shows a welcome quote once per session.
 * Appears on first render on the patient/clinician home, then hides
 * itself after 6 seconds or on click.
 */
export function QuoteWelcomeModal({ userName }: { userName?: string }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (typeof window === "undefined") return;
    const key = "emr-quote-welcome-shown";
    const shown = sessionStorage.getItem(key);
    if (shown) return;

    sessionStorage.setItem(key, "1");
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    // Slight delay for smooth entrance
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!quote) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => setVisible(false)}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Quote card */}
      <div
        className={`relative pointer-events-auto max-w-lg w-full bg-surface-raised rounded-3xl border border-border shadow-2xl p-10 text-center transition-all duration-700 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        style={{
          background:
            "linear-gradient(135deg, var(--surface-raised), var(--surface))",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, var(--accent-soft), transparent 70%)",
          }}
        />
        <div className="relative">
          <LeafSprig size={28} className="text-accent mx-auto mb-4" />
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent mb-3">
            {userName ? `Welcome back, ${userName}` : "A thought for your day"}
          </p>
          <blockquote className="font-display text-xl md:text-2xl text-text leading-snug tracking-tight italic">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <p className="text-sm text-text-muted mt-5">— {quote.author}</p>
          <button
            onClick={() => setVisible(false)}
            className="mt-8 text-xs text-text-subtle hover:text-text transition-colors uppercase tracking-wider"
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline rotating quote card — used on individual pages. Shows a new
 * quote each time the page mounts (client-side random, so no hydration
 * mismatch).
 */
export function InlineQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  if (!quote) {
    return (
      <div className="h-16" aria-hidden="true" />
    );
  }

  return (
    <div className="flex items-start gap-3 bg-accent/[0.04] border border-accent/15 rounded-xl px-5 py-3">
      <LeafSprig size={14} className="text-accent mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text italic leading-snug">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-[11px] text-text-subtle mt-1">— {quote.author}</p>
      </div>
    </div>
  );
}

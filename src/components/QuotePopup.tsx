"use client";

/**
 * QuotePopup — EMR-061
 *
 * A small, dismissible card that shows a motivational quote on the
 * patient portal. Designed to feel like a soft moment, not a banner ad:
 *
 *   - bottom-right placement, slides in once per session
 *   - "shuffle" button picks the next quote at random
 *   - dismissal is sticky for the rest of the session (sessionStorage)
 *   - tone is fully customizable via the `mood` prop
 *
 * Use sparingly: render at most once per page.
 */

import * as React from "react";
import {
  MOTIVATIONAL_QUOTES,
  nextRandomQuote,
  quoteOfTheDay,
  type Quote,
  type QuoteMood,
} from "@/lib/content/quotes";

interface QuotePopupProps {
  mood?: QuoteMood;
  /** Override the auto-show behavior — handy for "show me a quote" buttons. */
  forceOpen?: boolean;
  /** ms to wait after mount before sliding in. Defaults to 800. */
  delayMs?: number;
}

const DISMISS_KEY = "motivational-quote-dismissed";

export function QuotePopup({
  mood,
  forceOpen,
  delayMs = 800,
}: QuotePopupProps) {
  const [open, setOpen] = React.useState(false);
  const [quote, setQuote] = React.useState<Quote>(() => quoteOfTheDay(mood));

  React.useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* no-op */
    }
    if (dismissed) return;
    const t = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(t);
  }, [forceOpen, delayMs]);

  const handleDismiss = React.useCallback(() => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* no-op */
    }
  }, []);

  const handleShuffle = React.useCallback(() => {
    setQuote(nextRandomQuote(mood));
  }, [mood]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 max-w-sm w-[calc(100%-3rem)] sm:w-96 animate-[quote-slide_400ms_ease-out]"
      role="dialog"
      aria-label="Motivational quote"
    >
      <style>{`
        @keyframes quote-slide {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="bg-surface-raised border border-border shadow-xl rounded-2xl px-5 py-4 relative">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss quote"
          className="absolute top-2 right-2 h-7 w-7 rounded-full text-text-subtle hover:text-text hover:bg-surface-muted transition-colors flex items-center justify-center"
        >
          <span aria-hidden="true">×</span>
        </button>
        <p className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">
          A small lift
        </p>
        <blockquote className="font-display text-[15px] leading-relaxed text-text pr-6">
          “{quote.text}”
        </blockquote>
        <p className="text-xs text-text-subtle mt-3">— {quote.author}</p>
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={handleShuffle}
            className="text-xs text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
          >
            Show another
          </button>
          <span className="text-[10px] text-text-subtle">
            {MOTIVATIONAL_QUOTES.length} in the library
          </span>
        </div>
      </div>
    </div>
  );
}

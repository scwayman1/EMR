"use client";

import { useEffect, useState } from "react";
import { QUOTES, quoteForSeed, randomQuote, type Quote } from "@/lib/domain/quotes";

export type UseMotivationalQuoteOptions = {
  /**
   * When provided, returns the same quote for the same seed (e.g. a date or
   * page key). When omitted, a fresh quote is picked each mount.
   */
  seed?: string;
  /**
   * Restrict rotation to one or more themes (e.g. healing, faith). When
   * omitted, the full library rotates.
   */
  themes?: ReadonlyArray<Quote["theme"]>;
};

export function useMotivationalQuote(
  opts: UseMotivationalQuoteOptions = {},
): Quote | null {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const pool = opts.themes && opts.themes.length > 0
      ? QUOTES.filter((q) => opts.themes!.includes(q.theme))
      : QUOTES;
    if (pool.length === 0) {
      setQuote(randomQuote());
      return;
    }
    if (opts.seed) {
      setQuote(quoteForSeed(opts.seed) ?? pool[0]);
      return;
    }
    setQuote(pool[Math.floor(Math.random() * pool.length)]);
    // Themes are typically a stable literal array — comparing by JSON keeps
    // re-runs honest if a caller does change the filter at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.seed, JSON.stringify(opts.themes)]);

  return quote;
}

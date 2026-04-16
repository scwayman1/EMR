"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { WELLNESS_TIPS, getTipOfTheDay, type WellnessTip } from "@/lib/domain/wellness-tips";

const SAVED_KEY = "lj-saved-tips";

function readSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSaved(ids: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

interface WellnessTipWidgetProps {
  className?: string;
}

/**
 * WellnessTipWidget — card showing the daily wellness tip with a "Next tip"
 * cycler and a heart-icon "save for later" toggle (localStorage).
 */
export function WellnessTipWidget({ className }: WellnessTipWidgetProps) {
  const daily = useMemo(() => getTipOfTheDay(), []);
  const [tip, setTip] = useState<WellnessTip>(daily);
  const [saved, setSaved] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(readSaved());
  }, []);

  function nextTip() {
    const idx = WELLNESS_TIPS.findIndex((t) => t.id === tip.id);
    const next = WELLNESS_TIPS[(idx + 1) % WELLNESS_TIPS.length];
    setTip(next);
  }

  function toggleSaved() {
    const exists = saved.includes(tip.id);
    const next = exists ? saved.filter((id) => id !== tip.id) : [...saved, tip.id];
    setSaved(next);
    writeSaved(next);
  }

  const isSaved = mounted && saved.includes(tip.id);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-surface-raised border border-border shadow-md p-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-accent">
          Tip of the day
        </p>
        <button
          type="button"
          onClick={toggleSaved}
          aria-label={isSaved ? "Remove from saved tips" : "Save this tip for later"}
          aria-pressed={isSaved}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            "transition-all duration-200 ease-smooth",
            "hover:bg-surface-muted active:scale-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "transition-colors",
              isSaved ? "text-rose-500" : "text-text-subtle hover:text-rose-500"
            )}
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="flex items-start gap-4">
        <span className="text-4xl leading-none shrink-0" aria-hidden="true">
          {tip.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-text tracking-tight mb-1.5">
            {tip.title}
          </h3>
          <p className="text-sm text-text-muted leading-relaxed">{tip.body}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-wide text-text-subtle capitalize">
          {tip.category}
        </span>
        <button
          type="button"
          onClick={nextTip}
          className={cn(
            "inline-flex items-center gap-1.5 min-h-[44px] px-4 text-sm font-medium rounded-md",
            "bg-surface-muted text-text border border-border-strong/60",
            "hover:bg-surface transition-colors"
          )}
        >
          Next tip
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

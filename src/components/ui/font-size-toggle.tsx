"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Size = "small" | "medium" | "large";

const STORAGE_KEY = "lj-font-size";

const CLASS_FOR: Record<Size, string> = {
  small: "text-sm-base",
  medium: "text-base-base",
  large: "text-lg-base",
};

const OPTIONS: { value: Size; label: string; preview: string }[] = [
  { value: "small", label: "Small", preview: "A" },
  { value: "medium", label: "Medium", preview: "A" },
  { value: "large", label: "Large", preview: "A" },
];

function applySize(size: Size) {
  const html = document.documentElement;
  Object.values(CLASS_FOR).forEach((c) => html.classList.remove(c));
  html.classList.add(CLASS_FOR[size]);
}

/**
 * FontSizeToggle — three-way segmented control that changes the root
 * font-size class on <html>. Persists choice in localStorage. Default
 * is medium.
 */
export function FontSizeToggle() {
  const [size, setSize] = useState<Size>("medium");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let stored: Size = "medium";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) as Size | null;
      if (raw === "small" || raw === "medium" || raw === "large") stored = raw;
    } catch {
      // ignore
    }
    setSize(stored);
    applySize(stored);
  }, []);

  function choose(next: Size) {
    setSize(next);
    applySize(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Font size"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-muted p-1"
    >
      {OPTIONS.map((opt) => {
        const active = mounted && size === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(opt.value)}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] px-4 rounded-lg",
              "text-xs font-medium transition-all duration-200",
              active
                ? "bg-surface-raised text-accent shadow-sm border border-border"
                : "text-text-muted hover:text-text hover:bg-surface-raised/60 border border-transparent"
            )}
          >
            <span
              className={cn(
                "font-display leading-none",
                opt.value === "small" && "text-sm",
                opt.value === "medium" && "text-base",
                opt.value === "large" && "text-xl"
              )}
              aria-hidden="true"
            >
              {opt.preview}
            </span>
            <span className="mt-0.5">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

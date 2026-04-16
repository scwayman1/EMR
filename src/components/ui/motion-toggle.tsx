"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "lj-reduce-motion";
const HTML_CLASS = "reduce-motion";

function applyMotion(reduce: boolean) {
  document.documentElement.classList.toggle(HTML_CLASS, reduce);
}

/**
 * MotionToggle — on/off switch for disabling transitions and animations
 * across the portal. Persists the preference in localStorage and respects
 * the system `prefers-reduced-motion` media query as the default when
 * nothing is stored yet.
 */
export function MotionToggle() {
  const [reduce, setReduce] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let initial: boolean;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1" || raw === "0") {
        initial = raw === "1";
      } else {
        initial = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      }
    } catch {
      initial = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    }
    setReduce(initial);
    applyMotion(initial);
  }, []);

  function toggle() {
    const next = !reduce;
    setReduce(next);
    applyMotion(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted && reduce}
      onClick={toggle}
      className={cn(
        "relative inline-flex items-center h-7 w-12 rounded-full",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2",
        mounted && reduce ? "bg-accent" : "bg-surface-muted border border-border-strong/60"
      )}
      aria-label="Reduce motion"
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-surface-raised shadow-md transform transition-transform duration-200",
          mounted && reduce ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

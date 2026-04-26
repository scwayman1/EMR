"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "leafmart-theme";

type ThemeMode = "light" | "dark";

function getStoredMode(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "dark" || v === "light" ? v : null;
}

function getSystemMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  // Toggle the .dark class on the root .theme-leafmart wrapper
  const wrappers = document.querySelectorAll<HTMLElement>(".theme-leafmart");
  wrappers.forEach((el) => {
    el.classList.toggle("dark", mode === "dark");
  });
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  // Initialise from storage / system on mount
  useEffect(() => {
    const initial = getStoredMode() ?? getSystemMode();
    setMode(initial);
    applyMode(initial);
    setMounted(true);
  }, []);

  // React to system changes only when the user hasn't expressed a preference
  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => {
      if (getStoredMode()) return; // user-locked
      const next: ThemeMode = e.matches ? "dark" : "light";
      setMode(next);
      applyMode(next);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [mounted]);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable — keep the visual change anyway
    }
  }

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors"
    >
      {/* Sun icon — visible in dark mode (suggests a switch to light) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
        className="absolute transition-all duration-200"
        style={{
          opacity: mounted && isDark ? 1 : 0,
          transform: mounted && isDark ? "rotate(0) scale(1)" : "rotate(-90deg) scale(0.6)",
        }}
      >
        <circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="9" y1="1.5" x2="9" y2="3.5" />
          <line x1="9" y1="14.5" x2="9" y2="16.5" />
          <line x1="1.5" y1="9" x2="3.5" y2="9" />
          <line x1="14.5" y1="9" x2="16.5" y2="9" />
          <line x1="3.6" y1="3.6" x2="5.0" y2="5.0" />
          <line x1="13.0" y1="13.0" x2="14.4" y2="14.4" />
          <line x1="3.6" y1="14.4" x2="5.0" y2="13.0" />
          <line x1="13.0" y1="5.0" x2="14.4" y2="3.6" />
        </g>
      </svg>
      {/* Moon icon — visible in light mode (suggests a switch to dark) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
        className="transition-all duration-200"
        style={{
          opacity: mounted && !isDark ? 1 : 0,
          transform: mounted && !isDark ? "rotate(0) scale(1)" : "rotate(90deg) scale(0.6)",
        }}
      >
        <path d="M14.5 11.2A6 6 0 1 1 6.8 3.5a5 5 0 0 0 7.7 7.7Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

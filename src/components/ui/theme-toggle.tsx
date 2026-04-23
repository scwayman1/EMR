"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("leafjourney-theme") as Theme | null;
    const current = stored ?? "light";
    setTheme(current);
    document.documentElement.setAttribute("data-theme", current);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("leafjourney-theme", next);
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative inline-flex items-center justify-center h-9 w-9 rounded-md",
        "text-text-muted hover:text-text hover:bg-surface-muted",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {/* Sun icon — shown in dark mode */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute transition-all duration-300",
          theme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-0"
        )}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      {/* Moon icon — shown in light mode */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute transition-all duration-300",
          theme === "light"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        )}
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}

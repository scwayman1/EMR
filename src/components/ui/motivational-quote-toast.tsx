"use client";

import { useEffect, useState } from "react";
import { LeafSprig } from "@/components/ui/ornament";
import { useMotivationalQuote } from "@/lib/hooks/use-motivational-quote";
import { cn } from "@/lib/utils/cn";

export type MotivationalQuoteToastProps = {
  userName?: string;
  /** Hide automatically after this many ms. 0 disables auto-dismiss. */
  durationMs?: number;
  /** sessionStorage key — toast appears once per browser session by default. */
  sessionKey?: string;
};

export function MotivationalQuoteToast({
  userName,
  durationMs = 9000,
  sessionKey = "emr-quote-toast-shown",
}: MotivationalQuoteToastProps) {
  const quote = useMotivationalQuote();
  const [phase, setPhase] = useState<"idle" | "enter" | "show" | "leave">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(sessionKey)) return;
    if (!quote) return;

    sessionStorage.setItem(sessionKey, "1");
    const t1 = setTimeout(() => setPhase("enter"), 300);
    const t2 = setTimeout(() => setPhase("show"), 360);
    const t3 = durationMs > 0
      ? setTimeout(() => setPhase("leave"), 300 + durationMs)
      : null;
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [quote, durationMs, sessionKey]);

  if (!quote || phase === "idle") return null;

  const onDismiss = () => setPhase("leave");

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed z-50 right-4 top-4 sm:right-6 sm:top-6 max-w-sm w-[calc(100vw-2rem)] sm:w-auto",
        "transition-all duration-500 ease-out",
        phase === "enter" && "opacity-0 translate-y-2",
        phase === "show" && "opacity-100 translate-y-0",
        phase === "leave" && "opacity-0 -translate-y-2 pointer-events-none",
      )}
      onAnimationEnd={() => {
        if (phase === "leave") setPhase("idle");
      }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border shadow-2xl",
          "bg-surface-raised/95 backdrop-blur-md",
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              "radial-gradient(ellipse 120% 90% at 100% 0%, var(--accent-soft), transparent 60%)",
          }}
        />
        <div className="relative px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <LeafSprig size={16} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent mb-1.5">
                {userName ? `Welcome back, ${userName}` : "A thought for your day"}
              </p>
              <blockquote className="font-display text-base sm:text-lg text-text leading-snug italic">
                &ldquo;{quote.text}&rdquo;
              </blockquote>
              <p className="text-xs text-text-muted mt-2.5">— {quote.author}</p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="shrink-0 -mr-2 -mt-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
                <path
                  d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

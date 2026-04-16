"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "lj-onboarding-completed";

interface Step {
  title: string;
  body: string;
  emoji: string;
}

const STEPS: Step[] = [
  {
    emoji: "🏡",
    title: "This is your home",
    body: "Your personalized dashboard lives here — progress, tips, and your next steps all in one place.",
  },
  {
    emoji: "📝",
    title: "Log a dose here",
    body: "Tap the quick actions at the top to log how you're feeling or record a cannabis dose.",
  },
  {
    emoji: "📈",
    title: "See your progress",
    body: "Trends, streaks, and your health grade show how things have changed over time.",
  },
  {
    emoji: "💬",
    title: "Ask your care team anything",
    body: "The messages tab connects you directly to your clinicians. No question is too small.",
  },
];

/**
 * OnboardingTour — first-visit guided tour for the patient portal home.
 *
 * Shows a sequence of centered tooltips with next / back / skip controls.
 * Completion is persisted in localStorage so it only appears once per
 * browser for new patients.
 */
export function OnboardingTour() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      const done = window.localStorage.getItem(STORAGE_KEY);
      if (!done) setActive(true);
    } catch {
      // localStorage may be unavailable — fail quietly.
    }
  }, []);

  function complete() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
    setActive(false);
  }

  if (!mounted || !active) return null;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lj-onboarding-title"
      className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-surface-raised border border-border shadow-2xl",
          "p-6 sm:p-8 animate-[fadeInUp_300ms_ease-out_forwards]"
        )}
      >
        <style>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(10px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-accent" : "bg-surface-muted"
              )}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center gap-3">
          <span className="text-5xl leading-none" aria-hidden="true">
            {current.emoji}
          </span>
          <h2
            id="lj-onboarding-title"
            className="font-display text-2xl text-text tracking-tight"
          >
            {current.title}
          </h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-sm">
            {current.body}
          </p>
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={complete}
            className="text-xs text-text-subtle hover:text-text-muted underline-offset-2 hover:underline min-h-[44px] px-2"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className={cn(
                "inline-flex items-center justify-center min-h-[44px] px-4 rounded-md text-sm font-medium",
                "bg-surface-muted text-text border border-border-strong/60",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "hover:bg-surface transition-colors"
              )}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => (isLast ? complete() : setStep((s) => s + 1))}
              className={cn(
                "inline-flex items-center justify-center min-h-[44px] px-5 rounded-md text-sm font-medium",
                "bg-gradient-to-b from-accent to-accent-strong text-accent-ink shadow-seal",
                "hover:brightness-110 transition-all"
              )}
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}

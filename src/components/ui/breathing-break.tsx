"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { LeafSprig } from "@/components/ui/ornament";

// ---------------------------------------------------------------------------
// EMR-82: Provider Breathing Break
// ---------------------------------------------------------------------------
// After 30 min on the EMR, a gentle popup offers a 2-min breathing exercise.
// Box breathing (4-4-4-4). Nature-themed. Override button with confirmation.
// ---------------------------------------------------------------------------

const BREAK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const BREATH_CYCLE_MS = 16_000; // 4 phases × 4 seconds each
const EXERCISE_DURATION_MS = 2 * 60 * 1000; // 2 minutes

const PHASES = [
  { label: "Breathe in", duration: 4000, instruction: "through your nose" },
  { label: "Hold", duration: 4000, instruction: "gently" },
  { label: "Breathe out", duration: 4000, instruction: "through your mouth" },
  { label: "Rest", duration: 4000, instruction: "and be still" },
];

const NATURE_QUOTES = [
  "In every walk with nature, one receives far more than they seek.",
  "The earth has music for those who listen.",
  "Rest is not idleness — it is the cultivation of the strength you will need tomorrow.",
  "Between stimulus and response, there is a space. In that space lies our freedom.",
  "You cannot pour from an empty cup. Take care of yourself first.",
];

export function BreathingBreak() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [exerciseActive, setExerciseActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityRef = useRef(Date.now());
  const quoteRef = useRef(NATURE_QUOTES[Math.floor(Math.random() * NATURE_QUOTES.length)]);

  // Track activity — reset timer on interaction
  useEffect(() => {
    const resetActivity = () => { activityRef.current = Date.now(); };
    window.addEventListener("click", resetActivity);
    window.addEventListener("keydown", resetActivity);
    return () => {
      window.removeEventListener("click", resetActivity);
      window.removeEventListener("keydown", resetActivity);
    };
  }, []);

  // Check every minute if 30 min have passed since last dismissal
  useEffect(() => {
    if (dismissed) return;
    const check = setInterval(() => {
      const elapsed = Date.now() - activityRef.current;
      if (elapsed >= BREAK_INTERVAL_MS) {
        setShowPrompt(true);
      }
    }, 60_000);
    return () => clearInterval(check);
  }, [dismissed]);

  // Breathing exercise cycle
  useEffect(() => {
    if (!exerciseActive) return;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const cycleTime = elapsed % BREATH_CYCLE_MS;
      const newPhase = Math.floor(cycleTime / 4000) % 4;
      const phaseProgress = (cycleTime % 4000) / 4000;

      setPhaseIndex(newPhase);
      setProgress(elapsed / EXERCISE_DURATION_MS);

      if (elapsed >= EXERCISE_DURATION_MS) {
        clearInterval(interval);
        setExerciseActive(false);
        setShowPrompt(false);
        setDismissed(true);
        activityRef.current = Date.now();
        // Reset dismissed after next interval
        setTimeout(() => setDismissed(false), BREAK_INTERVAL_MS);
      }
    }, 100);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [exerciseActive]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    activityRef.current = Date.now();
    setTimeout(() => setDismissed(false), BREAK_INTERVAL_MS);
  }, []);

  const handleStart = useCallback(() => {
    setExerciseActive(true);
    setPhaseIndex(0);
    setProgress(0);
  }, []);

  const handleSkip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setExerciseActive(false);
    setShowPrompt(false);
    setDismissed(true);
    activityRef.current = Date.now();
    setTimeout(() => setDismissed(false), BREAK_INTERVAL_MS);
  }, []);

  if (!showPrompt) return null;

  const phase = PHASES[phaseIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
        onClick={exerciseActive ? undefined : handleDismiss}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-3xl bg-surface-raised border border-border shadow-2xl overflow-hidden">
        {exerciseActive ? (
          /* ── Active breathing exercise ──── */
          <div className="px-8 py-12 text-center">
            {/* Progress bar */}
            <div className="h-1 bg-surface-muted rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress * 100, 100)}%` }}
              />
            </div>

            {/* Breathing circle */}
            <div className="flex justify-center mb-8">
              <div
                className={`rounded-full border-4 border-accent flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${
                  phaseIndex === 0 ? "h-32 w-32" : phaseIndex === 1 ? "h-32 w-32" : phaseIndex === 2 ? "h-20 w-20" : "h-20 w-20"
                }`}
              >
                <LeafSprig size={28} className="text-accent/60" />
              </div>
            </div>

            {/* Phase label */}
            <p className="font-display text-2xl text-text tracking-tight mb-1">
              {phase.label}
            </p>
            <p className="text-sm text-text-muted">{phase.instruction}</p>

            {/* Skip */}
            <button
              onClick={handleSkip}
              className="mt-8 text-xs text-text-subtle hover:text-text transition-colors"
            >
              End early
            </button>
          </div>
        ) : (
          /* ── Prompt to start ──── */
          <div className="px-8 py-10 text-center">
            <LeafSprig size={32} className="text-accent mx-auto mb-6" />
            <h2 className="font-display text-2xl text-text tracking-tight mb-2">
              Time for a breath
            </h2>
            <p className="text-sm text-text-muted leading-relaxed mb-6 max-w-xs mx-auto">
              You have been working for 30 minutes. Take two minutes for a
              simple breathing exercise. Your patients benefit when you do.
            </p>
            <p className="text-sm italic text-accent/80 mb-8 max-w-xs mx-auto">
              &ldquo;{quoteRef.current}&rdquo;
            </p>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={handleStart}>
                Start breathing exercise
              </Button>
              <button
                onClick={handleDismiss}
                className="text-xs text-text-subtle hover:text-text transition-colors"
              >
                Not now — remind me later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

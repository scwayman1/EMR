"use client";

import * as React from "react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils/cn";
import {
  birthdayMonthDay,
  isBirthdayToday,
  msUntilNextDayPlusOneMinute,
} from "@/lib/utils/birthday";

/**
 * EMR-780 — Celebratory birthday popup shown the first time a patient's
 * chart loads on their birthday. Confetti burst + drifting balloons + a
 * dismissible card with a cake/hat.
 *
 * Dismissal: per-patient, per-day via sessionStorage so reopening the
 * same chart twice in one shift doesn't re-celebrate after the clinician
 * has acknowledged it. The indicator badge stays visible all day; only
 * the modal auto-hides.
 *
 * Lifecycle: the popup also schedules a one-shot timer at 00:01 local
 * the next day so a long-lived tab doesn't keep showing yesterday's
 * birthday after the calendar rolls over.
 */

const BALLOON_COLORS = [
  "#fb7185", // rose-400
  "#f59e0b", // amber-500
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
];

function fireConfetti() {
  const duration = 1800;
  const end = Date.now() + duration;
  const palette = ["#fb7185", "#f59e0b", "#34d399", "#60a5fa", "#a78bfa"];
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 65,
      startVelocity: 45,
      origin: { x: 0, y: 0.7 },
      colors: palette,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 65,
      startVelocity: 45,
      origin: { x: 1, y: 0.7 },
      colors: palette,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

export function BirthdayCelebration({
  dateOfBirth,
  patientFirstName,
  patientId,
  audience = "clinician",
}: {
  dateOfBirth: Date | string | null | undefined;
  patientFirstName: string | null | undefined;
  /** Used to scope the once-per-day dismissal so each chart celebrates
   *  independently. Falls back to the audience when missing. */
  patientId?: string | null;
  /** Tweaks copy: clinicians see "It's <name>'s birthday!"; patients see
   *  "Happy birthday, <name>!". */
  audience?: "clinician" | "patient";
}) {
  const md = React.useMemo(() => birthdayMonthDay(dateOfBirth), [dateOfBirth]);
  const [open, setOpen] = React.useState(false);

  const storageKey = React.useMemo(() => {
    const today = new Date();
    const date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    return `emr-birthday-celebration:${patientId ?? audience}:${date}`;
  }, [patientId, audience]);

  React.useEffect(() => {
    if (!md) return;
    if (!isBirthdayToday(dateOfBirth)) {
      setOpen(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(storageKey) === "1";
    } catch {
      // Private mode etc. — fall through and just show once per tab life.
    }
    if (!dismissed) {
      setOpen(true);
      // Slight delay so the modal mounts before particles fire.
      const id = window.setTimeout(fireConfetti, 120);
      return () => window.clearTimeout(id);
    }
  }, [dateOfBirth, md, storageKey]);

  React.useEffect(() => {
    if (!md) return;
    const timer = window.setTimeout(() => {
      setOpen(false);
    }, msUntilNextDayPlusOneMinute());
    return () => window.clearTimeout(timer);
  }, [md]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Storage blocked — popup just won't suppress on next mount.
    }
  }, [storageKey]);

  if (!open) return null;

  const name = patientFirstName?.trim() || "your patient";
  const headline =
    audience === "patient"
      ? `Happy birthday, ${name}!`
      : `It's ${name}'s birthday today!`;
  const subline =
    audience === "patient"
      ? "We're so glad you're here. Wishing you a healthy, joyful year ahead."
      : "A little warmth goes a long way — say hi when they come in.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="birthday-celebration-title"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 animate-[birthday-fade-in_220ms_ease-out_forwards]"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Dismiss birthday greeting"
        onClick={handleClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
      />

      {/* Floating balloons (decorative, behind the card) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {BALLOON_COLORS.map((color, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute bottom-[-80px] block animate-[birthday-balloon-float_var(--dur)_ease-in_var(--delay)_infinite]"
            style={
              {
                left: `${8 + i * 14 + (i % 2 === 0 ? 2 : -2)}%`,
                ["--dur" as any]: `${6 + (i % 3)}s`,
                ["--delay" as any]: `${i * 0.4}s`,
              } as React.CSSProperties
            }
          >
            <span
              className="block w-10 h-12 rounded-full shadow-md"
              style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), ${color} 65%)`,
              }}
            />
            <span
              aria-hidden="true"
              className="block mx-auto w-px h-10 bg-text-subtle/40"
            />
          </span>
        ))}
      </div>

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-md rounded-3xl",
          "bg-surface-raised border border-border shadow-2xl",
          "px-8 py-10 text-center",
          "animate-[birthday-card-in_320ms_cubic-bezier(0.22,1.4,0.36,1)_forwards]",
        )}
      >
        <div className="mx-auto mb-4 flex items-center justify-center gap-2 text-5xl leading-none">
          <span
            role="img"
            aria-label="Birthday cake"
            className="inline-block animate-[birthday-bounce_1.6s_ease-in-out_infinite]"
          >
            🎂
          </span>
          <span
            role="img"
            aria-label="Party hat"
            className="inline-block animate-[birthday-bounce_1.6s_ease-in-out_0.2s_infinite]"
          >
            🎩
          </span>
          <span
            role="img"
            aria-label="Sparkles"
            className="inline-block animate-[birthday-bounce_1.6s_ease-in-out_0.4s_infinite]"
          >
            ✨
          </span>
        </div>

        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent mb-2">
          Today is a special day
        </p>
        <h2
          id="birthday-celebration-title"
          className="font-display text-2xl sm:text-3xl text-text tracking-tight leading-tight"
        >
          {headline}
        </h2>
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          {subline}
        </p>

        <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-5 py-2.5",
              "bg-accent text-white text-sm font-medium",
              "hover:bg-accent-strong focus-visible:outline-none",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              "transition-colors",
            )}
          >
            🎉 Thanks!
          </button>
          <button
            type="button"
            onClick={fireConfetti}
            className={cn(
              "inline-flex items-center justify-center rounded-full px-5 py-2.5",
              "bg-surface text-text border border-border text-sm font-medium",
              "hover:bg-surface-muted transition-colors",
            )}
          >
            More confetti
          </button>
        </div>

        {/* Decorative top trim */}
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-pink-400 via-amber-400 to-emerald-400 text-white text-[10px] font-semibold tracking-wider uppercase shadow"
        >
          Birthday
        </span>
      </div>
    </div>
  );
}

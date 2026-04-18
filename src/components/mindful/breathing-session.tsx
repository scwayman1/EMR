"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Breathing session — four-phase box breathing (4-4-4-4) with a soft
 * expanding/contracting circle and a single countdown timer.
 *
 * Deliberately quiet:
 *   - No audio (the sketch asks for tranquil sound; it's a later slice)
 *   - No ambient media, no branding chrome — the whole screen is the break
 *   - Single exit control, always visible
 *
 * State machine: setup → running → done.
 */

type Phase = "inhale" | "hold-in" | "exhale" | "hold-out";

const PHASE_SECONDS = 4;
const CYCLE_SECONDS = PHASE_SECONDS * 4;

const PHASE_LABEL: Record<Phase, string> = {
  inhale: "Breathe in",
  "hold-in": "Hold",
  exhale: "Breathe out",
  "hold-out": "Rest",
};

const DURATIONS = [
  { minutes: 2, label: "2 min" },
  { minutes: 5, label: "5 min" },
  { minutes: 10, label: "10 min" },
];

type Stage = "setup" | "running" | "done";

export function BreathingSession() {
  const [stage, setStage] = React.useState<Stage>("setup");
  const [durationMin, setDurationMin] = React.useState(5);
  const [elapsed, setElapsed] = React.useState(0);

  // Drive the 1-second clock while the session is running.
  React.useEffect(() => {
    if (stage !== "running") return;
    const start = Date.now();
    const id = window.setInterval(() => {
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(secs);
      if (secs >= durationMin * 60) {
        setStage("done");
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [stage, durationMin]);

  if (stage === "setup") {
    return (
      <Setup
        durationMin={durationMin}
        onPick={setDurationMin}
        onStart={() => {
          setElapsed(0);
          setStage("running");
        }}
      />
    );
  }

  if (stage === "done") {
    return <Done minutes={durationMin} onRestart={() => setStage("setup")} />;
  }

  return (
    <Running
      elapsed={elapsed}
      totalSeconds={durationMin * 60}
      onExit={() => setStage("done")}
    />
  );
}

/* ── Setup ───────────────────────────────────────────────── */

function Setup({
  durationMin,
  onPick,
  onStart,
}: {
  durationMin: number;
  onPick: (m: number) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      <p className="text-sm text-text-muted max-w-md">
        A simple four-count box-breathing cycle. Inhale, hold, exhale, rest —
        four seconds each. Follow the circle.
      </p>
      <div className="flex gap-2" role="radiogroup" aria-label="Duration">
        {DURATIONS.map((d) => {
          const active = d.minutes === durationMin;
          return (
            <button
              key={d.minutes}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPick(d.minutes)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                active
                  ? "bg-accent text-accent-ink shadow-sm"
                  : "bg-surface text-text-muted border border-border/70 hover:border-accent/40"
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <Button size="lg" onClick={onStart}>
        Begin
      </Button>
      <Link
        href="/clinic/mindful"
        className="text-xs text-text-subtle hover:text-text transition-colors"
      >
        ← Back
      </Link>
    </div>
  );
}

/* ── Running ─────────────────────────────────────────────── */

function Running({
  elapsed,
  totalSeconds,
  onExit,
}: {
  elapsed: number;
  totalSeconds: number;
  onExit: () => void;
}) {
  const phase = phaseFor(elapsed);
  const remaining = Math.max(0, totalSeconds - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="flex flex-col items-center text-center gap-10">
      <BreathingCircle phase={phase} />
      <div>
        <p className="font-display text-2xl text-text tracking-tight">
          {PHASE_LABEL[phase]}
        </p>
        <p className="text-sm text-text-subtle tabular-nums mt-1">
          {mm}:{ss.toString().padStart(2, "0")} remaining
        </p>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="text-xs text-text-subtle hover:text-text transition-colors"
      >
        End early
      </button>
    </div>
  );
}

function BreathingCircle({ phase }: { phase: Phase }) {
  // Target scale per phase. The CSS transition handles the smooth
  // interpolation between the current and next scale over PHASE_SECONDS.
  const scale =
    phase === "inhale"
      ? 1
      : phase === "hold-in"
        ? 1
        : phase === "exhale"
          ? 0.55
          : 0.55;

  // A subtle pulsing shadow makes the circle feel alive even during holds.
  return (
    <div
      aria-hidden="true"
      className="relative h-64 w-64 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          transform: `scale(${scale})`,
          transition: `transform ${PHASE_SECONDS}s ease-in-out`,
          background:
            "radial-gradient(circle at 30% 30%, var(--accent-soft), var(--accent) 80%)",
          boxShadow: "0 20px 60px -12px var(--accent-soft)",
          opacity: 0.92,
        }}
      />
      <div
        className="absolute inset-0 rounded-full border border-accent/20"
        style={{
          transform: `scale(${scale})`,
          transition: `transform ${PHASE_SECONDS}s ease-in-out`,
        }}
      />
    </div>
  );
}

function phaseFor(elapsedSeconds: number): Phase {
  const t = elapsedSeconds % CYCLE_SECONDS;
  if (t < PHASE_SECONDS) return "inhale";
  if (t < PHASE_SECONDS * 2) return "hold-in";
  if (t < PHASE_SECONDS * 3) return "exhale";
  return "hold-out";
}

/* ── Done ────────────────────────────────────────────────── */

function Done({
  minutes,
  onRestart,
}: {
  minutes: number;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div
        aria-hidden="true"
        className="h-16 w-16 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, var(--accent-soft), var(--accent) 80%)",
          boxShadow: "0 12px 30px -8px var(--accent-soft)",
        }}
      />
      <div>
        <h2 className="font-display text-3xl text-text tracking-tight">
          Back to work!
        </h2>
        <p className="text-sm text-text-muted mt-2">
          You took {minutes} minute{minutes === 1 ? "" : "s"} for yourself.
          That counts.
        </p>
      </div>
      <div className="flex gap-3 mt-2">
        <Link href="/clinic/command">
          <Button size="lg">Back to command</Button>
        </Link>
        <Button variant="secondary" size="lg" onClick={onRestart}>
          Another round
        </Button>
      </div>
    </div>
  );
}

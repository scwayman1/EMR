"use client";

// Weekly Outcomes Form — single surface to capture the 4 headline
// subjective dimensions (pain, sleep, anxiety, mood) once per week.
//
// Design choices (per CLAUDE.md):
//   - 1-10 slider with large thumb and wide track (iOS feel, big touch targets)
//   - Anchor emojis + labels at BOTH ends of every scale (rule #2)
//   - Live emoji + value readout in the row header for delightful feedback
//   - A single "Submit this week" button at the bottom (fun > friction)
//   - Smart default: all sliders start at 5 (neutral), so patient can submit
//     in one tap if nothing has changed (auto-population, rule #4)

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  WEEKLY_OUTCOME_SCALES,
  type OutcomeDimension,
  type OutcomeScaleMeta,
} from "@/lib/domain/weekly-outcomes";

export interface WeeklyOutcomeSubmitInput {
  painScore: number;
  sleepScore: number;
  anxietyScore: number;
  moodScore: number;
}

export type WeeklyOutcomeSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export interface WeeklyOutcomesFormProps {
  /** Pre-fill values if this patient already submitted for the current week. */
  initial?: Partial<WeeklyOutcomeSubmitInput>;
  /** Label shown under the header; usually the ISO date of the week's Monday. */
  weekLabel?: string;
  /** Server action bound by the parent page. */
  onSubmit: (
    input: WeeklyOutcomeSubmitInput,
  ) => Promise<WeeklyOutcomeSubmitResult>;
}

const FIELD_KEY: Record<OutcomeDimension, keyof WeeklyOutcomeSubmitInput> = {
  pain: "painScore",
  sleep: "sleepScore",
  anxiety: "anxietyScore",
  mood: "moodScore",
};

function pickEmoji(scale: OutcomeScaleMeta, value: number): string {
  // Midpoint (5-6) shows both anchors faintly blended; we keep it simple and
  // show the low emoji until the needle crosses the midpoint.
  return value <= 5 ? scale.lowEmoji : scale.highEmoji;
}

function ScaleRow({
  scale,
  value,
  onChange,
}: {
  scale: OutcomeScaleMeta;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-5 first:pt-2 last:pb-2">
      {/* Header row: dimension label, live emoji, current value */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl leading-none transition-transform duration-200"
            style={{ transform: `scale(${0.9 + value * 0.02})` }}
            role="img"
            aria-hidden
          >
            {pickEmoji(scale, value)}
          </span>
          <div>
            <div className="font-display text-base text-text tracking-tight">
              {scale.label}
            </div>
            <div className="text-xs text-text-subtle">{scale.prompt}</div>
          </div>
        </div>
        <div
          className="font-display text-2xl text-accent tabular-nums"
          aria-live="polite"
        >
          {value}
          <span className="text-text-subtle text-xs ml-0.5">/ 10</span>
        </div>
      </div>

      {/* Slider with anchor emojis + labels at both ends */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex flex-col items-center w-12 shrink-0">
          <span className="text-xl leading-none" aria-hidden>
            {scale.lowEmoji}
          </span>
          <span className="text-[10px] text-text-subtle mt-1 font-medium uppercase tracking-wider">
            {scale.lowLabel}
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${scale.label} — ${scale.lowLabel} to ${scale.highLabel}`}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-surface-muted accent-accent touch-manipulation"
        />

        <div className="flex flex-col items-center w-12 shrink-0">
          <span className="text-xl leading-none" aria-hidden>
            {scale.highEmoji}
          </span>
          <span className="text-[10px] text-text-subtle mt-1 font-medium uppercase tracking-wider">
            {scale.highLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export function WeeklyOutcomesForm({
  initial,
  weekLabel,
  onSubmit,
}: WeeklyOutcomesFormProps) {
  const [values, setValues] = useState<WeeklyOutcomeSubmitInput>({
    painScore: initial?.painScore ?? 5,
    sleepScore: initial?.sleepScore ?? 5,
    anxietyScore: initial?.anxietyScore ?? 5,
    moodScore: initial?.moodScore ?? 5,
  });
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  function setDim(dim: OutcomeDimension, v: number) {
    const key = FIELD_KEY[dim];
    setValues((prev) => ({ ...prev, [key]: v }));
    if (status.kind !== "idle") setStatus({ kind: "idle" });
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        setStatus({ kind: "success" });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <Card tone="raised" className="overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h3 className="font-display text-xl text-text tracking-tight">
          This week in four sliders
        </h3>
        <p className="text-sm text-text-muted mt-1">
          {weekLabel
            ? `Week of ${weekLabel}. `
            : ""}
          A quick pulse on how you felt — submit once per week. You can update
          your answers any time until Sunday night.
        </p>
      </div>
      <CardContent className="pt-2">
        <div className="divide-y divide-border/50">
          {WEEKLY_OUTCOME_SCALES.map((scale) => (
            <ScaleRow
              key={scale.dimension}
              scale={scale}
              value={values[FIELD_KEY[scale.dimension]]}
              onChange={(v) => setDim(scale.dimension, v)}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-text-subtle">
            {status.kind === "success"
              ? "Saved. Thank you for checking in."
              : status.kind === "error"
                ? status.message
                : "Your answers help us tune your care plan."}
          </div>
          <Button
            type="button"
            size="lg"
            variant="primary"
            disabled={isPending}
            onClick={handleSubmit}
            className="sm:min-w-[220px]"
          >
            {isPending
              ? "Saving..."
              : status.kind === "success"
                ? "Update this week"
                : "Submit this week"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

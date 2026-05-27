"use client";

// EMR-134 — Emotional Vitals emoji scale for APSO notes
// 5-point emoji mood scale captured as structured data on each visit. Renders
// a tiny trend chart of prior visits and surfaces a basic correlation hint
// when cannabis intake is supplied.

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const EMOTIONAL_VITALS_SCALE = [
  { score: 1, emoji: "\u{1F62B}", label: "Distressed" },
  { score: 2, emoji: "\u{1F61F}", label: "Down" },
  { score: 3, emoji: "\u{1F610}", label: "Neutral" },
  { score: 4, emoji: "\u{1F642}", label: "Lifted" },
  { score: 5, emoji: "\u{1F604}", label: "Bright" },
] as const;

export type EmotionalVitalScore = 1 | 2 | 3 | 4 | 5;

export interface EmotionalVitalEntry {
  visitId: string;
  recordedAt: string;
  score: EmotionalVitalScore;
  cannabisIntakeMg?: number;
  noteSection?: "S" | "O" | "A" | "P";
}

interface Props {
  visitId: string;
  /** Prior entries used to render the trend + correlation hint. */
  history?: EmotionalVitalEntry[];
  /** Latest cannabis dose for this visit, in mg. Used for correlation hint. */
  cannabisIntakeMg?: number;
  initialScore?: EmotionalVitalScore;
  onChange?: (entry: EmotionalVitalEntry) => void;
  /** APSO section this entry will be filed under — defaults to A (Assessment). */
  section?: "S" | "O" | "A" | "P";
  readOnly?: boolean;
}

export function EmotionalVitals({
  visitId,
  history = [],
  cannabisIntakeMg,
  initialScore,
  onChange,
  section = "A",
  readOnly = false,
}: Props) {
  const [score, setScore] = React.useState<EmotionalVitalScore | null>(
    initialScore ?? null,
  );

  function handleSelect(next: EmotionalVitalScore) {
    if (readOnly) return;
    setScore(next);
    onChange?.({
      visitId,
      recordedAt: new Date().toISOString(),
      score: next,
      cannabisIntakeMg,
      noteSection: section,
    });
  }

  const trendPoints = [...history]
    .sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt))
    .slice(-12);

  return (
    <Card tone="raised" className="overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-subtle">
            APSO · {sectionName(section)}
          </p>
          <h3 className="font-display text-lg text-text tracking-tight mt-0.5">
            Emotional vitals
          </h3>
        </div>
        <Badge tone="neutral" className="text-[10px]">
          Visit {visitId.slice(0, 6)}
        </Badge>
      </div>

      <CardContent className="pt-1">
        <div
          role="radiogroup"
          aria-label="Emotional vitals score"
          className="grid grid-cols-5 gap-2 mb-4"
        >
          {EMOTIONAL_VITALS_SCALE.map((opt) => {
            const selected = score === opt.score;
            return (
              <button
                key={opt.score}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${opt.score} — ${opt.label}`}
                disabled={readOnly}
                onClick={() => handleSelect(opt.score as EmotionalVitalScore)}
                className={cn(
                  "rounded-xl border px-2 py-3 flex flex-col items-center gap-1 transition-all",
                  "hover:border-accent hover:-translate-y-0.5",
                  selected
                    ? "border-accent bg-accent-soft shadow-sm"
                    : "border-border bg-surface-muted/40",
                  readOnly && "opacity-70 cursor-not-allowed hover:translate-y-0 hover:border-border",
                )}
              >
                <span className="text-2xl" aria-hidden="true">
                  {opt.emoji}
                </span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {trendPoints.length > 1 && (
          <div className="mt-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle mb-1">
              Trend over recent visits
            </p>
            <TrendChart points={trendPoints} />
          </div>
        )}

        {trendPoints.length >= 3 && cannabisIntakeMg != null && (
          <CorrelationHint
            score={score}
            cannabisIntakeMg={cannabisIntakeMg}
            history={trendPoints}
          />
        )}
      </CardContent>
    </Card>
  );
}

function sectionName(section: "S" | "O" | "A" | "P"): string {
  switch (section) {
    case "S":
      return "Subjective";
    case "O":
      return "Objective";
    case "A":
      return "Assessment";
    case "P":
      return "Plan";
  }
}

function TrendChart({ points }: { points: EmotionalVitalEntry[] }) {
  const width = 280;
  const height = 56;
  const pad = 4;
  const xs = points.map(
    (_, i) => pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1),
  );
  const ys = points.map(
    (p) => pad + ((5 - p.score) * (height - pad * 2)) / 4,
  );
  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-14"
      role="img"
      aria-label="Emotional vitals trend"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-accent"
      />
      {xs.map((x, i) => (
        <circle
          key={i}
          cx={x}
          cy={ys[i]}
          r={2.4}
          className="fill-accent"
        />
      ))}
    </svg>
  );
}

function CorrelationHint({
  score,
  cannabisIntakeMg,
  history,
}: {
  score: EmotionalVitalScore | null;
  cannabisIntakeMg: number;
  history: EmotionalVitalEntry[];
}) {
  const withDose = history.filter((h) => h.cannabisIntakeMg != null);
  if (withDose.length < 3 || score == null) return null;

  const avgDose =
    withDose.reduce((s, h) => s + (h.cannabisIntakeMg ?? 0), 0) / withDose.length;
  const avgScore =
    withDose.reduce((s, h) => s + h.score, 0) / withDose.length;

  const direction =
    cannabisIntakeMg > avgDose
      ? score > avgScore
        ? "Higher dose this visit lined up with brighter mood."
        : "Higher dose this visit, but mood is below the patient average."
      : score > avgScore
        ? "Lower dose this visit and mood is above their average — note it."
        : "Lower dose this visit and mood is at or below average.";

  return (
    <p className="text-[11px] text-text-subtle leading-relaxed mt-3">
      {direction} (Avg dose {Math.round(avgDose)} mg · avg score{" "}
      {avgScore.toFixed(1)} of 5)
    </p>
  );
}

interface NoteBlockProps {
  history?: EmotionalVitalEntry[];
  current?: EmotionalVitalEntry;
}

/** Render the structured emotional vitals into APSO note text. Used by the
 * note editor when assembling the assessment paragraph. */
export function emotionalVitalsToNoteLine(entry: EmotionalVitalEntry): string {
  const opt = EMOTIONAL_VITALS_SCALE.find((o) => o.score === entry.score);
  const dose =
    entry.cannabisIntakeMg != null
      ? `, cannabis intake ${entry.cannabisIntakeMg} mg`
      : "";
  return `Emotional vitals: ${entry.score}/5 ${opt?.label ?? ""}${dose}.`;
}

export function EmotionalVitalsTrendOnly({ history, current }: NoteBlockProps) {
  const points = [
    ...(history ?? []),
    ...(current ? [current] : []),
  ].sort((a, b) => +new Date(a.recordedAt) - +new Date(b.recordedAt));
  if (points.length < 2) return null;
  return (
    <div className="mt-2">
      <TrendChart points={points} />
    </div>
  );
}

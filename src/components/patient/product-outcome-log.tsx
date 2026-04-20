"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { logProductOutcome } from "@/app/actions/productOutcomeActions";
import {
  PRODUCT_FEELINGS,
  type ProductFeeling,
} from "@/lib/domain/product-outcomes";

/**
 * Per-product outcome logger (Dr. Patel Directive).
 *
 * Drop-in form for any product surface. Caller fetches the product name
 * and passes it in; we render the emoji row + 1-10 effectiveness slider
 * + side-effect chips and submit via the server action.
 */

interface FeelingOption {
  value: ProductFeeling;
  emoji: string;
  label: string;
  tone: string;
}

const FEELING_OPTIONS: FeelingOption[] = [
  { value: "awful", emoji: "😫", label: "Awful", tone: "bg-red-100 border-red-300 text-red-700" },
  { value: "bad", emoji: "😟", label: "Bad", tone: "bg-orange-100 border-orange-300 text-orange-700" },
  { value: "ok", emoji: "😐", label: "OK", tone: "bg-gray-100 border-gray-300 text-gray-600" },
  { value: "good", emoji: "😊", label: "Good", tone: "bg-emerald-100 border-emerald-300 text-emerald-700" },
  { value: "great", emoji: "🤩", label: "Great", tone: "bg-emerald-200 border-emerald-400 text-emerald-800" },
];

// Keep this list short on purpose — free-text handles the long tail.
const COMMON_SIDE_EFFECTS = [
  "Dry mouth",
  "Drowsiness",
  "Dizziness",
  "Anxiety",
  "Headache",
  "Nausea",
] as const;

interface Props {
  productId: string;
  productName: string;
  /** Called after a successful submit — parent can refresh/close/etc. */
  onLogged?: (outcomeId: string) => void;
  /** Optional default effectiveness — shows a sensible starting point. */
  defaultEffectiveness?: number;
}

export function ProductOutcomeLog({
  productId,
  productName,
  onLogged,
  defaultEffectiveness = 7,
}: Props) {
  const [feeling, setFeeling] = useState<ProductFeeling | null>(null);
  const [effectiveness, setEffectiveness] = useState<number>(
    clampEffectiveness(defaultEffectiveness),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggleSideEffect(label: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function addCustom() {
    const trimmed = custom.trim();
    if (!trimmed) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(trimmed);
      return next;
    });
    setCustom("");
  }

  function submit() {
    if (!feeling) {
      setError("Pick a feeling first.");
      return;
    }
    setError(null);
    const sideEffects = Array.from(selected);
    startTransition(async () => {
      const result = await logProductOutcome({
        productId,
        feeling,
        effectivenessScore: effectiveness,
        sideEffects,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      onLogged?.(result.id);
    });
  }

  if (done) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="pt-10 pb-10 text-center">
          <span className="text-5xl block mb-3">🎉</span>
          <p className="text-lg font-medium text-text mb-1">Logged!</p>
          <p className="text-sm text-text-muted">
            Thanks — that helps your care team and cannabis research.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="pt-7 pb-7 space-y-7">
        {/* Header */}
        <header className="text-center">
          <p className="text-xs uppercase tracking-wide text-text-subtle mb-1">
            Quick outcome log
          </p>
          <h3 className="font-display text-xl text-text tracking-tight">
            {productName}
          </h3>
          <p className="text-sm text-text-muted mt-1">
            How did this work for you?
          </p>
        </header>

        {/* Feeling */}
        <section>
          <p className="text-sm font-medium text-text mb-3 text-center">
            Overall feeling
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {FEELING_OPTIONS.map((opt) => {
              const active = feeling === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFeeling(opt.value)}
                  aria-pressed={active}
                  aria-label={opt.label}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 min-w-[72px]",
                    active
                      ? `${opt.tone} border-current shadow-sm scale-105`
                      : "border-transparent hover:border-border hover:bg-surface-muted",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {opt.emoji}
                  </span>
                  <span className="text-[11px] font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
          {/* Ensure `PRODUCT_FEELINGS` is referenced so the UI stays in sync
              with the domain enum at compile time. */}
          <span hidden data-feelings={PRODUCT_FEELINGS.join(",")} />
        </section>

        {/* Effectiveness slider */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text">Effectiveness</span>
            <span className="text-lg font-semibold text-accent tabular-nums">
              {effectiveness}/10
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-subtle w-16 text-right shrink-0">
              No effect
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={effectiveness}
              onChange={(e) =>
                setEffectiveness(clampEffectiveness(Number(e.target.value)))
              }
              aria-label="Effectiveness, 1 to 10"
              className="flex-1 accent-accent h-2"
            />
            <span className="text-[11px] text-text-subtle w-16 shrink-0">
              Total relief
            </span>
          </div>
        </section>

        {/* Side-effect chips */}
        <section>
          <p className="text-sm font-medium text-text mb-2">
            Any side effects?
          </p>
          <div className="flex flex-wrap gap-2">
            {COMMON_SIDE_EFFECTS.map((label) => {
              const active = selected.has(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleSideEffect(label)}
                  aria-pressed={active}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                    active
                      ? "bg-accent text-white border-accent shadow-sm"
                      : "bg-surface-muted text-text border-border hover:border-accent hover:text-accent",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Free-text add */}
          <div className="flex gap-2 mt-3">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Add your own…"
              aria-label="Add custom side effect"
              maxLength={80}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addCustom}
              disabled={!custom.trim()}
            >
              Add
            </Button>
          </div>

          {/* Custom chips (items not in the common list) */}
          {Array.from(selected).filter(
            (s) => !COMMON_SIDE_EFFECTS.includes(s as (typeof COMMON_SIDE_EFFECTS)[number]),
          ).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Array.from(selected)
                .filter(
                  (s) =>
                    !COMMON_SIDE_EFFECTS.includes(
                      s as (typeof COMMON_SIDE_EFFECTS)[number],
                    ),
                )
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSideEffect(s)}
                    className="px-3 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/30"
                    aria-label={`Remove ${s}`}
                  >
                    {s} ✕
                  </button>
                ))}
            </div>
          )}
        </section>

        {/* Error / submit */}
        {error && (
          <p className="text-center text-xs text-danger">{error}</p>
        )}

        <div className="flex justify-center">
          <Button
            type="button"
            onClick={submit}
            disabled={!feeling || pending}
            className="rounded-xl px-8"
          >
            {pending ? "Saving…" : "Log outcome"}
          </Button>
        </div>

        <p className="text-[11px] text-text-subtle text-center">
          Your log helps us understand which products work for you — and
          contributes to cannabis research.
        </p>
      </CardContent>
    </Card>
  );
}

function clampEffectiveness(n: number): number {
  if (!Number.isFinite(n)) return 5;
  if (n < 1) return 1;
  if (n > 10) return 10;
  return Math.round(n);
}

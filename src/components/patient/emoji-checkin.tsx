"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  FEELING_LABELS,
  type EmojiFeeling,
} from "@/lib/domain/emoji-outcomes";
import { logEmojiOutcome } from "@/app/(patient)/portal/log-dose/actions";

/**
 * Post-dose emoji check-in.
 *
 * Five large emoji buttons + a 1-10 relief slider. Designed to feel
 * like iOS: large touch targets, quick micro-interactions, minimal
 * friction. Every tap produces a structured EmojiOutcome row that can
 * be queried for research, reimbursement, and product development.
 */

const FEELING_ORDER: EmojiFeeling[] = [
  "much_better",
  "better",
  "same",
  "worse",
  "much_worse",
];

interface Props {
  productId?: string | null;
  /** Optional label shown in the card header. */
  title?: string;
}

export function EmojiCheckin({ productId, title = "How did that feel?" }: Props) {
  const [feeling, setFeeling] = useState<EmojiFeeling | null>(null);
  const [relief, setRelief] = useState<number>(5);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "saved" }
  >({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!feeling) {
      setStatus({ kind: "error", message: "Pick an emoji first." });
      return;
    }
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const result = await logEmojiOutcome({
        feeling,
        reliefLevel: relief,
        productId: productId ?? null,
        takenAt: new Date().toISOString(),
      });
      if (result.ok) {
        setStatus({ kind: "saved" });
        // Reset so the patient can log again later.
        setFeeling(null);
        setRelief(5);
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    });
  }

  return (
    <Card tone="raised" className="rounded-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Tap an emoji, slide to rate relief. Takes 5 seconds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-5 gap-2">
          {FEELING_ORDER.map((key) => {
            const def = FEELING_LABELS[key];
            const selected = feeling === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFeeling(key)}
                aria-pressed={selected}
                aria-label={def.label}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  "min-h-[88px] rounded-2xl border transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  selected
                    ? "bg-accent/10 border-accent shadow-seal scale-[1.04]"
                    : "bg-surface border-border/80 hover:bg-surface-muted hover:scale-[1.02]",
                )}
              >
                <span className="text-3xl leading-none">{def.emoji}</span>
                <span className="text-[11px] font-medium text-text-muted text-center px-1">
                  {def.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="emoji-checkin-relief"
              className="text-sm font-medium text-text"
            >
              Relief level
            </label>
            <span className="font-display text-2xl text-text tabular-nums">
              {relief}
              <span className="text-sm text-text-muted"> / 10</span>
            </span>
          </div>
          <input
            id="emoji-checkin-relief"
            type="range"
            min={1}
            max={10}
            step={1}
            value={relief}
            onChange={(e) => setRelief(Number(e.target.value))}
            className="w-full h-3 accent-accent"
            aria-label="Relief level, 1 no relief to 10 complete relief"
          />
          <div className="flex justify-between text-[11px] text-text-muted">
            <span>😣 No relief</span>
            <span>Complete relief 😌</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div
            role="status"
            aria-live="polite"
            className="text-sm min-h-[20px]"
          >
            {status.kind === "saved" && (
              <span className="text-emerald-600">Saved. Thanks!</span>
            )}
            {status.kind === "error" && (
              <span className="text-danger">{status.message}</span>
            )}
          </div>
          <Button
            type="button"
            size="lg"
            onClick={handleSubmit}
            disabled={isPending || !feeling}
          >
            {isPending ? "Saving…" : "Log check-in"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

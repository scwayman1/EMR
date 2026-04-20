"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import {
  SIDE_EFFECT_CODES,
  SIDE_EFFECT_EMOJI,
  SIDE_EFFECT_OPTIONS,
  type SideEffectCode,
} from "@/lib/domain/side-effects";
import { logSideEffect } from "@/app/(patient)/portal/records/actions";

/**
 * SideEffectLogger — iOS-style dropdown + 1-10 severity slider + optional notes.
 * Caller owns where this is rendered; we don't wire it into any page here.
 *
 * Dr. Patel Directive: fun > friction. Large touch targets, anchor labels on
 * every scale, auto-populated defaults, and structured submit payload.
 */

export interface SideEffectLoggerProps {
  /** Optional CannabisProduct id to attach the report to. */
  productId?: string | null;
  /** Optional product name to echo in the header (purely cosmetic). */
  productName?: string | null;
  /** Fired after a successful submit with the new report id. */
  onSubmitted?: (reportId: string) => void;
  className?: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "saved"; reportId: string };

export function SideEffectLogger({
  productId,
  productName,
  onSubmitted,
  className,
}: SideEffectLoggerProps) {
  const [effect, setEffect] = useState<SideEffectCode>("dry_mouth");
  const [customEffect, setCustomEffect] = useState("");
  const [severity, setSeverity] = useState(4);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const activeLabel = useMemo(() => SIDE_EFFECT_OPTIONS[effect], [effect]);
  const activeEmoji = useMemo(() => SIDE_EFFECT_EMOJI[effect], [effect]);

  function submit() {
    if (effect === "other" && customEffect.trim().length === 0) {
      setStatus({ kind: "error", message: "Please describe your other side effect." });
      return;
    }

    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await logSideEffect({
        effect,
        customEffect: effect === "other" ? customEffect : null,
        severity,
        note: note || null,
        productId: productId ?? null,
      });
      if (res.ok) {
        setStatus({ kind: "saved", reportId: res.reportId });
        onSubmitted?.(res.reportId);
        // Reset inputs to sensible defaults but keep the selected effect
        // so rapid-fire logging feels fast.
        setNote("");
        setSeverity(4);
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-2xl bg-surface-raised border border-border shadow-sm",
        "p-5 sm:p-6 space-y-5",
        className
      )}
    >
      <header className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
          Side effect check-in
        </p>
        <h3 className="font-display text-xl text-text tracking-tight">
          Anything bothering you{productName ? ` with ${productName}` : ""}?
        </h3>
        <p className="text-xs text-text-muted">
          Log it once — we&apos;ll track patterns over time.
        </p>
      </header>

      {/* Effect dropdown */}
      <div className="space-y-2">
        <label
          htmlFor="side-effect-select"
          className="block text-xs font-medium text-text-muted"
        >
          What are you feeling?
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl"
            aria-hidden="true"
          >
            {activeEmoji}
          </span>
          <select
            id="side-effect-select"
            value={effect}
            onChange={(e) => setEffect(e.target.value as SideEffectCode)}
            className={cn(
              "w-full rounded-xl border border-border bg-surface",
              "py-3 pl-12 pr-4 text-base text-text",
              "min-h-[48px] appearance-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            )}
          >
            {SIDE_EFFECT_CODES.map((code) => (
              <option key={code} value={code}>
                {SIDE_EFFECT_OPTIONS[code]}
              </option>
            ))}
          </select>
        </div>

        {effect === "other" && (
          <input
            type="text"
            value={customEffect}
            onChange={(e) => setCustomEffect(e.target.value)}
            maxLength={120}
            placeholder="Describe it in your own words…"
            aria-label="Custom side effect description"
            className={cn(
              "mt-2 w-full rounded-xl border border-border bg-surface",
              "py-3 px-4 text-base text-text min-h-[48px]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            )}
          />
        )}
      </div>

      {/* Severity slider */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label
            htmlFor="side-effect-severity"
            className="text-xs font-medium text-text-muted"
          >
            How strong is it?
          </label>
          <span className="font-display text-2xl text-accent tabular-nums">
            {severity}
            <span className="text-xs text-text-subtle ml-1">/ 10</span>
          </span>
        </div>
        <input
          id="side-effect-severity"
          type="range"
          min={1}
          max={10}
          step={1}
          value={severity}
          onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
          aria-label={`${activeLabel} severity`}
          className="w-full accent-accent h-2"
        />
        <div className="flex justify-between text-[11px] text-text-subtle">
          <span>Barely notice (1)</span>
          <span>Unbearable (10)</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label
          htmlFor="side-effect-note"
          className="block text-xs font-medium text-text-muted"
        >
          Notes <span className="text-text-subtle">(optional)</span>
        </label>
        <textarea
          id="side-effect-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Anything we should know? Context, timing, what helped…"
          className={cn(
            "w-full rounded-xl border border-border bg-surface",
            "p-3 text-sm text-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          )}
        />
      </div>

      {status.kind === "error" && (
        <p role="alert" className="text-sm text-danger">
          {status.message}
        </p>
      )}
      {status.kind === "saved" && (
        <p role="status" className="text-sm text-accent-strong">
          ✅ Logged — thanks for sharing.
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className={cn(
            "min-h-[48px] px-5 rounded-xl text-sm font-semibold",
            "bg-gradient-to-b from-accent to-accent-strong text-accent-ink shadow-seal",
            "hover:brightness-110 active:scale-[0.98] transition-all",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isPending ? "Saving…" : "Log side effect"}
        </button>
      </div>
    </div>
  );
}

export default SideEffectLogger;

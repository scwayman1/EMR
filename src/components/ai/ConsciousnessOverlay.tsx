"use client";

import * as React from "react";
import {
  deriveSuggestions,
  type OverlayContext,
  type OverlaySuggestion,
  type SuggestionTone,
} from "@/lib/ai/consciousness-overlay";

// ---------------------------------------------------------------------------
// EMR-136 — AI Consciousness Overlay (ambient suggestions)
// ---------------------------------------------------------------------------
// Floating, dismissable toasts in the bottom-right that yield to the
// clinician. The host hands us a `context` and we render at most three
// suggestions at a time, in priority order. Each one is dismissable
// for the session; once dismissed it doesn't return until the page
// reloads.
// ---------------------------------------------------------------------------

const TONE_CLASS: Record<SuggestionTone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-300 bg-rose-50 text-rose-900",
};

const TONE_ICON: Record<SuggestionTone, string> = {
  info: "💡",
  warning: "⚠️",
  critical: "🛑",
};

interface ConsciousnessOverlayProps {
  /** Live chart context. Re-derives suggestions when this changes. */
  context: OverlayContext;
  /** Optional callback when the clinician taps a suggestion's CTA. */
  onAction?: (suggestion: OverlaySuggestion) => void;
  /** Hide the overlay (e.g. while the clinician is on a focused task). */
  paused?: boolean;
  /** Cap the number of toasts at once. */
  max?: number;
}

export function ConsciousnessOverlay({
  context,
  onAction,
  paused = false,
  max = 3,
}: ConsciousnessOverlayProps) {
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState(false);

  const suggestions = React.useMemo(
    () => deriveSuggestions(context, { dismissed, max }),
    [context, dismissed, max],
  );

  if (paused || hidden || suggestions.length === 0) return null;

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <aside
      role="region"
      aria-label="AI suggestions"
      className="fixed bottom-4 right-4 z-50 w-[320px] space-y-2 pointer-events-none"
    >
      <div className="flex items-center justify-end gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-[10px] uppercase tracking-wider text-text-subtle hover:text-text bg-surface-raised border border-border rounded-full px-2 py-0.5"
        >
          Mute
        </button>
      </div>
      {suggestions.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          onDismiss={() => dismiss(s.id)}
          onAction={onAction}
        />
      ))}
    </aside>
  );
}

function SuggestionCard({
  suggestion,
  onDismiss,
  onAction,
}: {
  suggestion: OverlaySuggestion;
  onDismiss: () => void;
  onAction?: (s: OverlaySuggestion) => void;
}) {
  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-xl border shadow-lg overflow-hidden transition-all ${TONE_CLASS[suggestion.tone]}`}
      style={{ animation: "slideUp 220ms ease-out" }}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span aria-hidden className="text-base mt-0.5">
            {TONE_ICON[suggestion.tone]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold leading-tight">
              {suggestion.title}
            </p>
            <p className="text-[12px] leading-snug mt-1 opacity-90">
              {suggestion.body}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {suggestion.cta && (
                <button
                  type="button"
                  onClick={() => onAction?.(suggestion)}
                  className="text-[11px] font-medium underline underline-offset-2 hover:no-underline"
                >
                  {suggestion.cta.label}
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="text-[11px] opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }",
        }}
      />
    </div>
  );
}

"use client";

// EMR-421 — Step 2: Select primary specialty.
//
// Specialty-adaptive: every active specialty appears as an equal-weight card.
// We never branch on a specific slug here — the manifest dictates everything,
// and selecting a card POSTs to /api/configs/[id]/apply-specialty so the
// server applies the defaults. The UI's only job is presentation + audit.

import * as React from "react";
import * as Icons from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow, EditorialRule } from "@/components/ui/ornament";
import { cn } from "@/lib/utils/cn";
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";

type LucideIcon = React.ComponentType<{ size?: number; className?: string }>;

/** Resolve a manifest icon name to a real lucide component, with a fallback. */
function resolveIcon(name: string): LucideIcon {
  const registry = Icons as unknown as Record<string, LucideIcon | undefined>;
  return registry[name] ?? registry["Sparkles"] ?? (() => null);
}

interface FetchedTemplates {
  status: "idle" | "loading" | "ready" | "error";
  items: SpecialtyManifest[];
  error?: string;
}

export function Step2Specialty({
  draft,
  onAdvance,
  onDraftChanged,
}: WizardStepProps) {
  const [templates, setTemplates] = React.useState<FetchedTemplates>({
    status: "loading",
    items: [],
  });

  // Locally selected slug (pre-confirm). Initialized from the draft so that
  // when a user revisits this step the prior choice stays selected.
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(
    draft.selectedSpecialty ?? null,
  );
  const [submitState, setSubmitState] = React.useState<
    "idle" | "submitting" | "error"
  >("idle");
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [overrideAcknowledged, setOverrideAcknowledged] = React.useState(false);

  // Card refs for arrow-key roving focus.
  const cardRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    let cancelled = false;
    setTemplates({ status: "loading", items: [] });
    fetch("/api/specialty-templates", { method: "GET" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { items: SpecialtyManifest[] };
      })
      .then((data) => {
        if (cancelled) return;
        setTemplates({ status: "ready", items: data.items ?? [] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTemplates({
          status: "error",
          items: [],
          error: err instanceof Error ? err.message : "unknown_error",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const previouslyConfirmedSlug = draft.selectedSpecialty;
  const isOverride =
    previouslyConfirmedSlug != null &&
    pendingSlug != null &&
    pendingSlug !== previouslyConfirmedSlug;

  const pendingManifest =
    pendingSlug != null
      ? templates.items.find((m) => m.slug === pendingSlug) ?? null
      : null;

  function handleCardKeyDown(
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const total = templates.items.length;
    if (total === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % total;
      cardRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (index - 1 + total) % total;
      cardRefs.current[next]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const slug = templates.items[index]?.slug;
      if (slug) selectSlug(slug);
    }
  }

  function selectSlug(slug: string) {
    setPendingSlug(slug);
    setOverrideAcknowledged(false);
    setSubmitError(null);
    setSubmitState("idle");
  }

  async function confirmSelection() {
    if (!pendingSlug || !pendingManifest) return;
    if (isOverride && !overrideAcknowledged) {
      setOverrideAcknowledged(true);
      return;
    }
    setSubmitState("submitting");
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/configs/${encodeURIComponent(draft.id)}/apply-specialty`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: pendingSlug }),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      await onDraftChanged?.();
      setSubmitState("idle");
      onAdvance();
    } catch (err: unknown) {
      setSubmitState("error");
      setSubmitError(err instanceof Error ? err.message : "Failed to apply");
    }
  }

  return (
    <section
      className="space-y-8"
      aria-labelledby="step-2-specialty-heading"
    >
      <header className="space-y-2">
        <Eyebrow>Step 2 of 10</Eyebrow>
        <h2
          id="step-2-specialty-heading"
          className="font-display text-2xl font-medium text-text tracking-tight"
        >
          Select your primary specialty
        </h2>
        <p className="text-sm text-text-muted max-w-2xl">
          We&rsquo;ll preconfigure modalities, workflows, and charting templates
          based on your choice. You can refine every detail in the next steps.
        </p>
      </header>

      {templates.status === "loading" ? (
        <div
          className="rounded-xl border border-dashed border-border-strong/60 bg-surface-muted p-8 text-center text-sm text-text-muted"
          aria-live="polite"
        >
          Loading specialty templates&hellip;
        </div>
      ) : templates.status === "error" ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger"
          role="alert"
        >
          Couldn&rsquo;t load specialty templates ({templates.error}). Refresh to
          try again.
        </div>
      ) : templates.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong/60 bg-surface-muted p-8 text-center text-sm text-text-muted">
          No active specialty templates are registered yet. Ask a super-admin to
          publish one in the templates browser.
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label="Specialty templates"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {templates.items.map((manifest, idx) => (
            <SpecialtyCard
              key={manifest.slug}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              manifest={manifest}
              selected={pendingSlug === manifest.slug}
              onSelect={() => selectSlug(manifest.slug)}
              onKeyDown={(e) => handleCardKeyDown(e, idx)}
            />
          ))}
        </div>
      )}

      <div className="text-xs text-text-muted">
        <a
          href="/templates"
          className="underline underline-offset-2 hover:text-text"
        >
          See all templates &rarr;
        </a>
      </div>

      {pendingManifest && (
        <SelectionSummary
          manifest={pendingManifest}
          isOverride={isOverride}
          overrideAcknowledged={overrideAcknowledged}
          submitState={submitState}
          submitError={submitError}
          onConfirm={confirmSelection}
        />
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// SpecialtyCard
// -----------------------------------------------------------------------------

interface SpecialtyCardProps {
  manifest: SpecialtyManifest;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const SpecialtyCard = React.forwardRef<HTMLButtonElement, SpecialtyCardProps>(
  function SpecialtyCard({ manifest, selected, onSelect, onKeyDown }, ref) {
    const Icon = resolveIcon(manifest.icon);
    const includedLabel = `Included modalities: ${
      manifest.default_enabled_modalities.join(", ") || "none"
    }`;
    const excludedLabel = `Excluded modalities: ${
      manifest.default_disabled_modalities.join(", ") || "none"
    }`;

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-pressed={selected}
        aria-checked={selected}
        tabIndex={selected ? 0 : 0}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        className={cn(
          "text-left transition-all duration-200 ease-smooth",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "rounded-xl",
        )}
      >
        <Card
          tone={selected ? "raised" : "default"}
          className={cn(
            "relative h-full",
            selected
              ? "border-2 border-accent shadow-md"
              : "hover:border-border-strong hover:shadow-md",
          )}
        >
          {selected && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-ink">
              Selected
            </span>
          )}

          <CardHeader>
            <div className="flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
                aria-hidden="true"
              >
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="truncate">{manifest.name}</CardTitle>
                  <span className="rounded-full border border-border/80 bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                    v{manifest.version}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-text-muted line-clamp-3">
                  {manifest.description}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div aria-label={includedLabel}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Included
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {manifest.default_enabled_modalities.length > 0 ? (
                  manifest.default_enabled_modalities.map((m) => (
                    <Badge key={m} tone="accent">
                      {m}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-text-muted">None</span>
                )}
              </div>
            </div>

            <div aria-label={excludedLabel}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                Excluded
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {manifest.default_disabled_modalities.length > 0 ? (
                  manifest.default_disabled_modalities.map((m) => (
                    <Badge key={m} tone="warning">
                      {m}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-text-muted">None</span>
                )}
              </div>
            </div>

            <p className="pt-1 text-xs text-text-muted">
              {manifest.default_workflows_count} workflows &middot;{" "}
              {manifest.default_charting_templates_count} charting templates
            </p>
          </CardContent>
        </Card>
      </button>
    );
  },
);

// -----------------------------------------------------------------------------
// SelectionSummary
// -----------------------------------------------------------------------------

interface SelectionSummaryProps {
  manifest: SpecialtyManifest;
  isOverride: boolean;
  overrideAcknowledged: boolean;
  submitState: "idle" | "submitting" | "error";
  submitError: string | null;
  onConfirm: () => void;
}

function SelectionSummary({
  manifest,
  isOverride,
  overrideAcknowledged,
  submitState,
  submitError,
  onConfirm,
}: SelectionSummaryProps) {
  const turningOn = manifest.default_enabled_modalities.length;
  const turningOff = manifest.default_disabled_modalities.length;
  const showWarning = isOverride && !overrideAcknowledged;
  const ctaLabel = showWarning
    ? "I understand, continue"
    : submitState === "submitting"
      ? "Applying defaults…"
      : "Confirm and continue";

  return (
    <div className="space-y-3">
      <EditorialRule />
      <Card
        tone="raised"
        className="border-accent/40"
        aria-live="polite"
      >
        <CardContent className="pt-6">
          <p className="text-sm text-text">
            You selected <span className="font-medium">{manifest.name}</span>.
            This will turn on <span className="font-medium">{turningOn}</span>{" "}
            modalities and turn off{" "}
            <span className="font-medium">{turningOff}</span> modalities. You
            can adjust in the next steps.
          </p>

          {showWarning && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-highlight/30 bg-highlight-soft p-3 text-sm text-[color:var(--highlight-hover)]"
            >
              Switching specialty will overwrite the defaults you&rsquo;ve set
              in steps 3-10. Your custom edits will be lost.
            </div>
          )}

          {submitState === "error" && submitError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger"
            >
              Couldn&rsquo;t apply defaults: {submitError}
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={onConfirm}
              disabled={submitState === "submitting"}
            >
              {ctaLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

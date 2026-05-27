"use client";

// EMR-424 — Wizard Step 7: Apply charting templates.
//
// Source of defaults: the manifest of the specialty selected in step 2
// (default_charting_templates). Admin can toggle the full KNOWN_CHARTING
// catalogue on/off, see a live diff vs defaults, and restore defaults with
// one click. Specialty-adaptive — manifest is read by slug only.

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/ornament";
import { KNOWN_CHARTING } from "@/lib/onboarding/known-templates";
import { diffTemplateIds, hasDiff } from "@/lib/onboarding/template-diff";
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";
import { cn } from "@/lib/utils/cn";

import { DiffBanner } from "./_template-picker-shared";

export function Step7ApplyCharting({
  draft,
  patch,
  goNext,
  goBack,
}: WizardStepProps) {
  const [manifest, setManifest] = React.useState<SpecialtyManifest | null>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">(
    "loading",
  );

  React.useEffect(() => {
    let cancelled = false;
    if (!draft.selectedSpecialty) {
      setLoadState("ready");
      return;
    }
    fetch("/api/specialty-templates")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ items: SpecialtyManifest[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        const found =
          data.items.find((m) => m.slug === draft.selectedSpecialty) ?? null;
        setManifest(found);
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [draft.selectedSpecialty]);

  const defaults = React.useMemo(
    () => manifest?.default_charting_templates ?? [],
    [manifest],
  );
  const current = React.useMemo(
    () => draft.chartingTemplateIds ?? [],
    [draft.chartingTemplateIds],
  );

  const diff = React.useMemo(
    () => diffTemplateIds(defaults, current),
    [defaults, current],
  );

  function toggle(id: string) {
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    patch({ chartingTemplateIds: next });
  }

  function restoreDefaults() {
    patch({ chartingTemplateIds: [...defaults] });
  }

  if (loadState === "loading") {
    return (
      <div className="rounded-xl border border-dashed border-border-strong/60 bg-surface-muted p-8 text-center text-sm text-text-muted">
        Loading charting defaults…
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <Card className="p-6" tone="outlined">
        <p className="text-sm text-danger" role="alert">
          Couldn&rsquo;t load the specialty manifest. Refresh to try again.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="step-7-heading">
      <header className="space-y-2">
        <Eyebrow>Step 7 of 15</Eyebrow>
        <h2
          id="step-7-heading"
          className="font-display text-2xl font-medium text-text tracking-tight"
        >
          Apply charting templates
        </h2>
        <p className="text-sm text-text-muted max-w-2xl">
          Choose which structured note formats clinicians at{" "}
          <span className="font-medium text-text">
            {manifest?.name ?? "this specialty"}
          </span>{" "}
          will see in their chart. We&rsquo;ve preselected the recommended set.
        </p>
      </header>

      <Card tone="raised">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
                {manifest?.name ?? "Specialty"} defaults
              </p>
              <p className="text-sm text-text mt-1">
                {defaults.length} chart{" "}
                {defaults.length === 1 ? "template" : "templates"} recommended.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={restoreDefaults}
              disabled={!hasDiff(diff)}
            >
              Restore defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      <DiffBanner
        diff={diff}
        unitSingular="chart template"
        unitPlural="chart templates"
      />

      <fieldset className="grid gap-2" aria-label="All known chart templates">
        <legend className="sr-only">Chart templates</legend>
        {KNOWN_CHARTING.map((tpl) => {
          const checked = current.includes(tpl.id);
          const isDefault = defaults.includes(tpl.id);
          return (
            <label
              key={tpl.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors",
                "focus-within:ring-2 focus-within:ring-accent/30",
                checked
                  ? "border-accent bg-accent-soft/40"
                  : "border-border/80 bg-surface hover:border-border-strong",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(tpl.id)}
                className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                aria-describedby={`ct-${tpl.id}-desc`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{tpl.label}</span>
                  {isDefault && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                      Default
                    </span>
                  )}
                </div>
                <p
                  id={`ct-${tpl.id}-desc`}
                  className="text-sm text-text-muted mt-1"
                >
                  {tpl.description}
                </p>
              </div>
            </label>
          );
        })}
      </fieldset>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        <Button onClick={goNext}>Continue</Button>
      </div>
    </section>
  );
}

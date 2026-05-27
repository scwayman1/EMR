"use client";

// EMR-425 — Wizard step 9: pick the patient portal shell template.
//
// Specialty-adaptive: when the selected specialty's manifest declares
// `default_patient_portal_cards`, we surface a "Recommended for <specialty>"
// option synthesised from that manifest. Otherwise the admin picks from the
// generic catalog in `known-shell-templates.ts`. We never branch on the
// specific specialty slug.
//
// Scope: this step ONLY records `patientShellTemplateId` on the draft — the
// actual rendering of the patient shell is owned by EMR-411.

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PATIENT_SHELL_TEMPLATES,
  deriveSpecialtyPatientTemplate,
  labelForCard,
  type ShellTemplateOption,
} from "@/lib/onboarding/known-shell-templates";
import type { SpecialtyManifest } from "@/lib/specialty-templates/manifest-schema";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";
import { cn } from "@/lib/utils/cn";

type ManifestState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; manifest: SpecialtyManifest | null }
  | { status: "error"; error: string };

export function Step9PatientShell({
  draft,
  patch,
  goNext,
  goBack,
}: WizardStepProps) {
  const [manifestState, setManifestState] = React.useState<ManifestState>(
    draft.selectedSpecialty ? { status: "loading" } : { status: "idle" },
  );

  const slug = draft.selectedSpecialty ?? null;

  React.useEffect(() => {
    if (!slug) {
      setManifestState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setManifestState({ status: "loading" });
    fetch("/api/specialty-templates")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { items: SpecialtyManifest[] };
      })
      .then((data) => {
        if (cancelled) return;
        const found = data.items.find((m) => m.slug === slug) ?? null;
        setManifestState({ status: "ready", manifest: found });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setManifestState({
          status: "error",
          error: err instanceof Error ? err.message : "unknown_error",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Build the template list — the recommended one (if any) is pinned first
  // so the admin's eye lands there. Generic templates follow.
  const recommended = React.useMemo<ShellTemplateOption | null>(() => {
    if (manifestState.status !== "ready" || !manifestState.manifest) return null;
    return deriveSpecialtyPatientTemplate(
      manifestState.manifest.slug,
      manifestState.manifest.name,
      manifestState.manifest.default_patient_portal_cards,
    );
  }, [manifestState]);

  const allTemplates = React.useMemo<ShellTemplateOption[]>(() => {
    if (!recommended) return PATIENT_SHELL_TEMPLATES;
    // De-dupe by id in case a generic template ever collides with the
    // recommended id (defensive — ids are namespaced today).
    const filtered = PATIENT_SHELL_TEMPLATES.filter(
      (t) => t.id !== recommended.id,
    );
    return [recommended, ...filtered];
  }, [recommended]);

  const [selectedId, setSelectedId] = React.useState<string | null>(
    draft.patientShellTemplateId ?? null,
  );

  // Auto-select the recommended template once the manifest resolves *and*
  // the draft doesn't already have a choice. This mirrors step 3's UX.
  React.useEffect(() => {
    if (selectedId) return;
    if (recommended) {
      setSelectedId(recommended.id);
      return;
    }
    if (manifestState.status === "ready" && allTemplates[0]) {
      setSelectedId(allTemplates[0].id);
    }
  }, [recommended, manifestState.status, allTemplates, selectedId]);

  const selectedTemplate = React.useMemo(
    () => allTemplates.find((t) => t.id === selectedId) ?? null,
    [allTemplates, selectedId],
  );

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function handleConfirm() {
    if (!selectedId) return;
    patch({ patientShellTemplateId: selectedId });
    goNext();
  }

  return (
    <section className="space-y-6" aria-labelledby="step-9-patient-heading">
      <header className="space-y-1">
        <h2
          id="step-9-patient-heading"
          className="font-display text-xl font-medium text-text tracking-tight"
        >
          Choose the patient portal shell
        </h2>
        <p className="text-sm text-text-muted max-w-2xl">
          Pick the layout your patients will see when they sign in. You can
          fine-tune the surfaces later — this just sets the starting template.
        </p>
      </header>

      {manifestState.status === "loading" && (
        <div
          className="rounded-xl border border-dashed border-border-strong/60 bg-surface-muted p-6 text-center text-sm text-text-muted"
          aria-live="polite"
        >
          Loading recommendation for your specialty&hellip;
        </div>
      )}

      {manifestState.status === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-danger"
        >
          Couldn&rsquo;t load the specialty recommendation ({manifestState.error}).
          You can still pick from the templates below.
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Patient portal shell templates"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {allTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={selectedId === template.id}
            isRecommended={recommended?.id === template.id}
            onSelect={() => handleSelect(template.id)}
          />
        ))}
      </div>

      {selectedTemplate && (
        <PatientPreview template={selectedTemplate} />
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={!selectedId}>
          Continue
        </Button>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// TemplateCard — used by both step 9 and step 10.
// -----------------------------------------------------------------------------

type TemplateCardProps = {
  template: ShellTemplateOption;
  selected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
};

function TemplateCard({
  template,
  selected,
  isRecommended,
  onSelect,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "text-left transition-all duration-200 ease-smooth rounded-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
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
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{template.label}</CardTitle>
            {isRecommended && <Badge tone="accent">Recommended</Badge>}
          </div>
          <p className="mt-1.5 text-sm text-text-muted">
            {template.description}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            {template.cards.length} cards
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {template.cards.slice(0, 5).map((id) => (
              <span
                key={id}
                className="rounded-full border border-border/80 bg-surface-muted px-2 py-0.5 text-xs text-text"
              >
                {labelForCard(id)}
              </span>
            ))}
            {template.cards.length > 5 && (
              <span className="rounded-full border border-border/80 bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
                +{template.cards.length - 5} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

// -----------------------------------------------------------------------------
// PatientPreview — inline preview of the patient cards in this template.
// -----------------------------------------------------------------------------

function PatientPreview({ template }: { template: ShellTemplateOption }) {
  return (
    <Card tone="outlined" aria-live="polite" className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
        What patients will see
      </p>
      <h3 className="mt-1 font-display text-base font-medium text-text">
        {template.label}
      </h3>
      <ol className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {template.cards.map((id, idx) => (
          <li
            key={id}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface-muted px-3 py-2 text-sm text-text"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent">
              {idx + 1}
            </span>
            <span>{labelForCard(id)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

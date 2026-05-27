"use client";

// EMR-425 — Wizard step 10: pick the physician Mission Control template,
// then reorder / add / remove cards.
//
// The physician shell is more configurable than the patient shell because
// clinicians work very differently across specialties. The picker is the
// same UX as step 9, but the *selected* template gets an editable card list
// with up/down arrow buttons (no drag-and-drop library is currently
// installed in this repo — see EMR-425 ticket scope note).
//
// Persistence model: the order is captured as part of the template (i.e.
// the cards array on the option in memory) rather than as a separate field
// on the draft. The draft only stores `physicianShellTemplateId` — when the
// admin edits, we mutate a *local override* and surface it as a synthetic
// "Custom" template so the picker can keep showing it as selected. The real
// persistence shape (custom card order on the configuration row) lands with
// EMR-412; for v1 we keep the order in component state and write the
// template id only.

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PHYSICIAN_SHELL_TEMPLATES,
  deriveSpecialtyPhysicianTemplate,
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

// Master pool of physician card ids the admin can add. Built from the union
// of every known template plus the cards declared in the registered
// manifests' `default_mission_control_cards` (resolved at runtime).
const BASE_CARD_POOL = Array.from(
  new Set(PHYSICIAN_SHELL_TEMPLATES.flatMap((t) => t.cards)),
);

export function Step10PhysicianShell({
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

  const recommended = React.useMemo<ShellTemplateOption | null>(() => {
    if (manifestState.status !== "ready" || !manifestState.manifest) return null;
    return deriveSpecialtyPhysicianTemplate(
      manifestState.manifest.slug,
      manifestState.manifest.name,
      manifestState.manifest.default_mission_control_cards,
    );
  }, [manifestState]);

  const allTemplates = React.useMemo<ShellTemplateOption[]>(() => {
    if (!recommended) return PHYSICIAN_SHELL_TEMPLATES;
    const filtered = PHYSICIAN_SHELL_TEMPLATES.filter(
      (t) => t.id !== recommended.id,
    );
    return [recommended, ...filtered];
  }, [recommended]);

  const [selectedId, setSelectedId] = React.useState<string | null>(
    draft.physicianShellTemplateId ?? null,
  );

  // Working card order. Keyed off the selected template — switching templates
  // resets the editor to that template's stock card list. Edits stay in
  // local state; we persist `physicianShellTemplateId` only (see file-header).
  const [cardOrder, setCardOrder] = React.useState<string[]>([]);

  // Auto-select recommended on first load.
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

  // When the selected template id changes, reload the card order from that
  // template. This intentionally discards prior edits — switching templates
  // is a "start over" gesture in this UX.
  const selectedTemplate = React.useMemo(
    () => allTemplates.find((t) => t.id === selectedId) ?? null,
    [allTemplates, selectedId],
  );

  React.useEffect(() => {
    if (selectedTemplate) {
      setCardOrder(selectedTemplate.cards);
    } else {
      setCardOrder([]);
    }
  }, [selectedTemplate]);

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  function moveCard(index: number, direction: -1 | 1) {
    setCardOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function removeCard(index: number) {
    setCardOrder((prev) => prev.filter((_, i) => i !== index));
  }

  function addCard(id: string) {
    setCardOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function handleConfirm() {
    if (!selectedId) return;
    patch({ physicianShellTemplateId: selectedId });
    goNext();
  }

  // Pool of cards available to "Add" — base pool plus any cards declared in
  // the recommended manifest, minus what's already in the working order.
  const addablePool = React.useMemo(() => {
    const pool = new Set<string>(BASE_CARD_POOL);
    if (recommended) {
      for (const id of recommended.cards) pool.add(id);
    }
    for (const id of cardOrder) pool.delete(id);
    return Array.from(pool);
  }, [recommended, cardOrder]);

  return (
    <section className="space-y-6" aria-labelledby="step-10-physician-heading">
      <header className="space-y-1">
        <h2
          id="step-10-physician-heading"
          className="font-display text-xl font-medium text-text tracking-tight"
        >
          Choose the physician Mission Control
        </h2>
        <p className="text-sm text-text-muted max-w-2xl">
          Mission Control is the first thing your clinicians see when they sign
          in. Pick a template, then arrange the cards in the order that fits
          the way they work.
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
        aria-label="Physician Mission Control templates"
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {allTemplates.map((template) => (
          <PhysicianTemplateCard
            key={template.id}
            template={template}
            selected={selectedId === template.id}
            isRecommended={recommended?.id === template.id}
            onSelect={() => handleSelect(template.id)}
          />
        ))}
      </div>

      {selectedTemplate && (
        <CardOrderEditor
          template={selectedTemplate}
          cardOrder={cardOrder}
          addablePool={addablePool}
          onMove={moveCard}
          onRemove={removeCard}
          onAdd={addCard}
        />
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
// PhysicianTemplateCard — same shape as step 9's TemplateCard.
// (Kept local rather than shared because the patient version may diverge
//  visually as EMR-411/412 evolve.)
// -----------------------------------------------------------------------------

type PhysicianTemplateCardProps = {
  template: ShellTemplateOption;
  selected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
};

function PhysicianTemplateCard({
  template,
  selected,
  isRecommended,
  onSelect,
}: PhysicianTemplateCardProps) {
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
// CardOrderEditor — up/down arrows, remove, and add. (No drag-and-drop
// library is installed in this repo, so we use accessible buttons instead.
// See EMR-425 ticket "Scope discipline" note.)
// -----------------------------------------------------------------------------

type CardOrderEditorProps = {
  template: ShellTemplateOption;
  cardOrder: string[];
  addablePool: string[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onAdd: (id: string) => void;
};

function CardOrderEditor({
  template,
  cardOrder,
  addablePool,
  onMove,
  onRemove,
  onAdd,
}: CardOrderEditorProps) {
  return (
    <Card tone="outlined" aria-live="polite" className="p-5 space-y-4">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Mission Control card order
        </p>
        <h3 className="mt-1 font-display text-base font-medium text-text">
          {template.label}
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          Use the up and down arrows to reorder. Cards render top-to-bottom in
          the order shown.
        </p>
      </header>

      {cardOrder.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong/60 bg-surface-muted p-4 text-sm text-text-muted text-center">
          No cards in this template. Add one from the list below.
        </p>
      ) : (
        <ol className="space-y-2">
          {cardOrder.map((id, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === cardOrder.length - 1;
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface px-3 py-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-text">
                  {labelForCard(id)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMove(idx, -1)}
                    disabled={isFirst}
                    aria-label={`Move ${labelForCard(id)} up`}
                  >
                    {"↑"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMove(idx, 1)}
                    disabled={isLast}
                    aria-label={`Move ${labelForCard(id)} down`}
                  >
                    {"↓"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(idx)}
                    aria-label={`Remove ${labelForCard(id)}`}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {addablePool.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Add a card
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {addablePool.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onAdd(id)}
                className="rounded-full border border-border/80 bg-surface-muted px-2.5 py-1 text-xs text-text hover:border-accent hover:text-accent transition-colors"
              >
                + {labelForCard(id)}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

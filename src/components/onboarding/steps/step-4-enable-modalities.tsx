"use client";

// EMR-423 — Practice Onboarding Controller v1, wizard step 4.
// Lets the admin pick which treatment modalities are ENABLED for this
// practice. The selected specialty's manifest seeds the default; the admin
// can adjust within the dependency graph from MODALITY_META (EMR-410).
//
// Architecture rules:
//  - Specialty-adaptive. NO `if (specialty === 'cannabis')` branches.
//  - Cannabis Medicine defaults OFF for any non-cannabis specialty because
//    that specialty's manifest puts it in default_disabled_modalities — the
//    seed is read verbatim, never re-derived from the slug.
//  - Toggling Cannabis Medicine ON triggers an inline regulatory &
//    compliance acknowledgement BEFORE the patch is applied.
//  - Dependency graph from MODALITY_META is enforced both directions.

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MODALITY_META, type ModalityId, type ModalityMeta } from "@/lib/modality/registry";
import {
  REGISTERED_MODALITIES,
  type SpecialtyManifest,
} from "@/lib/specialty-templates/manifest-schema";
import { useActiveManifest } from "./preview-chrome";
import type {
  WizardStepDefinition,
  WizardStepProps,
} from "@/lib/onboarding/wizard-types";
import { cn } from "@/lib/utils/cn";

const CANNABIS_MODALITY_ID: ModalityId = "cannabis-medicine";

const CANNABIS_ACK_TITLE = "Regulatory & compliance acknowledgement";
const CANNABIS_ACK_BODY =
  "Cannabis Medicine introduces controlled-substance workflows, additional " +
  "state regulatory requirements, and patient education obligations. By " +
  "enabling this modality you confirm you have reviewed your state's " +
  "medical cannabis program rules.";

type ModalitySet = Set<ModalityId>;

/** Closure of `requires` — every transitive prerequisite of `id`. */
function collectRequires(id: ModalityId): ModalityId[] {
  const seen = new Set<ModalityId>();
  const stack: ModalityId[] = [...MODALITY_META[id].requires];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...MODALITY_META[next].requires);
  }
  return Array.from(seen);
}

/** Currently-enabled dependents of `id` — i.e. things that would break. */
function collectEnabledDependents(
  id: ModalityId,
  enabled: ModalitySet,
): ModalityId[] {
  const seen = new Set<ModalityId>();
  const stack: ModalityId[] = [...MODALITY_META[id].dependents];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...MODALITY_META[next].dependents);
  }
  return Array.from(seen).filter((m) => enabled.has(m));
}

export function Step4EnableModalities({
  draft,
  patch,
  goNext,
  goBack,
}: WizardStepProps) {
  const template = useActiveManifest(draft.selectedSpecialty);

  // Seed: prefer existing draft.enabledModalities; fall back to manifest.
  const seedEnabled = useMemo<ModalitySet>(() => {
    if (Array.isArray(draft.enabledModalities)) {
      return new Set(draft.enabledModalities as ModalityId[]);
    }
    if (template) {
      return new Set(template.default_enabled_modalities as ModalityId[]);
    }
    return new Set();
  }, [draft.enabledModalities, template]);

  const [enabled, setEnabled] = useState<ModalitySet>(seedEnabled);

  // If the underlying seed changes (e.g. specialty changes upstream), reset.
  useEffect(() => {
    setEnabled(new Set(seedEnabled));
  }, [seedEnabled]);

  // Auto-enable banner — last batch of modalities pulled in by `requires`.
  const [autoEnabled, setAutoEnabled] = useState<ModalityId[]>([]);

  // Disable-confirmation prompt for breaking the dependency graph.
  const [pendingDisable, setPendingDisable] = useState<{
    id: ModalityId;
    breaks: ModalityId[];
  } | null>(null);

  // Cannabis acknowledgement modal state.
  const [pendingCannabis, setPendingCannabis] = useState<boolean>(false);

  function commit(next: ModalitySet) {
    setEnabled(new Set(next));
    patch({ enabledModalities: Array.from(next) });
  }

  function handleEnable(id: ModalityId) {
    // Cannabis special case — gate behind the acknowledgement.
    if (id === CANNABIS_MODALITY_ID) {
      setPendingCannabis(true);
      return;
    }
    enableNow(id);
  }

  function enableNow(id: ModalityId) {
    const next = new Set(enabled);
    next.add(id);
    const pulled: ModalityId[] = [];
    for (const req of collectRequires(id)) {
      if (!next.has(req)) {
        next.add(req);
        pulled.push(req);
      }
    }
    setAutoEnabled(pulled);
    commit(next);
  }

  function handleDisable(id: ModalityId) {
    const breaks = collectEnabledDependents(id, enabled);
    if (breaks.length > 0) {
      setPendingDisable({ id, breaks });
      return;
    }
    disableNow(id, []);
  }

  function disableNow(id: ModalityId, alsoDisable: ModalityId[]) {
    const next = new Set(enabled);
    next.delete(id);
    for (const dep of alsoDisable) next.delete(dep);
    setAutoEnabled([]);
    commit(next);
  }

  function confirmCannabis() {
    setPendingCannabis(false);
    enableNow(CANNABIS_MODALITY_ID);
  }

  function cancelCannabis() {
    setPendingCannabis(false);
  }

  const hiddenModules = useMemo(() => {
    if (!template) return [] as { module: string; modality: ModalityId }[];
    const out: { module: string; modality: ModalityId }[] = [];
    for (const mod of template.default_modules) {
      const owner = REGISTERED_MODALITIES.find((id) => {
        const meta = MODALITY_META[id as ModalityId] as ModalityMeta & { modules?: string[] };
        return meta.modules?.includes(mod);
      }) as ModalityId | undefined;
      if (owner && !enabled.has(owner)) {
        out.push({ module: mod, modality: owner });
      }
    }
    return out;
  }, [template, enabled]);

  if (!template) {
    return (
      <Card className="p-6">
        <h2 className="font-display text-lg font-medium text-text">
          We couldn{"’"}t load that specialty template
        </h2>
        <p className="text-sm text-text-muted mt-2">
          The specialty selected earlier ({draft.selectedSpecialty ?? "none"})
          isn{"’"}t registered any more. Go back and pick another specialty to
          continue setting up this practice.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={goBack}>
            Go back
          </Button>
        </div>
      </Card>
    );
  }

  const canContinue = enabled.size > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-medium text-text tracking-tight">
          Enable modalities
        </h2>
        <p className="text-sm text-text-muted">
          We{"’"}ve seeded these from your{" "}
          <span className="font-medium text-text">{template.name}</span> template.
          Toggle any modality on or off — required modalities are pulled in
          automatically.
        </p>
      </header>

      {autoEnabled.length > 0 && (
        <Card tone="outlined" className="p-4 border-info/40">
          <p className="text-sm text-text">
            Also enabling:{" "}
            <span className="font-medium">
              {autoEnabled
                .map((id) => MODALITY_META[id].label)
                .join(", ")}
            </span>{" "}
            (required).
          </p>
        </Card>
      )}

      <div className="grid gap-3" role="group" aria-label="Modalities">
        {REGISTERED_MODALITIES.map((modalityId) => {
          const id = modalityId as ModalityId;
          const meta = MODALITY_META[id];
          const isOn = enabled.has(id);
          const isCannabis = id === CANNABIS_MODALITY_ID;
          const wasSeededOn = template.default_enabled_modalities.includes(id);
          const blockedBy = meta.requires.filter((r) => !enabled.has(r));
          const dependentsAtRisk = collectEnabledDependents(id, enabled);

          return (
            <label
              key={id}
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 ease-smooth cursor-pointer",
                "focus-within:ring-2 focus-within:ring-accent/30",
                isOn
                  ? "border-accent bg-accent-soft shadow-sm"
                  : "border-border/80 bg-surface hover:border-border-strong hover:shadow-sm",
              )}
            >
              <input
                type="checkbox"
                role="switch"
                checked={isOn}
                onChange={(e) =>
                  e.target.checked ? handleEnable(id) : handleDisable(id)
                }
                aria-describedby={`modality-${id}-desc`}
                aria-label={`Enable ${meta.label}`}
                className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{meta.label}</span>
                  {wasSeededOn && (
                    <Badge tone="accent">Recommended for {template.name}</Badge>
                  )}
                  {isCannabis && (
                    <Badge tone="warning">Regulatory acknowledgement</Badge>
                  )}
                </div>
                <p
                  id={`modality-${id}-desc`}
                  className="text-sm text-text-muted mt-1"
                >
                  {meta.description}
                </p>
                <p className="text-xs text-text-muted/80 mt-2">
                  Affects: {meta.surfaces.join(", ")}
                </p>
                {!isOn && blockedBy.length > 0 && (
                  <p className="text-xs text-info mt-1">
                    Enabling this also enables:{" "}
                    {blockedBy
                      .map((r) => MODALITY_META[r].label)
                      .join(", ")}
                    .
                  </p>
                )}
                {isOn && dependentsAtRisk.length > 0 && (
                  <p className="text-xs text-[color:var(--highlight-hover)] mt-1">
                    {dependentsAtRisk
                      .map((d) => MODALITY_META[d].label)
                      .join(", ")}{" "}
                    {dependentsAtRisk.length === 1 ? "requires" : "require"}{" "}
                    this modality.
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <Card tone="outlined" className="p-4">
        <h3 className="font-display text-sm font-medium text-text">
          Modules hidden by your selections
        </h3>
        {hiddenModules.length === 0 ? (
          <p className="text-sm text-text-muted mt-1">
            All modules from the {template.name} template are visible with the
            current selections.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-text-muted">
            {hiddenModules.map(({ module, modality }) => (
              <li key={module} className="flex items-center gap-2">
                <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">
                  {module}
                </code>
                <span className="text-xs">
                  needs {MODALITY_META[modality].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pendingDisable && (
        <DependencyConfirmDialog
          target={pendingDisable.id}
          breaks={pendingDisable.breaks}
          onCancel={() => setPendingDisable(null)}
          onConfirm={() => {
            const { id, breaks } = pendingDisable;
            setPendingDisable(null);
            disableNow(id, breaks);
          }}
        />
      )}

      {pendingCannabis && (
        <CannabisAckDialog
          onCancel={cancelCannabis}
          onConfirm={confirmCannabis}
        />
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        <Button onClick={goNext} disabled={!canContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline dialogs
//
// Inline (NOT window.confirm) so screen readers, keyboard focus, and copy
// review all behave the same way the rest of the wizard does.
// ---------------------------------------------------------------------------

function DependencyConfirmDialog({
  target,
  breaks,
  onCancel,
  onConfirm,
}: {
  target: ModalityId;
  breaks: ModalityId[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const targetLabel = MODALITY_META[target].label;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dep-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <Card className="max-w-md w-full p-6">
        <h3
          id="dep-dialog-title"
          className="font-display text-lg font-medium text-text"
        >
          Disable {targetLabel}?
        </h3>
        <p className="text-sm text-text-muted mt-2">
          The following will be disabled because they require {targetLabel}:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-text">
          {breaks.map((id) => (
            <li key={id}>{MODALITY_META[id].label}</li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Disable all
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CannabisAckDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cannabis-ack-title"
      aria-describedby="cannabis-ack-body"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <Card className="max-w-md w-full p-6">
        <h3
          id="cannabis-ack-title"
          className="font-display text-lg font-medium text-text"
        >
          {CANNABIS_ACK_TITLE}
        </h3>
        <p id="cannabis-ack-body" className="text-sm text-text-muted mt-2">
          {CANNABIS_ACK_BODY}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>I understand — enable</Button>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step definition
// ---------------------------------------------------------------------------

export const step4EnableModalitiesDefinition: WizardStepDefinition = {
  id: "enable-modalities",
  title: "Enable modalities",
  description: "Turn on the treatment modalities this practice offers.",
  Component: Step4EnableModalities,
  isComplete: (draft) =>
    Array.isArray(draft.enabledModalities) && draft.enabledModalities.length > 0,
  isReachable: (draft) => draft.careModel != null,
};

"use client";

// EMR-423 — Practice Onboarding Controller v1, wizard step 5.
//
// Mirror of step 4: lets the admin EXPLICITLY mark modalities as disabled.
// "disabled" here is stronger than "not enabled" — it means the practice
// considered this modality and turned it off (records a deliberate decision
// for the audit trail). enabledModalities ∪ disabledModalities ⊆
// REGISTERED_MODALITIES; the union does not have to be the whole set.
//
// Architecture rules:
//  - Specialty-adaptive. NO `if (specialty === 'cannabis')` branches.
//  - Dependency graph from MODALITY_META is enforced both directions, the
//    same way step 4 enforces it.
//  - This step is ALWAYS isComplete (admin may explicitly disable nothing)
//    and is reachable as soon as the care model is selected — it does not
//    depend on step 4 having been visited.

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MODALITY_META, type ModalityId } from "@/lib/modality/registry";
import {
  REGISTERED_MODALITIES,
  type SpecialtyManifest,
} from "@/lib/specialty-templates/manifest-schema";
import { getSpecialtyTemplate } from "@/lib/specialty-templates/registry";
import type {
  WizardStepDefinition,
  WizardStepProps,
} from "@/lib/onboarding/wizard-types";
import { cn } from "@/lib/utils/cn";

type ModalitySet = Set<ModalityId>;

/** Modalities whose `dependents` chain leads back to `id` and are still in `pool`. */
function collectDependentsInPool(
  id: ModalityId,
  pool: ModalitySet,
): ModalityId[] {
  const seen = new Set<ModalityId>();
  const stack: ModalityId[] = [...MODALITY_META[id].dependents];
  while (stack.length > 0) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...MODALITY_META[next].dependents);
  }
  return Array.from(seen).filter((m) => pool.has(m));
}

export function Step5DisableModalities({
  draft,
  patch,
  goNext,
  goBack,
}: WizardStepProps) {
  const [template, setTemplate] = useState<SpecialtyManifest | null>(() =>
    draft.selectedSpecialty
      ? getSpecialtyTemplate(draft.selectedSpecialty)
      : null,
  );

  useEffect(() => {
    if (!draft.selectedSpecialty) {
      setTemplate(null);
      return;
    }
    setTemplate(getSpecialtyTemplate(draft.selectedSpecialty));
  }, [draft.selectedSpecialty]);

  const enabled = useMemo<ModalitySet>(
    () => new Set((draft.enabledModalities as ModalityId[] | undefined) ?? []),
    [draft.enabledModalities],
  );

  // Seed disabled: prefer existing draft.disabledModalities; fall back to
  // manifest's default_disabled_modalities, but filter out anything currently
  // in `enabled` (mutual exclusion is a hard invariant).
  const seedDisabled = useMemo<ModalitySet>(() => {
    if (Array.isArray(draft.disabledModalities)) {
      return new Set(
        (draft.disabledModalities as ModalityId[]).filter(
          (m) => !enabled.has(m),
        ),
      );
    }
    if (template) {
      return new Set(
        (template.default_disabled_modalities as ModalityId[]).filter(
          (m) => !enabled.has(m),
        ),
      );
    }
    return new Set();
  }, [draft.disabledModalities, template, enabled]);

  const [disabled, setDisabled] = useState<ModalitySet>(seedDisabled);

  useEffect(() => {
    setDisabled(new Set(seedDisabled));
  }, [seedDisabled]);

  // Cascade-disable confirmation — when disabling X would leave dependents
  // hanging, surface them and require explicit confirmation.
  const [pendingCascade, setPendingCascade] = useState<{
    id: ModalityId;
    cascade: ModalityId[];
  } | null>(null);

  function commit(next: ModalitySet) {
    setDisabled(new Set(next));
    patch({ disabledModalities: Array.from(next) });
  }

  function handleDisableToggle(id: ModalityId, on: boolean) {
    if (!on) {
      // Un-disable — clears the explicit-off mark.
      const next = new Set(disabled);
      next.delete(id);
      commit(next);
      return;
    }
    // Disabling something means: "we considered this and turn it off." Any
    // candidate-pool dependents (i.e. things in the same disabled-candidate
    // pool) that require this should also be marked disabled.
    const pool = new Set<ModalityId>(
      REGISTERED_MODALITIES.filter((m) => !enabled.has(m as ModalityId)) as ModalityId[],
    );
    const cascade = collectDependentsInPool(id, pool).filter(
      (m) => !disabled.has(m),
    );
    if (cascade.length > 0) {
      setPendingCascade({ id, cascade });
      return;
    }
    const next = new Set(disabled);
    next.add(id);
    commit(next);
  }

  function confirmCascade() {
    if (!pendingCascade) return;
    const { id, cascade } = pendingCascade;
    const next = new Set(disabled);
    next.add(id);
    for (const m of cascade) next.add(m);
    setPendingCascade(null);
    commit(next);
  }

  // Candidates: every registered modality NOT currently in `enabled`. The
  // admin may then mark any subset of those as explicitly disabled.
  const candidates = useMemo(
    () =>
      REGISTERED_MODALITIES.filter(
        (m) => !enabled.has(m as ModalityId),
      ) as ModalityId[],
    [enabled],
  );

  // Live "modules hidden" preview — uses the *enabled* set as the source of
  // truth (modules are hidden whenever their owning modality is not enabled,
  // regardless of whether the admin explicitly disabled it). Disabled
  // modalities are highlighted in the list.
  const hiddenModules = useMemo(() => {
    if (!template) return [] as { module: string; modality: ModalityId; explicit: boolean }[];
    const out: { module: string; modality: ModalityId; explicit: boolean }[] = [];
    for (const mod of template.default_modules) {
      const owner = REGISTERED_MODALITIES.find((id) =>
        MODALITY_META[id as ModalityId].modules.includes(mod),
      ) as ModalityId | undefined;
      if (owner && !enabled.has(owner)) {
        out.push({ module: mod, modality: owner, explicit: disabled.has(owner) });
      }
    }
    return out;
  }, [template, enabled, disabled]);

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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-medium text-text tracking-tight">
          Explicitly disable modalities
        </h2>
        <p className="text-sm text-text-muted">
          Mark any modalities you{"’"}ve deliberately considered and turned
          off. This is recorded for compliance — modalities the practice never
          had any intention of using don{"’"}t need to be marked here.
        </p>
      </header>

      {candidates.length === 0 ? (
        <Card tone="outlined" className="p-6 text-center">
          <p className="text-sm text-text-muted">
            Every registered modality is currently enabled. There{"’"}s nothing
            to mark as disabled. Go back to step 4 to adjust enabled modalities.
          </p>
        </Card>
      ) : (
        <div
          className="grid gap-3"
          role="group"
          aria-label="Modalities considered and disabled"
        >
          {candidates.map((id) => {
            const meta = MODALITY_META[id];
            const isOff = disabled.has(id);
            const wasSeededOff =
              template.default_disabled_modalities.includes(id);
            return (
              <label
                key={id}
                className={cn(
                  "flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 ease-smooth cursor-pointer",
                  "focus-within:ring-2 focus-within:ring-accent/30",
                  isOff
                    ? "border-[color:var(--highlight)] bg-highlight-soft"
                    : "border-border/80 bg-surface hover:border-border-strong hover:shadow-sm",
                )}
              >
                <input
                  type="checkbox"
                  role="switch"
                  checked={isOff}
                  onChange={(e) =>
                    handleDisableToggle(id, e.target.checked)
                  }
                  aria-describedby={`disable-${id}-desc`}
                  aria-label={`Disable ${meta.label}`}
                  className="mt-1 h-4 w-4 accent-[color:var(--highlight-hover)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{meta.label}</span>
                    {wasSeededOff && (
                      <Badge tone="warning">
                        Off by default for {template.name}
                      </Badge>
                    )}
                  </div>
                  <p
                    id={`disable-${id}-desc`}
                    className="text-sm text-text-muted mt-1"
                  >
                    {meta.description}
                  </p>
                  <p className="text-xs text-text-muted/80 mt-2">
                    Hides: {meta.surfaces.join(", ")}
                    {meta.modules.length > 0 && (
                      <>
                        {" · "}
                        Modules: {meta.modules.join(", ")}
                      </>
                    )}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      )}

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
            {hiddenModules.map(({ module, modality, explicit }) => (
              <li key={module} className="flex items-center gap-2">
                <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">
                  {module}
                </code>
                <span className="text-xs">
                  needs {MODALITY_META[modality].label}
                </span>
                {explicit && <Badge tone="warning">explicitly off</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pendingCascade && (
        <CascadeConfirmDialog
          target={pendingCascade.id}
          cascade={pendingCascade.cascade}
          onCancel={() => setPendingCascade(null)}
          onConfirm={confirmCascade}
        />
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        <Button onClick={goNext}>Continue</Button>
      </div>
    </div>
  );
}

function CascadeConfirmDialog({
  target,
  cascade,
  onCancel,
  onConfirm,
}: {
  target: ModalityId;
  cascade: ModalityId[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const targetLabel = MODALITY_META[target].label;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cascade-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <Card className="max-w-md w-full p-6">
        <h3
          id="cascade-dialog-title"
          className="font-display text-lg font-medium text-text"
        >
          Also disable dependents?
        </h3>
        <p className="text-sm text-text-muted mt-2">
          The following also require {targetLabel} and will be marked disabled:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-text">
          {cascade.map((id) => (
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

export const step5DisableModalitiesDefinition: WizardStepDefinition = {
  id: "disable-modalities",
  title: "Disable modalities",
  description: "Turn off any modalities not relevant to this practice.",
  Component: Step5DisableModalities,
  // Always complete — the admin may explicitly disable nothing.
  isComplete: () => true,
  // Independent of step 4 — reachable as soon as care model is set.
  isReachable: (draft) => draft.careModel != null,
};

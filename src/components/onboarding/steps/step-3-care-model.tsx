"use client";

// EMR-422 — Practice Onboarding Controller v1, wizard step 3.
// Lets an admin pick the care model / workflow archetype for the practice.
// The list of valid care models comes from EMR-429's manifest schema. The
// *recommended* default is read from the selected specialty's template
// (EMR-408) — never hardcoded per-specialty here. Admin can override; an
// override requires a written justification which is recorded in the
// controller audit log (EMR-428).

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldGroup, Textarea } from "@/components/ui/input";
import { CARE_MODELS, type CareModel } from "@/lib/specialty-templates/manifest-schema";
import { getSpecialtyTemplate } from "@/lib/specialty-templates/registry";
import type { PracticeConfigDraft } from "@/lib/practice-config/types";
import type { WizardStepDefinition, WizardStepProps } from "@/lib/onboarding/wizard-types";
// TODO(EMR-428): swap to real helper when the audit-stub branch lands; the
// import path is already canonical.
import { logControllerAction } from "@/lib/auth/audit-stub";
import { cn } from "@/lib/utils/cn";

const REASON_MIN = 50;
const REASON_MAX = 500;

/**
 * Friendly labels + descriptions for each care model. The *values* (the keys
 * of this map) come from EMR-429's enum — not invented here. Labels are safe
 * to hardcode; they're UI copy.
 */
const CARE_MODEL_OPTIONS: Record<
  CareModel,
  { label: string; description: string }
> = {
  "longitudinal-primary-care": {
    label: "Longitudinal primary care",
    description:
      "Ongoing primary-care relationship. Annual wellness, chronic disease management, and routine preventive care.",
  },
  "longitudinal-interventional": {
    label: "Longitudinal interventional",
    description:
      "Continuing care for a defined condition with in-clinic procedures (injections, blocks, ablations) and follow-up.",
  },
  "certification-longitudinal": {
    label: "Certification + longitudinal follow-up",
    description:
      "Initial certification or qualifying visit followed by structured follow-up cadence and outcomes tracking.",
  },
  consultative: {
    label: "Consultative",
    description:
      "Episodic, referral-driven specialist consults. Patients return to their referring clinician after evaluation.",
  },
  "procedural-only": {
    label: "Procedural only",
    description:
      "Procedure-centric workflow with minimal longitudinal follow-up. Patients seen for a defined treatment course.",
  },
};

export function Step3CareModel({ draft, onPatch, onNext, onBack }: WizardStepProps) {
  const template = useMemo(
    () => getSpecialtyTemplate(draft.selectedSpecialty),
    [draft.selectedSpecialty]
  );

  // Manifest could legitimately be missing if a specialty was registered when
  // the draft was created but later removed. Render a recoverable error.
  if (!template) {
    return (
      <Card className="p-6">
        <h2 className="font-display text-lg font-medium text-text">
          We couldn{"’"}t load that specialty template
        </h2>
        <p className="text-sm text-text-muted mt-2">
          The specialty selected in the previous step ({draft.selectedSpecialty ?? "none"})
          isn{"’"}t registered any more. Go back and pick another specialty to
          continue setting up this practice.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={onBack}>
            Go back to step 2
          </Button>
        </div>
      </Card>
    );
  }

  const defaultCareModel = template.default_care_model;
  const [selected, setSelected] = useState<CareModel>(
    (draft.careModel as CareModel | null) ?? defaultCareModel
  );
  const [reason, setReason] = useState<string>(draft.careModelOverrideReason ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverride = selected !== defaultCareModel;
  const reasonLength = reason.trim().length;
  const reasonValid =
    !isOverride || (reasonLength >= REASON_MIN && reasonLength <= REASON_MAX);
  const canContinue = !submitting && reasonValid;

  async function handleConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await onPatch({
        careModel: selected,
        careModelOverrideReason: isOverride ? reason.trim() : null,
      });

      if (isOverride) {
        // TODO(EMR-428): integrate once the real audit logger lands. For now
        // we call the stub so the contract is exercised end-to-end.
        await logControllerAction({
          actor: "current-user", // TODO(EMR-428): wire actual Clerk actor id
          action: "care_model_override",
          targetId: draft.id,
          before: defaultCareModel,
          after: selected,
          reason: reason.trim(),
        });
      }

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save care model.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="font-display text-xl font-medium text-text tracking-tight">
          Choose this practice{"’"}s care model
        </h2>
        <p className="text-sm text-text-muted">
          We{"’"}ve recommended one based on your{" "}
          <span className="font-medium text-text">{template.name}</span> template. You
          can override it — overrides are logged for compliance review.
        </p>
      </header>

      <fieldset
        className="grid gap-3"
        aria-label="Care model"
      >
        <legend className="sr-only">Care model</legend>
        {CARE_MODELS.map((value) => {
          const opt = CARE_MODEL_OPTIONS[value];
          const isSelected = selected === value;
          const isRecommended = value === defaultCareModel;
          return (
            <label
              key={value}
              className={cn(
                "block cursor-pointer rounded-xl border p-4 transition-all duration-200 ease-smooth",
                "focus-within:ring-2 focus-within:ring-accent/30",
                isSelected
                  ? "border-accent bg-accent-soft shadow-sm"
                  : "border-border/80 bg-surface hover:border-border-strong hover:shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="care-model"
                  value={value}
                  checked={isSelected}
                  onChange={() => setSelected(value)}
                  className="mt-1.5 h-4 w-4 accent-[color:var(--accent)]"
                  aria-describedby={`care-model-${value}-desc`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-text">{opt.label}</span>
                    {isRecommended && (
                      <Badge tone="accent">Recommended for {template.name}</Badge>
                    )}
                  </div>
                  <p
                    id={`care-model-${value}-desc`}
                    className="text-sm text-text-muted mt-1"
                  >
                    {opt.description}
                  </p>
                </div>
              </div>
            </label>
          );
        })}
      </fieldset>

      {isOverride && (
        <Card className="p-4" tone="outlined">
          <FieldGroup
            label={`Reason for override (required, ${REASON_MIN}–${REASON_MAX} chars)`}
            hint={`${reasonLength}/${REASON_MAX} characters`}
            htmlFor="care-model-override-reason"
            error={
              reasonLength > 0 && !reasonValid
                ? reasonLength < REASON_MIN
                  ? `Please write at least ${REASON_MIN} characters explaining the override.`
                  : `Please keep the reason under ${REASON_MAX} characters.`
                : undefined
            }
          >
            <Textarea
              id="care-model-override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX}
              rows={4}
              placeholder={`Why is "${CARE_MODEL_OPTIONS[selected].label}" a better fit than the recommended "${CARE_MODEL_OPTIONS[defaultCareModel].label}" for this ${template.name} practice?`}
            />
          </FieldGroup>
        </Card>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={!canContinue}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

export const step3CareModelDefinition: WizardStepDefinition = {
  id: "care-model",
  label: "Care model",
  hint: "How this practice delivers care.",
  component: Step3CareModel,
  isComplete: (draft: PracticeConfigDraft) => draft.careModel != null,
  isReachable: (draft: PracticeConfigDraft) => draft.selectedSpecialty != null,
};

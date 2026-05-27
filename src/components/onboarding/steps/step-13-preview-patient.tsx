"use client";

// EMR-427 — Step 13: Preview the patient shell against the draft config.
//
// The dedicated patient shell renderer ships in EMR-446. Until then this
// step renders a placeholder card listing the patient template's `cards`
// array (resolved from the active specialty manifest) so reviewers can at
// least eyeball what surfaces the patient will see post-publish.
//
// Specialty-adaptive: never branches on a specific specialty slug — the
// card list comes straight from the manifest's
// `default_patient_portal_cards`.

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";
import type { PracticeConfiguration as _PracticeConfiguration } from "@/lib/practice-config/types";
import {
  PreviewBanner,
  DraftSummaryPanel,
  useActiveManifest,
} from "./preview-chrome";
import { summarizeDraft } from "@/lib/onboarding/draft-summary";

export function Step13PreviewPatient({
  draft,
  goBack,
  goNext,
  isLast,
}: WizardStepProps) {
  const manifest = useActiveManifest(draft.selectedSpecialty);
  const summary = summarizeDraft(draft, manifest);

  // EMR-427: previewing draft as if published — required fields are
  // validated by the publish step before this is reachable
  const _previewConfig = draft as _PracticeConfiguration;

  const cards = manifest?.default_patient_portal_cards ?? [];
  const templateId = draft.patientShellTemplateId ?? null;

  return (
    <div className="space-y-6">
      <PreviewBanner />

      <section aria-label="Patient shell preview">
        <Card
          tone="outlined"
          className="p-6"
          data-testid="patient-shell-preview-stub"
        >
          <p className="text-xs uppercase tracking-wide text-text-muted">
            Patient shell preview
          </p>
          <p className="text-sm text-text mt-1">
            Template:{" "}
            <span className="font-mono text-text-muted">
              {templateId ?? "—"}
            </span>
          </p>
          {cards.length > 0 ? (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {cards.map((card) => (
                <li
                  key={card}
                  className="rounded-md border border-border/70 bg-surface px-3 py-2 text-text"
                >
                  <span className="font-mono text-xs text-text-muted mr-2">
                    card
                  </span>
                  {card}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              No patient portal cards declared for this specialty.
            </p>
          )}
          <p className="text-xs text-text-muted mt-5 italic">
            Patient shell renderer ships in EMR-446.
          </p>
        </Card>
      </section>

      <DraftSummaryPanel summary={summary} />

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        {!isLast && (
          <Button onClick={goNext}>
            Continue to practice admin preview
          </Button>
        )}
      </div>
    </div>
  );
}

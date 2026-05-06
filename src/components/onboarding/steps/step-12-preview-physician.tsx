"use client";

// EMR-427 — Step 12: Preview the physician shell against the draft config.
//
// Specialty-adaptive: this step never branches on the selected specialty.
// It hands the draft to <PhysicianShell> (EMR-445) and renders a shared
// summary panel — the shell itself decides what to display based on the
// draft's `physicianShellTemplateId` and modality flags.

import { Button } from "@/components/ui/button";
import { PhysicianShell } from "@/components/shell/physician-shell";
import type { PracticeConfiguration } from "@/lib/practice-config/types";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";
import {
  PreviewBanner,
  DraftSummaryPanel,
  useDraftSummary,
} from "./preview-chrome";

export function Step12PreviewPhysician({
  draft,
  goBack,
  goNext,
  isLast,
}: WizardStepProps) {
  const summary = useDraftSummary(draft);

  // EMR-427: previewing draft as if published — required fields are
  // validated by the publish step before this is reachable
  const previewConfig = draft as PracticeConfiguration;

  return (
    <div className="space-y-6">
      <PreviewBanner />

      <section aria-label="Physician shell preview">
        <PhysicianShell config={previewConfig} />
      </section>

      <DraftSummaryPanel summary={summary} />

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        {!isLast && (
          <Button onClick={goNext}>Continue to patient preview</Button>
        )}
      </div>
    </div>
  );
}

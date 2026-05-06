"use client";

// EMR-427 — Step 14: Preview the practice-admin shell against the draft.
//
// Specialty-adaptive: this step never branches on the selected specialty.
// It hands the draft to <PracticeAdminShell> (EMR-447), which decides what
// to surface based on the draft's templates and modality flags.

import { Button } from "@/components/ui/button";
import { PracticeAdminShell } from "@/components/shell/practice-admin-shell";
import type { PracticeConfiguration } from "@/lib/practice-config/types";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";
import {
  PreviewBanner,
  DraftSummaryPanel,
  useDraftSummary,
} from "./preview-chrome";

export function Step14PreviewPracticeAdmin({
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

      <section aria-label="Practice admin shell preview">
        <PracticeAdminShell config={previewConfig} />
      </section>

      <DraftSummaryPanel summary={summary} />

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={goBack}>
          Back
        </Button>
        {!isLast && <Button onClick={goNext}>Continue to publish</Button>}
      </div>
    </div>
  );
}

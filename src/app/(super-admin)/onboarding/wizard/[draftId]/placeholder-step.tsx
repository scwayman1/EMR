"use client";

// Placeholder step body used by `WIZARD_STEPS` for slots that haven't been
// implemented yet. It surfaces a friendly empty state plus a "Skip for now"
// affordance so the wizard remains navigable end-to-end during development.
//
// Real step implementations (EMR-420/421/422/...) replace this component in
// `wizard-steps.ts`.

import { Button } from "@/components/ui/button";
import { EmptyIllustration } from "@/components/ui/ornament";
import type { WizardStepProps } from "@/lib/onboarding/wizard-types";

export function PlaceholderStep({ goNext, isLast }: WizardStepProps) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <EmptyIllustration size={120} className="mb-6 opacity-80" />
      <h3 className="font-display text-xl text-text tracking-tight">
        This step is coming soon
      </h3>
      <p className="text-sm text-text-muted mt-2 max-w-md">
        We&rsquo;re still wiring up this part of the configuration. You can
        skip it for now and come back later — your draft is autosaved.
      </p>
      {!isLast && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={goNext}
        >
          Skip for now
        </Button>
      )}
    </div>
  );
}

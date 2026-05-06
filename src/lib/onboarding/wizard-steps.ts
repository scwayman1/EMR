// Wizard step registry.
//
// Owns the canonical *order* of the 15 onboarding steps and keeps a
// `WizardStepDefinition` for each slot. Other tickets (EMR-420/421/422/...)
// replace placeholder slots with real step bodies as they ship.
//
// Rules for editing this file:
//  - The order of `WIZARD_STEPS` is the order shown in the rail.
//  - Step IDs must remain stable — they're persisted server-side.
//  - Default `isReachable` requires all *prior* steps to be complete.
//  - Placeholder steps render the `PlaceholderStep` body and are skippable
//    so the shell stays navigable while real steps are still being built.

import { PlaceholderStep } from "@/app/(super-admin)/onboarding/wizard/[draftId]/placeholder-step";
import type {
  PracticeConfiguration,
  WizardStepDefinition,
  WizardStepId,
} from "./wizard-types";

/** Default reachability: prior step must be complete (or first step). */
function priorComplete(priorId: WizardStepId | null) {
  return (
    _draft: Partial<PracticeConfiguration>,
    completedSteps: Set<WizardStepId>,
  ): boolean => {
    if (priorId === null) return true;
    return completedSteps.has(priorId);
  };
}

/** Build a placeholder step definition for slots not yet implemented. */
function placeholder(
  id: WizardStepId,
  title: string,
  priorId: WizardStepId | null,
  description?: string,
): WizardStepDefinition {
  return {
    id,
    title,
    description,
    // Placeholders never report "complete" on their own — the shell relies on
    // `canSkip` to let the user advance. Other agents will replace these with
    // real `isComplete` functions tied to the draft schema.
    isComplete: () => false,
    isReachable: priorComplete(priorId),
    canSkip: true,
    Component: PlaceholderStep,
  };
}

// ---------------------------------------------------------------------------
// 15 ordered steps. Step IDs and order are load-bearing — do not reorder.
// ---------------------------------------------------------------------------

export const WIZARD_STEPS: WizardStepDefinition[] = [
  // EMR-420 — owns this slot.
  placeholder(
    "org-and-practice",
    "Organization & practice",
    null,
    "Pick the organization and practice this configuration belongs to.",
  ),
  // EMR-421 — owns this slot.
  placeholder(
    "select-specialty",
    "Select specialty",
    "org-and-practice",
    "Choose the clinical specialty this practice serves.",
  ),
  // EMR-422 — owns this slot.
  placeholder(
    "select-care-model",
    "Select care model",
    "select-specialty",
    "Pick the care model that defines how this practice delivers care.",
  ),
  placeholder(
    "enable-modalities",
    "Enable modalities",
    "select-care-model",
    "Turn on the treatment modalities this practice offers.",
  ),
  placeholder(
    "disable-modalities",
    "Disable modalities",
    "enable-modalities",
    "Turn off any modalities not relevant to this practice.",
  ),
  placeholder(
    "apply-workflows",
    "Apply workflows",
    "disable-modalities",
    "Apply the workflow templates that match the selected care model.",
  ),
  placeholder(
    "apply-charting",
    "Apply charting",
    "apply-workflows",
    "Apply the charting templates and structured note formats.",
  ),
  placeholder(
    "apply-roles",
    "Apply roles",
    "apply-charting",
    "Apply role definitions and permission groups for this practice.",
  ),
  placeholder(
    "apply-patient-shell",
    "Apply patient shell",
    "apply-roles",
    "Apply the patient-facing shell — navigation, surfaces, and modules.",
  ),
  placeholder(
    "apply-physician-shell",
    "Apply physician shell",
    "apply-patient-shell",
    "Apply the physician-facing shell — chart layout and tools.",
  ),
  placeholder(
    "configure-migration",
    "Configure migration",
    "apply-physician-shell",
    "Decide how existing data will migrate into the new configuration.",
  ),
  placeholder(
    "preview-physician",
    "Preview physician",
    "configure-migration",
    "Walk through the physician experience with the new configuration.",
  ),
  placeholder(
    "preview-patient",
    "Preview patient",
    "preview-physician",
    "Walk through the patient experience with the new configuration.",
  ),
  placeholder(
    "preview-practice-admin",
    "Preview practice admin",
    "preview-patient",
    "Walk through the practice admin experience with the new configuration.",
  ),
  placeholder(
    "publish",
    "Publish",
    "preview-practice-admin",
    "Publish this configuration and make it active for the practice.",
  ),
];

/** Lookup helper. */
export function getStepById(
  id: WizardStepId,
): WizardStepDefinition | undefined {
  return WIZARD_STEPS.find((step) => step.id === id);
}

/** Index of a step in the canonical order, or `-1` if not found. */
export function getStepIndex(id: WizardStepId): number {
  return WIZARD_STEPS.findIndex((step) => step.id === id);
}

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length;
